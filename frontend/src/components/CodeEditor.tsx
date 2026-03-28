import Editor from "@monaco-editor/react";

import { useTasksTheme } from "../theme/AppTheme";
import { ensureTasksMonacoThemes, resolveTasksMonacoTheme } from "../theme/editor-theme";

interface CodeEditorProps {
  value: string;
  onChange: (next: string) => void;
}

function CodeEditor({ value, onChange }: CodeEditorProps) {
  const { mode } = useTasksTheme();

  return (
    <Editor
      height="420px"
      defaultLanguage="python"
      value={value}
      theme={resolveTasksMonacoTheme(mode)}
      beforeMount={ensureTasksMonacoThemes}
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
