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
