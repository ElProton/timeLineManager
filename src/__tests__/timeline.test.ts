import { describe, it, expect } from "vitest";
import { markerStep, markerTimes } from "../utils/timeline";

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
