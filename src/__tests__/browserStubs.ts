/**
 * The browser APIs jsdom does not implement, stubbed on request.
 *
 * These are **imported and called by the tests that need them**, never installed
 * in `setup.ts`. A global added there would hide the missing API from every
 * other test, and what jsdom lacks is usually the thing worth knowing: it has
 * decided this project's architecture three times over — a hand-written `Modal`
 * instead of `<dialog>`, the waveform maths pulled out into a pure function, and
 * the drag arithmetic pulled out of the gesture.
 *
 * Each returns the function that undoes it. Call that in `afterEach`.
 */

/** Restores a prototype property that may or may not have been an own one. */
function restoreProperty(prototype: object, name: string) {
  const original = Object.getOwnPropertyDescriptor(prototype, name);
  return () => {
    if (original) Object.defineProperty(prototype, name, original);
    // It was inherited — deleting the shadow reveals the original again.
    else delete (prototype as Record<string, unknown>)[name];
  };
}

/**
 * Gives every element a width, since jsdom reports every one of them as zero.
 *
 * `getBoundingClientRect()` returns zeros and `clientWidth` is `0`, so anything
 * converting pixels to time is unreachable in a test without this — including
 * `useCueDrag`, which refuses to start a gesture on a zero-width lane.
 *
 * Deliberately crude: one width for the whole document. The gesture reads only
 * the lane's `clientWidth`, and a per-element fake would be more machinery than
 * the thing it is faking.
 */
export function stubLayout(widthPx: number): () => void {
  const restoreWidth = restoreProperty(HTMLElement.prototype, "clientWidth");
  const restoreRect = restoreProperty(
    HTMLElement.prototype,
    "getBoundingClientRect",
  );

  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => widthPx,
  });
  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    writable: true,
    value: () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: widthPx,
      bottom: 0,
      width: widthPx,
      height: 0,
      toJSON: () => ({}),
    }),
  });

  return () => {
    restoreWidth();
    restoreRect();
  };
}

/**
 * A `ResizeObserver` that reports once, when it is asked to observe.
 *
 * Enough for `Timeline`, which uses one only to learn how wide its lane is so
 * the axis can pick an interval its labels fit into. Nothing in the tests
 * resizes anything afterwards.
 */
export function stubResizeObserver(): () => void {
  const scope = globalThis as unknown as Record<string, unknown>;
  const had = "ResizeObserver" in scope;
  const original = scope.ResizeObserver;

  scope.ResizeObserver = class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback(
        [{ target } as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      );
    }
    unobserve() {}
    disconnect() {}
  };

  return () => {
    if (had) scope.ResizeObserver = original;
    else delete scope.ResizeObserver;
  };
}

/**
 * Quiets jsdom's complaint about `getContext`, which it does not implement.
 *
 * `Waveform` already handles a null context by drawing nothing, so this changes
 * no behaviour — it only stops every test that renders a timeline printing
 * "Not implemented: HTMLCanvasElement's getContext()". What the canvas actually
 * draws is a browser check; the arithmetic behind it is `computePeaks`, which
 * is pure and covered.
 */
export function stubCanvas(): () => void {
  const restore = restoreProperty(HTMLCanvasElement.prototype, "getContext");
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    writable: true,
    value: () => null,
  });
  return restore;
}
