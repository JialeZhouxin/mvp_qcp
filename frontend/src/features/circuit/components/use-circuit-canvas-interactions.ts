import { useEffect, useMemo, useState } from "react";

import {
  addOperation,
  removeOperation,
  updateOperation,
} from "../model/circuit-model";
import { validateCircuitModel } from "../model/circuit-validation";
import type { CircuitModel, Operation } from "../model/types";
import {
  type LocalizedMessage,
  toCanvasMessage,
} from "../ui/message-catalog";
import {
  GateLabel,
  computeLayerCount,
  estimateGateBodyWidthPx,
  findConnectorOperationAtCell,
  findOperationAtCell,
  getConnectorSegment,
  toPendingPlacementMessage,
} from "./circuit-canvas-helpers";
import {
  advancePendingPlacement,
  buildSingleQubitOperation,
  createPendingPlacement,
  getParameterValues,
  isParameterizedGate,
  isSupportedGate,
  type PendingPlacement,
} from "./canvas-gate-utils";
import {
  validateParameterValue,
  type ParameterValidationResult,
} from "./parameter-validation";

const DEFAULT_MIN_LAYERS = 15;
const AUTO_EXPAND_THRESHOLD_LAYERS = 3;
const AUTO_EXPAND_BUFFER_LAYERS = 3;
const CELL_WIDTH_PADDING_PX = 10;
const MIN_CELL_WIDTH_PX = 40;

function computeLayerCellWidths(operations: readonly Operation[], layerCount: number): readonly number[] {
  const widths = Array.from({ length: layerCount }, () => MIN_CELL_WIDTH_PX);
  for (const operation of operations) {
    const candidate = Math.max(
      MIN_CELL_WIDTH_PX,
      estimateGateBodyWidthPx(operation) + CELL_WIDTH_PADDING_PX,
    );
    widths[operation.layer] = Math.max(widths[operation.layer] ?? MIN_CELL_WIDTH_PX, candidate);
  }
  return widths;
}

export interface UseCircuitCanvasInteractionsOptions {
  readonly circuit: CircuitModel;
  readonly onCircuitChange: (next: CircuitModel) => void;
  readonly minLayers?: number;
  readonly futureOperationIds?: ReadonlySet<string>;
}

