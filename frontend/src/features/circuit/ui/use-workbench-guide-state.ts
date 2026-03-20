import { useState } from "react";

import { isWorkbenchGuideDismissed, setWorkbenchGuideDismissed } from "./guide-preference";

export function useWorkbenchGuideState() {
  const [showGuide, setShowGuide] = useState(() => !isWorkbenchGuideDismissed());

  const dismissGuide = () => {
    setShowGuide(false);
    setWorkbenchGuideDismissed(true);
  };

  return {
    showGuide,
    dismissGuide,
  };
}
