export const GATE_DRAG_MIME = "application/x-qcp-gate";
export const MOVE_OPERATION_DRAG_MIME = "application/x-qcp-op-move";

export interface OperationMoveDragPayload {
  readonly operationId: string;
  readonly anchorQubit: number;
  readonly sourceLayer: number;
}

export function encodeOperationMoveDragPayload(payload: OperationMoveDragPayload): string {
  return JSON.stringify(payload);
}

export function decodeOperationMoveDragPayload(raw: string): OperationMoveDragPayload | null {
  try {
    const value = JSON.parse(raw) as Partial<OperationMoveDragPayload>;
    if (typeof value.operationId !== "string" || value.operationId.length === 0) {
      return null;
    }
    if (!Number.isInteger(value.anchorQubit) || !Number.isInteger(value.sourceLayer)) {
      return null;
    }
    return {
      operationId: value.operationId,
      anchorQubit: value.anchorQubit,
      sourceLayer: value.sourceLayer,
    };
  } catch {
    return null;
  }
}
