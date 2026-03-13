export interface EditorHistoryState<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
}

interface HistoryOptions<T> {
  readonly equals?: (left: T, right: T) => boolean;
  readonly limit?: number;
}

const DEFAULT_HISTORY_LIMIT = 100;

function defaultEquals<T>(left: T, right: T): boolean {
  return Object.is(left, right);
}

function clampPast<T>(past: readonly T[], limit: number): readonly T[] {
  if (past.length <= limit) {
    return past;
  }
  return past.slice(past.length - limit);
}

export function createHistoryState<T>(initial: T): EditorHistoryState<T> {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

export function canUndoHistory<T>(state: EditorHistoryState<T>): boolean {
  return state.past.length > 0;
}

export function canRedoHistory<T>(state: EditorHistoryState<T>): boolean {
  return state.future.length > 0;
}

export function pushHistoryState<T>(
  state: EditorHistoryState<T>,
  next: T,
  options: HistoryOptions<T> = {},
): EditorHistoryState<T> {
  const equals = options.equals ?? defaultEquals<T>;
  if (equals(state.present, next)) {
    return state;
  }
  const limit = options.limit ?? DEFAULT_HISTORY_LIMIT;
  const past = clampPast([...state.past, state.present], limit);
  return {
    past,
    present: next,
    future: [],
  };
}

export function undoHistoryState<T>(
  state: EditorHistoryState<T>,
): EditorHistoryState<T> {
  if (!canUndoHistory(state)) {
    return state;
  }
  const previous = state.past[state.past.length - 1];
  const past = state.past.slice(0, state.past.length - 1);
  return {
    past,
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function redoHistoryState<T>(
  state: EditorHistoryState<T>,
): EditorHistoryState<T> {
  if (!canRedoHistory(state)) {
    return state;
  }
  const next = state.future[0];
  const future = state.future.slice(1);
  return {
    past: [...state.past, state.present],
    present: next,
    future,
  };
}
