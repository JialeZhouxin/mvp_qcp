import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (next: string) => void;
}

function CodeEditor({ value, onChange }: CodeEditorProps) {
  return (
    <Editor
      height="420px"
      defaultLanguage="python"
      value={value}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: "on",
        automaticLayout: true,
      }}
      onChange={(next) => onChange(next ?? "")}
    />
  );
}

export default CodeEditor;
