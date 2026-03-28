import type { ThemeMode } from "./theme-palette";
import { getTasksThemePalette } from "./theme-palette";

type MonacoApi = typeof import("monaco-editor");

const LIGHT_THEME_NAME = "qcp-tasks-light";
const DARK_THEME_NAME = "qcp-tasks-dark";

function defineTasksTheme(monaco: MonacoApi, mode: ThemeMode) {
  const palette = getTasksThemePalette(mode);
  const name = mode === "light" ? LIGHT_THEME_NAME : DARK_THEME_NAME;
  const base = mode === "light" ? "vs" : "vs-dark";

  monaco.editor.defineTheme(name, {
    base,
    inherit: true,
    rules: [],
    colors: {
      "editor.background": palette.editorBackground,
      "editorLineNumber.foreground": palette.textMuted,
      "editorLineNumber.activeForeground": palette.textSecondary,
      "editor.lineHighlightBackground": palette.editorLineHighlight,
      "editor.selectionBackground":
        mode === "light" ? "rgba(11, 95, 255, 0.12)" : "rgba(96, 165, 250, 0.18)",
      "editor.inactiveSelectionBackground":
        mode === "light" ? "rgba(11, 95, 255, 0.08)" : "rgba(96, 165, 250, 0.12)",
    },
  });
}

export function ensureTasksMonacoThemes(monaco: MonacoApi) {
  defineTasksTheme(monaco, "light");
  defineTasksTheme(monaco, "dark");
}

export function resolveTasksMonacoTheme(mode: ThemeMode): string {
  return mode === "light" ? LIGHT_THEME_NAME : DARK_THEME_NAME;
}