export function useCircuitCanvasInteractions({
  circuit,
  onCircuitChange,
  minLayers = DEFAULT_MIN_LAYERS,
  futureOperationIds = new Set<string>(),
}: UseCircuitCanvasInteractionsOptions) {
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);
  const [interactionMessage, setInteractionMessage] =
    useState<LocalizedMessage | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [isGateDragging, setIsGateDragging] = useState(false);
  const [hoveredCellKey, setHoveredCellKey] = useState<string | null>(null);
  const [parameterDraft, setParameterDraft] = useState<readonly number[] | null>(null);
  const [parameterFeedback, setParameterFeedback] = useState<
    Readonly<Record<number, ParameterValidationResult>>
  >({});
  const baseLayerCount = useMemo(() => computeLayerCount(circuit, minLayers), [circuit, minLayers]);
  const [expandedLayerCount, setExpandedLayerCount] = useState(baseLayerCount);
  const layers = Math.max(baseLayerCount, expandedLayerCount);
  const qubits = useMemo(
    () => Array.from({ length: circuit.numQubits }, (_, index) => index),
    [circuit.numQubits],
  );
  const layerIndexes = useMemo(
    () => Array.from({ length: layers }, (_, index) => index),
    [layers],
  );
  const layerCellWidths = useMemo(
    () => computeLayerCellWidths(circuit.operations, layers),
    [circuit.operations, layers],
  );
  const selectedOperation = selectedOperationId
    ? circuit.operations.find((operation) => operation.id === selectedOperationId) ?? null
    : null;

  useEffect(() => {
    setExpandedLayerCount((current) => Math.max(current, baseLayerCount));
  }, [baseLayerCount]);

  useEffect(() => {
    if (!selectedOperationId) {
      return;
    }
    const exists = circuit.operations.some(
      (operation) => operation.id === selectedOperationId,
    );
    if (!exists) {
      setSelectedOperationId(null);
    }
  }, [circuit.operations, selectedOperationId]);

  useEffect(() => {
    if (!selectedOperation || !isParameterizedGate(selectedOperation.gate)) {
      setParameterDraft(null);
      setParameterFeedback({});
      return;
    }
    setParameterDraft(getParameterValues(selectedOperation));
    setParameterFeedback({});
  }, [selectedOperation]);

  const clearDragPreview = () => {
    setIsGateDragging(false);
    setHoveredCellKey(null);
  };

  useEffect(() => {
    window.addEventListener("dragend", clearDragPreview);
    window.addEventListener("drop", clearDragPreview);
    return () => {
      window.removeEventListener("dragend", clearDragPreview);
      window.removeEventListener("drop", clearDragPreview);
    };
  }, []);

  const commitCircuit = (next: CircuitModel): boolean => {
    const validation = validateCircuitModel(next);
    if (!validation.ok) {
      setInteractionMessage(
        toCanvasMessage("VALIDATION_ERROR", { reason: validation.error.message }),
      );
      return false;
    }
    setInteractionMessage(null);
    onCircuitChange(next);
    return true;
  };

  const setOccupiedMessage = (qubit: number, layer: number) => {
    setInteractionMessage(toCanvasMessage("CELL_OCCUPIED", { qubit, layer }));
  };

  const toCellKey = (qubit: number, layer: number) => `${qubit}-${layer}`;

  const isConnectorSpanBlockedCell = (qubit: number, layer: number): boolean => {
    const operation = findOperationAtCell(circuit.operations, qubit, layer);
    const connectorOperation = findConnectorOperationAtCell(circuit.operations, qubit, layer);
    if (!connectorOperation) {
      return false;
    }
    if (!operation) {
      return true;
    }
    return operation.id !== connectorOperation.id;
  };

  const showGateDragPreview = (qubit: number, layer: number) => {
    setIsGateDragging(true);
    setHoveredCellKey(toCellKey(qubit, layer));
    const remainingLayers = layers - 1 - layer;
    if (remainingLayers <= AUTO_EXPAND_THRESHOLD_LAYERS) {
      const requiredLayers = layer + 1 + AUTO_EXPAND_BUFFER_LAYERS;
      setExpandedLayerCount((current) => Math.max(current, requiredLayers));
    }
  };

  const clearHoveredCell = (qubit: number, layer: number) => {
    const key = toCellKey(qubit, layer);
    setHoveredCellKey((current) => (current === key ? null : current));
  };

  const onDropGate = (rawGate: string, qubit: number, layer: number) => {
    clearDragPreview();
    if (!isSupportedGate(rawGate)) {
      return;
    }
    if (findOperationAtCell(circuit.operations, qubit, layer)) {
      setOccupiedMessage(qubit, layer);
      return;
    }
    if (isConnectorSpanBlockedCell(qubit, layer)) {
      setOccupiedMessage(qubit, layer);
      return;
    }

    const pending = createPendingPlacement(rawGate, qubit, layer);
    if (pending) {
      setPendingPlacement(pending);
      setSelectedOperationId(null);
      if (pending.requiredQubits === 2) {
        setInteractionMessage(
          toCanvasMessage("PENDING_TWO_QUBIT", {
            gate: rawGate,
            sourceQubit: qubit,
            layer,
          }),
        );
      } else {
        setInteractionMessage(toPendingPlacementMessage(pending));
      }
      return;
    }

    setPendingPlacement(null);
    const next = addOperation(circuit, buildSingleQubitOperation(rawGate, qubit, layer));
    commitCircuit(next);
  };

  const onDelete = (operationId: string) => {
    const next = removeOperation(circuit, operationId);
    const committed = commitCircuit(next);
    if (committed && selectedOperationId === operationId) {
      setSelectedOperationId(null);
    }
  };

  const onCellClick = (qubit: number, layer: number) => {
    if (!pendingPlacement) {
      const operation = findOperationAtCell(circuit.operations, qubit, layer);
      setSelectedOperationId(operation?.id ?? null);
      return;
    }
    if (layer !== pendingPlacement.layer) {
      setInteractionMessage(toCanvasMessage("LAYER_MISMATCH"));
      return;
    }
    if (findOperationAtCell(circuit.operations, qubit, layer)) {
      setOccupiedMessage(qubit, layer);
      return;
    }
    if (isConnectorSpanBlockedCell(qubit, layer)) {
      setOccupiedMessage(qubit, layer);
      return;
    }

    const advanced = advancePendingPlacement(pendingPlacement, qubit);
    if (advanced.kind === "error") {
      setInteractionMessage(toCanvasMessage(advanced.code));
      return;
    }
    if (advanced.kind === "continue") {
      setPendingPlacement(advanced.pending);
      setInteractionMessage(toPendingPlacementMessage(advanced.pending));
      return;
    }

    const next = addOperation(circuit, advanced.operation);
    if (commitCircuit(next)) {
      setPendingPlacement(null);
      setInteractionMessage(null);
    }
  };

  const updateParameterFeedback = (index: number, result: ParameterValidationResult) => {
    setParameterFeedback((previous) => ({
      ...previous,
      [index]: result,
    }));
  };

  const onParamChange = (index: number, value: number) => {
    if (!selectedOperation || !isParameterizedGate(selectedOperation.gate)) {
      return;
    }
    if (!parameterDraft || index < 0 || index >= parameterDraft.length) {
      return;
    }

    const result = validateParameterValue(value);
    updateParameterFeedback(index, result);

    if (result.level === "error") {
      setInteractionMessage(toCanvasMessage("INVALID_PARAM"));
      return;
    }

    const nextParams = [...parameterDraft];
    nextParams[index] = value;
    setParameterDraft(nextParams);
    const next = updateOperation(circuit, selectedOperation.id, { params: nextParams });
    commitCircuit(next);
  };

  const onNormalizeParam = (index: number) => {
    const current = parameterFeedback[index];
    if (!current || current.level !== "warning" || current.normalizedValue === null) {
      return;
    }
    onParamChange(index, current.normalizedValue);
  };

  const activeParameterValues =
    selectedOperation && isParameterizedGate(selectedOperation.gate)
      ? parameterDraft ?? getParameterValues(selectedOperation)
      : [];

  const cancelPendingPlacement = () => {
    setPendingPlacement(null);
    setInteractionMessage(null);
  };

  const getCellClassName = (
    operation: Operation | undefined,
    qubit: number,
    layer: number,
  ) => {
    const connectorOperation = findConnectorOperationAtCell(circuit.operations, qubit, layer);
    const connectorSegment =
      connectorOperation &&
      (!operation || operation.id === connectorOperation.id)
        ? getConnectorSegment(connectorOperation, qubit)
        : null;
    const key = toCellKey(qubit, layer);
    const isSelected = selectedOperationId !== null && operation?.id === selectedOperationId;
    const isConnectorSelected =
      selectedOperationId !== null && connectorOperation?.id === selectedOperationId;
    const previewOperationId = operation?.id ?? connectorOperation?.id ?? null;
    const isPreviewFuture =
      previewOperationId !== null && futureOperationIds.has(previewOperationId);
    const isHovered = hoveredCellKey === key;
    const isConnectorSpanBlocked = !operation && connectorOperation !== undefined;
    const classNames = ["canvas-cell"];

    if (operation) {
      classNames.push("canvas-cell--occupied");
      if (isSelected) {
        classNames.push("canvas-cell--selected");
      } else if (isGateDragging) {
        classNames.push("canvas-cell--blocked");
      }
    } else {
      classNames.push("canvas-cell--empty");
      if (pendingPlacement && pendingPlacement.layer === layer) {
        classNames.push("canvas-cell--pending-layer");
      }
      if (isGateDragging) {
        if (isConnectorSpanBlocked) {
          classNames.push("canvas-cell--drop-disabled");
        } else {
          classNames.push("canvas-cell--drop-target");
          if (isHovered) {
            classNames.push("canvas-cell--drop-hover");
          }
        }
      }
    }

    if (connectorSegment) {
      classNames.push("canvas-cell--connector", `canvas-cell--connector-${connectorSegment}`);
      if (isConnectorSelected) {
        classNames.push("canvas-cell--connector-selected");
      }
    }
    if (isPreviewFuture) {
      classNames.push("canvas-cell--preview-future");
    }

    return classNames.join(" ");
  };

  return {
    pendingPlacement,
    interactionMessage,
    selectedOperationId,
    selectedOperation,
    parameterFeedback,
    activeParameterValues,
    qubits,
    layerIndexes,
    layerCellWidths,
    showGateDragPreview,
    clearHoveredCell,
    clearDragPreview,
    onDropGate,
    onCellClick,
    onDelete,
    onParamChange,
    onNormalizeParam,
    cancelPendingPlacement,
    getCellClassName,
  };
}
