import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Cue } from "../types";
import { dragCue } from "../utils/dragCue";
import type { CueTimes, DragMode } from "../utils/dragCue";
import { timeToPercent } from "../utils/timeline";

/** How far the pointer must travel before this is a drag and not a click. */
const DRAG_THRESHOLD_PX = 3;

/** How close an edge has to come to a snap target, in pixels. */
const SNAP_PX = 8;

interface Gesture {
  cue: Cue;
  mode: DragMode;
  durationSeconds: number;
  startClientX: number;
  laneWidthPx: number;
  /** Every row this cue appears on. A multi-track cue moves on all of them. */
  elements: HTMLElement[];
  snapTargets: number[];
  moved: boolean;
  latest: CueTimes;
  abort: AbortController;
}

interface Options {
  durationSeconds: number;
  /** Read once, when the gesture starts. Given the cue being dragged, so it
   * can be left out of its own snap targets. */
  getSnapTargets: (draggedCueId: string) => number[];
  /** Dispatched once, at the end of the gesture. */
  onCommit: (cue: Cue) => void;
}

/**
 * Dragging and resizing a cue directly on the timeline.
 *
 * Two constraints shape all of it.
 *
 * **One gesture is one undo entry.** `pointermove` fires around sixty times a
 * second and `projectReducer` pushes a snapshot on every `SAVE_CUE`, capped at
 * fifty. Dispatching per move would erase the entire undo history in a single
 * drag. So the gesture lives here, and exactly one `SAVE_CUE` leaves at the
 * end — none at all if the cue did not actually move.
 *
 * **The preview never goes through React.** `left` and `width` are written
 * straight onto the blocks, as the playhead's transform is: hovering one cue
 * already re-renders every row, and a drag would do that on every frame.
 *
 * The arithmetic is not here. It is in [`dragCue`](../utils/dragCue.ts), which
 * is pure and tested — jsdom reports every element as zero-sized and has no
 * `setPointerCapture`, so none of what follows is reachable in a test.
 */
export function useCueDrag({
  durationSeconds,
  getSnapTargets,
  onCommit,
}: Options) {
  const gestureRef = useRef<Gesture | null>(null);
  /** Set at the end of a drag, so the click it fires does not open the editor. */
  const draggedRef = useRef(false);

  const applyPreview = (gesture: Gesture, times: CueTimes) => {
    const left = `${timeToPercent(times.timeStart, gesture.durationSeconds)}%`;
    const width = `${timeToPercent(times.timeEnd - times.timeStart, gesture.durationSeconds)}%`;
    for (const element of gesture.elements) {
      element.style.left = left;
      element.style.width = width;
    }
  };

  const handleMove = useCallback((event: PointerEvent) => {
    const gesture = gestureRef.current;
    if (!gesture) return;

    const deltaPx = event.clientX - gesture.startClientX;
    if (!gesture.moved && Math.abs(deltaPx) < DRAG_THRESHOLD_PX) return;
    gesture.moved = true;

    // A difference in pixels becomes a difference in seconds. `percentToTime`
    // is no use here: it clamps an absolute position, and this is an offset.
    const deltaSeconds =
      (deltaPx / gesture.laneWidthPx) * gesture.durationSeconds;

    gesture.latest = dragCue(gesture.cue, gesture.mode, deltaSeconds, {
      durationSeconds: gesture.durationSeconds,
      snapTargets: gesture.snapTargets,
      // Expressed in pixels so snapping feels the same at any zoom.
      snapToleranceSeconds:
        (SNAP_PX / gesture.laneWidthPx) * gesture.durationSeconds,
    });

    applyPreview(gesture, gesture.latest);
  }, []);

  const handleEnd = useCallback(() => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (!gesture) return;

    gesture.abort.abort();

    const { cue, latest, moved } = gesture;
    const changed =
      latest.timeStart !== cue.timeStart || latest.timeEnd !== cue.timeEnd;

    // Even a drag that changed nothing was a drag, not a click on the block.
    draggedRef.current = moved;

    if (moved && changed) {
      // React re-renders from the new times and overwrites the preview.
      onCommit({ ...cue, ...latest });
    } else {
      // Nothing will re-render, so the preview has to be undone by hand.
      applyPreview(gesture, cue);
    }
  }, [onCommit]);

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>, cue: Cue, mode: DragMode) => {
      // Left button or a touch; and never from the per-cue delete button.
      if (event.button !== 0) return;
      if ((event.target as HTMLElement).closest("button")) return;

      const block = event.currentTarget.closest<HTMLElement>("[data-cue-id]");
      const lane = block?.parentElement;
      if (!block || !lane || lane.clientWidth === 0) return;

      event.preventDefault();

      const scope =
        block.closest<HTMLElement>("[data-timeline-rows]") ?? document;
      const abort = new AbortController();

      gestureRef.current = {
        cue,
        mode,
        durationSeconds,
        startClientX: event.clientX,
        laneWidthPx: lane.clientWidth,
        elements: Array.from(
          scope.querySelectorAll<HTMLElement>(`[data-cue-id="${cue.id}"]`),
        ),
        snapTargets: getSnapTargets(cue.id),
        moved: false,
        latest: { timeStart: cue.timeStart, timeEnd: cue.timeEnd },
        abort,
      };

      // Absent in jsdom and in older browsers; the window listeners carry the
      // gesture either way, so it is an optional improvement, not a dependency.
      event.currentTarget.setPointerCapture?.(event.pointerId);

      const options = { signal: abort.signal };
      window.addEventListener("pointermove", handleMove, options);
      window.addEventListener("pointerup", handleEnd, options);
      window.addEventListener("pointercancel", handleEnd, options);
    },
    [durationSeconds, getSnapTargets, handleMove, handleEnd],
  );

  /** True once per drag, for the click that the drag's own pointerup fires. */
  const consumeDrag = useCallback(() => {
    const dragged = draggedRef.current;
    draggedRef.current = false;
    return dragged;
  }, []);

  // A timeline unmounted mid-gesture must not leave listeners on window.
  useEffect(() => () => gestureRef.current?.abort.abort(), []);

  return { startDrag, consumeDrag };
}
