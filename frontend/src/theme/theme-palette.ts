export type ThemeMode = "light" | "dark";

export interface TasksThemePalette {
  readonly surfacePage: string;
  readonly surfacePanel: string;
  readonly surfacePanelMuted: string;
  readonly surfacePanelElevated: string;
  readonly borderSubtle: string;
  readonly borderStrong: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly accentPrimary: string;
  readonly accentInfo: string;
  readonly accentDanger: string;
  readonly accentSuccess: string;
  readonly focusRing: string;
  readonly editorBackground: string;
  readonly editorLineHighlight: string;
  readonly chartAxis: string;
  readonly chartGrid: string;
  readonly blochSceneBackground: string;
  readonly blochLabelBackground: string;
  readonly blochLabelBorder: string;
  readonly blochLabelText: string;
  readonly blochWireframe: string;
  readonly blochAxis: string;
  readonly blochRing: string;
}

export const TASKS_THEME_PALETTES: Readonly<Record<ThemeMode, TasksThemePalette>> = {
  light: {
    surfacePage: "#f5f7fb",
    surfacePanel: "#ffffff",
    surfacePanelMuted: "#f8fbff",
    surfacePanelElevated: "#ffffff",
    borderSubtle: "#d9e2ec",
    borderStrong: "#bcccdc",
    textPrimary: "#102a43",
    textSecondary: "#486581",
    textMuted: "#7b8794",
    accentPrimary: "#0b5fff",
    accentInfo: "#0ea5e9",
    accentDanger: "#cf1322",
    accentSuccess: "#2f855a",
    focusRing: "rgba(11, 95, 255, 0.35)",
    editorBackground: "#ffffff",
    editorLineHighlight: "#eef4ff",
    chartAxis: "#4b5563",
    chartGrid: "rgba(148, 163, 184, 0.24)",
    blochSceneBackground: "#f4f8fc",
    blochLabelBackground: "rgba(255, 255, 255, 0.94)",
    blochLabelBorder: "rgba(148, 163, 184, 0.45)",
    blochLabelText: "#102a43",
    blochWireframe: "#94a3b8",
    blochAxis: "#475569",
    blochRing: "#64748b",
  },
  dark: {
    surfacePage: "#0f172a",
    surfacePanel: "#111b2f",
    surfacePanelMuted: "#152238",
    surfacePanelElevated: "#1a2940",
    borderSubtle: "#24364d",
    borderStrong: "#385170",
    textPrimary: "#e2e8f0",
    textSecondary: "#cbd5e1",
    textMuted: "#94a3b8",
    accentPrimary: "#60a5fa",
    accentInfo: "#38bdf8",
    accentDanger: "#f87171",
    accentSuccess: "#4ade80",
    focusRing: "rgba(96, 165, 250, 0.45)",
    editorBackground: "#0f172a",
    editorLineHighlight: "#162238",
    chartAxis: "#cbd5e1",
    chartGrid: "rgba(148, 163, 184, 0.2)",
    blochSceneBackground: "#07111f",
    blochLabelBackground: "rgba(8, 15, 28, 0.88)",
    blochLabelBorder: "rgba(148, 163, 184, 0.45)",
    blochLabelText: "#e2e8f0",
    blochWireframe: "#d1d5db",
    blochAxis: "#cbd5e1",
    blochRing: "#94a3b8",
  },
};

export function getTasksThemePalette(mode: ThemeMode): TasksThemePalette {
  return TASKS_THEME_PALETTES[mode];
}
