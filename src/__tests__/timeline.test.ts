import { describe, it, expect } from "vitest";
import {
  markerStep,
  markerTimes,
  percentToTime,
  timeToPercent,
} from "../utils/timeline";

describe("markerStep", () => {
  it("keeps the marker count bounded for any duration", () => {
    // A mistyped "9999:00" used to generate 10,000 markers per track row and
    // freeze the tab.
    for (const duration of [30, 60, 180, 600, 900, 3600, 43200, 599940]) {
      expect(markerTimes(duration).length).toBeLessThanOrEqual(41);
    }
  });

  it("uses a round interval a reader can do arithmetic with", () => {
    expect(markerStep(180)).toBe(5);
    expect(markerStep(900)).toBe(30);
    expect(markerStep(3600)).toBe(120);
  });

  it("gives short timelines a finer grid than the old fixed rule", () => {
    // The old rule drew a 3-minute timeline with 7 markers, 30 seconds apart.
    expect(markerStep(180)).toBeLessThan(30);
  });

  it("never returns zero", () => {
    expect(markerStep(1)).toBeGreaterThan(0);
    expect(markerStep(0)).toBeGreaterThan(0);
  });
});

describe("markerTimes", () => {
  it("starts at zero and stays within the duration", () => {
    const times = markerTimes(900);
    expect(times[0]).toBe(0);
    expect(times[times.length - 1]).toBeLessThanOrEqual(900);
  });

  it("is evenly spaced", () => {
    const times = markerTimes(600);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    expect(new Set(gaps).size).toBe(1);
  });
});

describe("timeToPercent", () => {
  it("places a time along the axis", () => {
    expect(timeToPercent(0, 200)).toBe(0);
    expect(timeToPercent(50, 200)).toBe(25);
    expect(timeToPercent(200, 200)).toBe(100);
  });

  it("turns a difference of two times into a width", () => {
    // How the cue blocks are sized: the same arithmetic on a delta.
    expect(timeToPercent(90 - 30, 240)).toBe(25);
  });

  it("lets a cue past the end overflow rather than clamping it", () => {
    // `timeEnd <= durationSeconds` is enforced by CueModal, not by
    // isValidProjectData, so an imported file can carry one. Overflowing the
    // lane is how the reader finds out.
    expect(timeToPercent(300, 200)).toBe(150);
  });

  it("returns 0 rather than Infinity for a zero duration", () => {
    expect(timeToPercent(10, 0)).toBe(0);
    expect(timeToPercent(10, -1)).toBe(0);
  });
});

describe("percentToTime", () => {
  it("reads a time back off the axis", () => {
    expect(percentToTime(0, 200)).toBe(0);
    expect(percentToTime(25, 200)).toBe(50);
    expect(percentToTime(100, 200)).toBe(200);
  });

  it("round-trips with timeToPercent", () => {
    for (const [time, duration] of [
      [0, 200],
      [1, 7],
      [155, 3600],
      [42.5, 90],
    ]) {
      expect(
        percentToTime(timeToPercent(time, duration), duration),
      ).toBeCloseTo(time, 10);
    }
  });

  it("clamps a click that lands outside the lane", () => {
    // The pointer is measured against an element it can be dragged out of, and
    // seeking to a negative time is not a thing.
    expect(percentToTime(-5, 200)).toBe(0);
    expect(percentToTime(130, 200)).toBe(200);
  });

  it("returns 0 rather than NaN for a zero duration", () => {
    expect(percentToTime(50, 0)).toBe(0);
  });
});
