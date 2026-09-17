import { useEffect, useRef } from "react";

/**
 * Calls `onFrame` on every animation frame while `active`.
 *
 * This is how the playhead and the transport readout are updated: the callback
 * writes to the DOM through refs instead of setting state. Sixty re-renders a
 * second of a component that already re-renders every row on hover would be
 * the wrong trade entirely — and the rendering cost of a hover is an open
 * roadmap item, not something to multiply by sixty.
 *
 * The caller keeps it active while a file is attached rather than only while
 * it is playing, so a seek — from the keyboard or by clicking the axis — lands
 * on screen with no extra wiring. A frame that reads one number and writes one
 * transform costs nothing, and the browser stops calling it outright when the
 * tab is not being painted.
 */
export function useAnimationFrame(active: boolean, onFrame: () => void) {
  // Kept in a ref so a new closure each render does not restart the loop.
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    if (!active) return;

    let frame = requestAnimationFrame(function tick() {
      onFrameRef.current();
      frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [active]);
}
