/** Round intervals a reader can do arithmetic with, in seconds. */
const MARKER_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];

/** Upper bound on how many labels the time axis may carry. */
const MAX_MARKERS = 40;

/**
 * Room one label needs, in pixels, before it runs into the next.
 *
 * A label is 10px text with a unit of horizontal padding, so "100:00" comes to
 * roughly 40px; the rest is the gap that makes an axis readable rather than a
 * smear.
 */
const MIN_LABEL_PX = 56;

/**
 * How many labels the axis may carry — by count, and by how wide it really is.
 *
 * The count alone was never enough. MAX_MARKERS stops the axis generating ten
 * thousand markers but says nothing about whether they fit: a 40-second
 * timeline drew 41 labels 26px apart, and they overlapped.
 */
function maxLabelsFor(laneWidthPx?: number): number {
  if (
    laneWidthPx === undefined ||
    !Number.isFinite(laneWidthPx) ||
    laneWidthPx <= 0
  ) {
    return MAX_MARKERS;
  }
  // Never fewer than two: a lane can be narrower than two labels, and an axis
  // with a single tick is not an axis.
  return Math.max(
    2,
    Math.min(MAX_MARKERS, Math.floor(laneWidthPx / MIN_LABEL_PX)),
  );
}

/**
 * Picks a marker interval that keeps the time axis readable at any duration.
 *
 * Pass a lane width and it also accounts for the space a label needs, which is
 * what makes zooming worth anything: four times the width earns more labels
 * rather than the same ones spread further apart. Without it the interval comes
 * from the duration alone, as it always did.
 *
 * The rule before either — 30s below ten minutes, 60s above — put 10,000
 * markers on the page for a mistyped "9999:00", freezing the tab, while leaving
 * a three-minute timeline with only seven.
 */
export function markerStep(
  durationSeconds: number,
  laneWidthPx?: number,
): number {
  const maxLabels = maxLabelsFor(laneWidthPx);
  const fitting = MARKER_STEPS.find(
    (step) => durationSeconds / step <= maxLabels,
  );
  return fitting ?? Math.ceil(durationSeconds / maxLabels);
}

/** The marker offsets, in seconds, for a timeline of this duration. */
export function markerTimes(
  durationSeconds: number,
  laneWidthPx?: number,
): number[] {
  const step = markerStep(durationSeconds, laneWidthPx);
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
