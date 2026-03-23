import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type RefObject,
  type WheelEvent,
} from "react";

import {
  isEditableEventTarget,
  isZoomInShortcut,
  isZoomOutShortcut,
  isZoomResetShortcut,
} from "./circuit-hotkeys";

const MIN_SCALE = 0.5;
const MAX_SCALE = 2;
const SCALE_STEP = 0.1;
const DEFAULT_SCALE = 1;

interface ZoomAnchor {
  readonly x: number;
  readonly y: number;
}

interface PanSession {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly startScrollLeft: number;
  readonly startScrollTop: number;
}

interface UseCircuitCanvasViewportResult {
  readonly scale: number;
  readonly zoomPercentText: string;
  readonly canZoomIn: boolean;
  readonly canZoomOut: boolean;
  readonly isPanReady: boolean;
  readonly isPanning: boolean;
  readonly viewportRef: RefObject<HTMLDivElement>;
  readonly viewportContentStyle: CSSProperties;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onZoomReset: () => void;
  readonly onViewportWheel: (event: WheelEvent<HTMLDivElement>) => void;
  readonly onViewportPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onViewportPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onViewportPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onViewportPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
}

function clampScale(nextScale: number): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
}

export function useCircuitCanvasViewport(): UseCircuitCanvasViewportResult {
  const viewportRef = useRef<HTMLDivElement>(null);
  const panSessionRef = useRef<PanSession | null>(null);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [isPanReady, setIsPanReady] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const finishPanSession = useCallback(() => {
    const session = panSessionRef.current;
    if (!session) {
      return;
    }
    const viewport = viewportRef.current;
    const hasPointerCapture =
      viewport &&
      typeof viewport.hasPointerCapture === "function" &&
      viewport.hasPointerCapture(session.pointerId);
    if (hasPointerCapture && typeof viewport.releasePointerCapture === "function") {
      viewport.releasePointerCapture(session.pointerId);
    }
    panSessionRef.current = null;
    setIsPanning(false);
  }, []);

  const updateScale = useCallback(
    (nextScale: number, anchor?: ZoomAnchor) => {
      const viewport = viewportRef.current;
      const clamped = clampScale(nextScale);
      if (!viewport || clamped === scale) {
        setScale(clamped);
        return;
      }

      const rect = viewport.getBoundingClientRect();
      const fallbackAnchor = {
        x: rect.left + viewport.clientWidth / 2,
        y: rect.top + viewport.clientHeight / 2,
      };
      const resolvedAnchor = anchor ?? fallbackAnchor;
      const localX = resolvedAnchor.x - rect.left;
      const localY = resolvedAnchor.y - rect.top;
      const contentX = (viewport.scrollLeft + localX) / scale;
      const contentY = (viewport.scrollTop + localY) / scale;

      setScale(clamped);
      window.requestAnimationFrame(() => {
        viewport.scrollLeft = contentX * clamped - localX;
        viewport.scrollTop = contentY * clamped - localY;
      });
    },
    [scale],
  );

  const onZoomIn = useCallback(() => {
    updateScale(scale + SCALE_STEP);
  }, [scale, updateScale]);

  const onZoomOut = useCallback(() => {
    updateScale(scale - SCALE_STEP);
  }, [scale, updateScale]);

  const onZoomReset = useCallback(() => {
    updateScale(DEFAULT_SCALE);
  }, [updateScale]);

  const onViewportWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      event.preventDefault();
      const step = event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP;
      updateScale(scale + step, { x: event.clientX, y: event.clientY });
    },
    [scale, updateScale],
  );

  const onViewportPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!isPanReady || event.button !== 0) {
        return;
      }
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }
      panSessionRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: viewport.scrollLeft,
        startScrollTop: viewport.scrollTop,
      };
      setIsPanning(true);
      if (typeof viewport.setPointerCapture === "function") {
        viewport.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
    },
    [isPanReady],
  );

  const onViewportPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    const viewport = viewportRef.current;
    if (!session || !viewport || session.pointerId !== event.pointerId) {
      return;
    }
    viewport.scrollLeft = session.startScrollLeft - (event.clientX - session.startX);
    viewport.scrollTop = session.startScrollTop - (event.clientY - session.startY);
    event.preventDefault();
  }, []);

  const onViewportPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const session = panSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }
      finishPanSession();
    },
    [finishPanSession],
  );

  const onViewportPointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const session = panSessionRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }
      finishPanSession();
    },
    [finishPanSession],
  );

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (isEditableEventTarget(event.target)) {
        return;
      }
      if (event.code === "Space" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setIsPanReady(true);
        return;
      }
      if (isZoomInShortcut(event)) {
        event.preventDefault();
        onZoomIn();
        return;
      }
      if (isZoomOutShortcut(event)) {
        event.preventDefault();
        onZoomOut();
        return;
      }
      if (isZoomResetShortcut(event)) {
        event.preventDefault();
        onZoomReset();
      }
    };

    const onWindowKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }
      setIsPanReady(false);
      finishPanSession();
    };

    const onWindowBlur = () => {
      setIsPanReady(false);
      finishPanSession();
    };

    window.addEventListener("keydown", onWindowKeyDown);
    window.addEventListener("keyup", onWindowKeyUp);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
      window.removeEventListener("keyup", onWindowKeyUp);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [finishPanSession, onZoomIn, onZoomOut, onZoomReset]);

  const viewportContentStyle = useMemo(
    () => ({ "--canvas-scale": scale } as CSSProperties),
    [scale],
  );

  return {
    scale,
    zoomPercentText: `${Math.round(scale * 100)}%`,
    canZoomIn: scale < MAX_SCALE,
    canZoomOut: scale > MIN_SCALE,
    isPanReady,
    isPanning,
    viewportRef,
    viewportContentStyle,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onViewportWheel,
    onViewportPointerDown,
    onViewportPointerMove,
    onViewportPointerUp,
    onViewportPointerCancel,
  };
}

