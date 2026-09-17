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

describe("markerStep, given the lane's width", () => {
  it("stops the labels overlapping on a short timeline", () => {
    // The bug this fixes: 40 seconds in a 1060px lane drew 41 labels 26px
    // apart. A label needs about 40px, so they ran into each other.
    const step = markerStep(40, 1060);
    const labels = markerTimes(40, 1060).length;
    expect(1060 / (40 / step)).toBeGreaterThanOrEqual(40);
    expect(labels).toBeLessThan(41);
  });

  it("earns more labels as the lane gets wider, which is the point of zoom", () => {
    const atOnce = markerTimes(40, 1060).length;
    const atFour = markerTimes(40, 4240).length;
    expect(atFour).toBeGreaterThan(atOnce);
  });

  it("still honours the marker cap however wide the lane", () => {
    for (const width of [4240, 20000, 1e6]) {
      expect(markerTimes(600, width).length).toBeLessThanOrEqual(41);
    }
  });

  it("keeps a usable axis in a lane too narrow for two labels", () => {
    // Two is the floor: a single tick is not an axis.
    expect(markerTimes(600, 20).length).toBeGreaterThanOrEqual(2);
    expect(markerStep(600, 20)).toBeGreaterThan(0);
  });

  it("falls back to the duration alone when the width is missing or absurd", () => {
    for (const width of [undefined, 0, -100, NaN, Infinity]) {
      expect(markerStep(180, width)).toBe(markerStep(180));
    }
  });

  it("leaves the width-free behaviour exactly as it was", () => {
    expect(markerStep(180)).toBe(5);
    expect(markerStep(900)).toBe(30);
    expect(markerStep(3600)).toBe(120);
  });
});
