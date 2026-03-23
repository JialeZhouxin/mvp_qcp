const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable='true'], [contenteditable='']";
const ZOOM_IN_KEYS = new Set(["=", "+", "Add"]);
const ZOOM_OUT_KEYS = new Set(["-", "_", "Subtract"]);

function hasPrimaryModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey;
}

export function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  return target.matches(EDITABLE_SELECTOR) || target.closest(EDITABLE_SELECTOR) !== null;
}

export function isUndoShortcut(event: KeyboardEvent): boolean {
  return (
    hasPrimaryModifier(event) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "z"
  );
}

export function isRedoShortcut(event: KeyboardEvent): boolean {
  if (!hasPrimaryModifier(event) || event.altKey) {
    return false;
  }
  const lowerKey = event.key.toLowerCase();
  if (lowerKey === "y" && !event.shiftKey) {
    return true;
  }
  return lowerKey === "z" && event.shiftKey;
}

export function isDeleteShortcut(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return false;
  }
  return event.key === "Delete" || event.key === "Backspace";
}

export function isZoomInShortcut(event: KeyboardEvent): boolean {
  if (!hasPrimaryModifier(event) || event.altKey) {
    return false;
  }
  return ZOOM_IN_KEYS.has(event.key) || event.code === "NumpadAdd";
}

export function isZoomOutShortcut(event: KeyboardEvent): boolean {
  if (!hasPrimaryModifier(event) || event.altKey) {
    return false;
  }
  return ZOOM_OUT_KEYS.has(event.key) || event.code === "NumpadSubtract";
}

export function isZoomResetShortcut(event: KeyboardEvent): boolean {
  if (!hasPrimaryModifier(event) || event.altKey) {
    return false;
  }
  return event.key === "0" || event.code === "Numpad0";
}

