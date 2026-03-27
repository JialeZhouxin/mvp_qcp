import "@testing-library/jest-dom/vitest";

const canvasContextStub = new Proxy(
  {},
  {
    get: (_target, property: string | symbol) => {
      if (property === "measureText") {
        return () => ({ width: 0 });
      }
      return () => {};
    },
    set: () => true,
  },
) as unknown as CanvasRenderingContext2D;

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: () => canvasContextStub,
});

class ResizeObserverStub {
  observe() {}

  unobserve() {}

  disconnect() {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  value: ResizeObserverStub,
  writable: true,
});
