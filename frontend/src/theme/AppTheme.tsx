import { createContext, useContext, type PropsWithChildren } from "react";

import "./theme.css";
import { getTasksThemePalette, type TasksThemePalette, type ThemeMode } from "./theme-palette";

interface TasksThemeValue {
  readonly mode: ThemeMode;
  readonly palette: TasksThemePalette;
}

const DEFAULT_THEME_MODE: ThemeMode = "light";
const DEFAULT_THEME_VALUE: TasksThemeValue = {
  mode: DEFAULT_THEME_MODE,
  palette: getTasksThemePalette(DEFAULT_THEME_MODE),
};

const TasksThemeContext = createContext<TasksThemeValue>(DEFAULT_THEME_VALUE);

interface TasksThemeProviderProps extends PropsWithChildren {
  readonly mode?: ThemeMode;
}

export function TasksThemeProvider({
  children,
  mode = DEFAULT_THEME_MODE,
}: TasksThemeProviderProps) {
  return (
    <TasksThemeContext.Provider
      value={{
        mode,
        palette: getTasksThemePalette(mode),
      }}
    >
      {children}
    </TasksThemeContext.Provider>
  );
}

export function useTasksTheme(): TasksThemeValue {
  return useContext(TasksThemeContext);
}

export type { ThemeMode };
