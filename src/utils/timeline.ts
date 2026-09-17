/** Round intervals a reader can do arithmetic with, in seconds. */
const MARKER_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];

/** Upper bound on how many labels the time axis may carry. */
const MAX_MARKERS = 40;

/**
 * Picks a marker interval that keeps the time axis readable at any duration.
 *
 * The previous rule — 30s below ten minutes, 60s above — put 10,000 markers on
 * the page for a mistyped "9999:00", freezing the tab, while leaving a
 * three-minute timeline with only seven.
 */
export function markerStep(durationSeconds: number): number {
  const fitting = MARKER_STEPS.find(
    (step) => durationSeconds / step <= MAX_MARKERS,
  );
  return fitting ?? Math.ceil(durationSeconds / MAX_MARKERS);
}

/** The marker offsets, in seconds, for a timeline of this duration. */
export function markerTimes(durationSeconds: number): number[] {
  const step = markerStep(durationSeconds);
  const times: number[] = [];
  for (let time = 0; time <= durationSeconds; time += step) {
    times.push(time);
  }
  return times;
}

/**
 * Where a time sits on the axis, as a percentage of the total duration.
 *
 * Every position on screen is expressed this way — axis markers, grid lines,
 * cue blocks, the playhead — so the conversion lives here rather than being
 * copied to each call site. Applied to a difference of two times it gives a
 * width instead of an offset; the arithmetic is the same.
 *
 * It deliberately does **not** clamp. `timeEnd <= durationSeconds` is enforced
 * by `CueModal`, not by `isValidProjectData`, so an imported file can carry a
 * cue that runs past the end; letting it overflow the lane shows the reader
 * that it does.
 */
export function timeToPercent(
  seconds: number,
  durationSeconds: number,
): number {
  if (durationSeconds <= 0) return 0;
  return (seconds / durationSeconds) * 100;
}

/**
 * The inverse: which time a point on the axis corresponds to.
 *
 * This is what clicking the timeline to move the playhead needs. Unlike
 * `timeToPercent` it **does** clamp, to `[0, durationSeconds]`: a pointer can
 * land a fraction outside the lane it was measured against, and seeking to a
 * negative time is not a thing.
 */
export function percentToTime(
  percent: number,
  durationSeconds: number,
): number {
  if (durationSeconds <= 0) return 0;
  const seconds = (percent / 100) * durationSeconds;
  return Math.min(Math.max(seconds, 0), durationSeconds);
}
