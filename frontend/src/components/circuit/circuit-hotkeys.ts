const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable='true'], [contenteditable='']";

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
