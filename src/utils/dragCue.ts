/**
 * The shortest a cue may become, in seconds.
 *
 * `timeEnd` must be strictly greater than `timeStart`, and `mm:ss` cannot write
 * anything finer than a second anyway — see `MUST BE WHOLE SECONDS` below.
 */
export const MIN_CUE_SECONDS = 1;

/** Which part of the block the pointer took hold of. */
export type DragMode = "move" | "resize-start" | "resize-end";

export interface CueTimes {
  timeStart: number;
  timeEnd: number;
}

export interface DragBounds {
  /** `metadata.durationSeconds`. */
  durationSeconds: number;
  /**
   * Times an edge jumps to when it lands close enough — the playhead, the axis
   * markers. Plain numbers, so this stays a calculation and knows nothing about
   * audio.
   */
  snapTargets?: number[];
  /** How close is close enough. Omit, or pass 0, to disable snapping. */
  snapToleranceSeconds?: number;
}

/**
 * Where a cue lands after being dragged by `deltaSeconds`.
 *
 * The whole of the drag logic, and the only part of it that can be tested:
 * jsdom's `getBoundingClientRect()` returns zeros and it has no
 * `setPointerCapture`, so no pixel-to-time conversion is reachable there. The
 * caller measures and converts; this decides.
 *
 * The same function serves the keyboard: a nudge is a drag with no snap targets.
 *
 * **Results are whole seconds.** Not a matter of taste — `isValidTimeFormat`
 * only accepts `mm:ss` and `formatTime` truncates, so a cue dragged to 12.37 s
 * would reopen in the editor reading `00:12` and quietly move on save.
 *
 * It also enforces `timeEnd <= durationSeconds` itself, because
 * `isValidProjectData` does not — only `CueModal` did.
 */
export function dragCue(
  cue: CueTimes,
  mode: DragMode,
  deltaSeconds: number,
  bounds: DragBounds,
): CueTimes {
  const {
    durationSeconds,
    snapTargets = [],
    snapToleranceSeconds = 0,
  } = bounds;

  if (!Number.isFinite(deltaSeconds) || durationSeconds <= 0) return cue;

  if (mode === "move") {
    // The length is preserved: a cue pushed against either end stops there
    // rather than being squashed against it.
    const length = cue.timeEnd - cue.timeStart;
    const shift = snapShift(
      [cue.timeStart, cue.timeEnd],
      deltaSeconds,
      snapTargets,
      snapToleranceSeconds,
    );
    const latestStart = Math.max(0, durationSeconds - length);
    const timeStart = clamp(Math.round(cue.timeStart + shift), 0, latestStart);
    return { timeStart, timeEnd: timeStart + length };
  }

  if (mode === "resize-start") {
    const shift = snapShift(
      [cue.timeStart],
      deltaSeconds,
      snapTargets,
      snapToleranceSeconds,
    );
    const timeStart = clamp(
      Math.round(cue.timeStart + shift),
      0,
      cue.timeEnd - MIN_CUE_SECONDS,
    );
    return { timeStart, timeEnd: cue.timeEnd };
  }

  const shift = snapShift(
    [cue.timeEnd],
    deltaSeconds,
    snapTargets,
    snapToleranceSeconds,
  );
  const timeEnd = clamp(
    Math.round(cue.timeEnd + shift),
    cue.timeStart + MIN_CUE_SECONDS,
    durationSeconds,
  );
  return { timeStart: cue.timeStart, timeEnd };
}

/**
 * Adjusts a shift so the nearest edge lands exactly on a snap target.
 *
 * Both edges are candidates when moving: dragging a cue so that its *end* meets
 * the playhead is as reasonable as its start.
 */
function snapShift(
  edges: number[],
  shift: number,
  targets: number[],
  tolerance: number,
): number {
  if (tolerance <= 0 || targets.length === 0) return shift;

  let best = shift;
  let bestDistance = Infinity;

  for (const edge of edges) {
    for (const target of targets) {
      const distance = Math.abs(edge + shift - target);
      if (distance <= tolerance && distance < bestDistance) {
        bestDistance = distance;
        best = target - edge;
      }
    }
  }

  return best;
}

/**
 * `low` wins a contradictory range.
 *
 * `durationSeconds` is validated as finite and positive but **not** as an
 * integer, so an imported timeline can be 240.5 seconds long and the high bound
 * can be fractional. Pinning to it is still the most defensible value
 * available: it is exactly the end of the timeline.
 */
function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(value, high));
}
