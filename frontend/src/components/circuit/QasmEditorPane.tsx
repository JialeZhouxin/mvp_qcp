import Editor from "@monaco-editor/react";
import { useEffect, useRef } from "react";

import type { CircuitModel } from "../../features/circuit/model/types";
import type { QasmParseError } from "../../features/circuit/qasm/qasm-errors";
import { fromQasm3, toQasm3 } from "../../features/circuit/qasm/qasm-bridge";
import {
  buildQasmErrorMarkers,
  QASM_LANGUAGE_ID,
  QASM_MARKER_OWNER,
  registerQasmLanguage,
} from "../../features/circuit/qasm/qasm-monaco";

const DEFAULT_DEBOUNCE_MS = 200;
const QASM_EDITOR_HEIGHT = 280;
const MONACO_ERROR_SEVERITY_FALLBACK = 8;

type MonacoApi = typeof import("monaco-editor");
type MonacoCodeEditor = import("monaco-editor").editor.IStandaloneCodeEditor;
type MonacoModel = import("monaco-editor").editor.ITextModel;

interface QasmEditorPaneProps {
  readonly value: string;
  readonly onValueChange: (next: string) => void;
  readonly onValidQasmChange: (nextModel: CircuitModel) => void;
  readonly onParseError: (error: QasmParseError | null) => void;
  readonly debounceMs?: number;
}

function QasmEditorPane({
  value,
  onValueChange,
  onValidQasmChange,
  onParseError,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: QasmEditorPaneProps) {
  const onValidQasmChangeRef = useRef(onValidQasmChange);
  const onParseErrorRef = useRef(onParseError);
  const lastSyncedSignatureRef = useRef<string | null>(null);
  const latestParseErrorRef = useRef<QasmParseError | null>(null);
  const monacoRef = useRef<MonacoApi | null>(null);
  const modelRef = useRef<MonacoModel | null>(null);

  useEffect(() => {
    onValidQasmChangeRef.current = onValidQasmChange;
  }, [onValidQasmChange]);

  useEffect(() => {
    onParseErrorRef.current = onParseError;
  }, [onParseError]);

  const applyErrorMarkers = (error: QasmParseError | null) => {
    latestParseErrorRef.current = error;
    const monaco = monacoRef.current;
    const model = modelRef.current;
    if (!monaco || !model) {
      return;
    }
    const markerSeverity = monaco.MarkerSeverity?.Error ?? MONACO_ERROR_SEVERITY_FALLBACK;
    monaco.editor.setModelMarkers(
      model,
      QASM_MARKER_OWNER,
      buildQasmErrorMarkers(error, markerSeverity),
    );
  };

  const onEditorMount = (editor: MonacoCodeEditor, monaco: MonacoApi) => {
    registerQasmLanguage(monaco);
    monacoRef.current = monaco;
    modelRef.current = editor.getModel();
    applyErrorMarkers(latestParseErrorRef.current);
  };

  useEffect(
    () => () => {
      const monaco = monacoRef.current;
      const model = modelRef.current;
      if (!monaco || !model) {
        return;
      }
      monaco.editor.setModelMarkers(model, QASM_MARKER_OWNER, []);
    },
    [],
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const parsed = fromQasm3(value);
      if (parsed.ok) {
        onParseErrorRef.current(null);
        applyErrorMarkers(null);
        const signature = toQasm3(parsed.model).trim();
        if (lastSyncedSignatureRef.current === signature) {
          return;
        }
        lastSyncedSignatureRef.current = signature;
        onValidQasmChangeRef.current(parsed.model);
        return;
      }
      onParseErrorRef.current(parsed.error);
      applyErrorMarkers(parsed.error);
    }, debounceMs);

    return () => window.clearTimeout(timerId);
  }, [value, debounceMs]);

  return (
    <section
      data-testid="qasm-editor-panel"
      style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}
    >
      <h3 style={{ marginTop: 0 }}>OpenQASM 3</h3>
      <div
        data-testid="qasm-editor-input"
        style={{ border: "1px solid #d9d9d9", borderRadius: 6, overflow: "hidden" }}
      >
        <Editor
          height={`${QASM_EDITOR_HEIGHT}px`}
          language={QASM_LANGUAGE_ID}
          path="workbench-qasm.openqasm"
          value={value}
          theme="vs"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            quickSuggestions: true,
          }}
          onMount={onEditorMount}
          onChange={(next) => onValueChange(next ?? "")}
        />
      </div>
    </section>
  );
}

export default QasmEditorPane;
