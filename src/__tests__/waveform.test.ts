import { describe, it, expect } from "vitest";
import { computePeaks } from "../utils/waveform";

/** Eight samples whose extremes are obvious by eye. */
const SIGNAL = new Float32Array([0, 1, -1, 0.5, -0.5, 0.25, -0.25, 0]);

describe("computePeaks", () => {
  it("takes the extremes of each bucket", () => {
    expect(computePeaks([SIGNAL], 4)).toEqual([
      { min: 0, max: 1 },
      { min: -1, max: 0.5 },
      { min: -0.5, max: 0.25 },
      { min: -0.25, max: 0 },
    ]);
  });

  it("returns exactly as many columns as asked for", () => {
    for (const buckets of [1, 3, 7, 100]) {
      expect(computePeaks([SIGNAL], buckets)).toHaveLength(buckets);
    }
  });

  it("covers the whole signal, whatever the bucket count", () => {
    // 7 does not divide 8: a naive `floor` on both ends drops the last sample.
    for (const buckets of [3, 5, 7, 8]) {
      const peaks = computePeaks([SIGNAL], buckets);
      expect(Math.min(...peaks.map((p) => p.min))).toBe(-1);
      expect(Math.max(...peaks.map((p) => p.max))).toBe(1);
    }
  });

  it("stretches rather than leaving gaps when asked for more columns than samples", () => {
    const peaks = computePeaks([new Float32Array([0.5, -0.5])], 6);
    expect(peaks).toHaveLength(6);
    // No column is an empty `Infinity` range.
    for (const peak of peaks) {
      expect(Number.isFinite(peak.min)).toBe(true);
      expect(Number.isFinite(peak.max)).toBe(true);
      expect(peak.min).toBeLessThanOrEqual(peak.max);
    }
  });

  it("draws silence flat", () => {
    expect(computePeaks([new Float32Array(1000)], 4)).toEqual([
      { min: 0, max: 0 },
      { min: 0, max: 0 },
      { min: 0, max: 0 },
      { min: 0, max: 0 },
    ]);
  });

  it("takes the extent across every channel", () => {
    // A hard-panned track: reading channel 0 alone would draw it as silence.
    const left = new Float32Array([0, 0, 0, 0]);
    // Powers of two: Float32Array stores these exactly, so the assertion can
    // stay an equality rather than an approximation.
    const right = new Float32Array([0.75, -0.875, 0, 0]);
    expect(computePeaks([left, right], 2)).toEqual([
      { min: -0.875, max: 0.75 },
      { min: 0, max: 0 },
    ]);
  });

  it("has nothing to draw for an empty signal or no columns", () => {
    expect(computePeaks([], 10)).toEqual([]);
    expect(computePeaks([new Float32Array(0)], 10)).toEqual([]);
    expect(computePeaks([SIGNAL], 0)).toEqual([]);
    expect(computePeaks([SIGNAL], -1)).toEqual([]);
  });
});
