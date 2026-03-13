const GUIDE_DISMISSED_KEY = "qcp.workbench.guide.dismissed.v1";

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function isWorkbenchGuideDismissed(): boolean {
  if (!hasWindow()) {
    return false;
  }
  try {
    return window.localStorage.getItem(GUIDE_DISMISSED_KEY) === "1";
  } catch (error) {
    console.error("failed to read guide preference", error);
    return false;
  }
}

export function setWorkbenchGuideDismissed(dismissed: boolean): void {
  if (!hasWindow()) {
    return;
  }
  try {
    if (!dismissed) {
      window.localStorage.removeItem(GUIDE_DISMISSED_KEY);
      return;
    }
    window.localStorage.setItem(GUIDE_DISMISSED_KEY, "1");
  } catch (error) {
    console.error("failed to write guide preference", error);
  }
}
