import type {
  CSSProperties,
  PointerEventHandler,
  RefObject,
  WheelEventHandler,
} from "react";

import CircuitCanvasGrid, { type CircuitCanvasGridProps } from "./CircuitCanvasGrid";

interface CircuitCanvasViewportProps extends CircuitCanvasGridProps {
  readonly viewportRef: RefObject<HTMLDivElement>;
  readonly viewportClassName: string;
  readonly viewportContentStyle: CSSProperties;
  readonly onViewportWheel: WheelEventHandler<HTMLDivElement>;
  readonly onViewportPointerDown: PointerEventHandler<HTMLDivElement>;
  readonly onViewportPointerMove: PointerEventHandler<HTMLDivElement>;
  readonly onViewportPointerUp: PointerEventHandler<HTMLDivElement>;
  readonly onViewportPointerCancel: PointerEventHandler<HTMLDivElement>;
}

function CircuitCanvasViewport({
  viewportRef,
  viewportClassName,
  viewportContentStyle,
  onViewportWheel,
  onViewportPointerDown,
  onViewportPointerMove,
  onViewportPointerUp,
  onViewportPointerCancel,
  ...gridProps
}: CircuitCanvasViewportProps) {
  return (
    <div data-testid="canvas-viewport-shell">
      <div
        ref={viewportRef}
        className={viewportClassName}
        onWheel={onViewportWheel}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onPointerCancel={onViewportPointerCancel}
        data-testid="canvas-viewport"
      >
        <div style={viewportContentStyle}>
          <CircuitCanvasGrid {...gridProps} />
        </div>
      </div>
    </div>
  );
}

export default CircuitCanvasViewport;
