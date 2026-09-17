import { describe, it, expect } from "vitest";
import { dragCue, MIN_CUE_SECONDS } from "../utils/dragCue";

const CUE = { timeStart: 60, timeEnd: 90 };
const BOUNDS = { durationSeconds: 240 };

describe("dragCue: move", () => {
  it("shifts both edges together", () => {
    expect(dragCue(CUE, "move", 15, BOUNDS)).toEqual({
      timeStart: 75,
      timeEnd: 105,
    });
    expect(dragCue(CUE, "move", -20, BOUNDS)).toEqual({
      timeStart: 40,
      timeEnd: 70,
    });
  });

  it("keeps the cue's length when it hits either end", () => {
    // Clamping each edge on its own would squash the block against the wall.
    expect(dragCue(CUE, "move", -200, BOUNDS)).toEqual({
      timeStart: 0,
      timeEnd: 30,
    });
    expect(dragCue(CUE, "move", 500, BOUNDS)).toEqual({
      timeStart: 210,
      timeEnd: 240,
    });
  });

  it("leaves a cue longer than the timeline pinned at the start", () => {
    // isValidProjectData does not enforce `timeEnd <= durationSeconds`, so an
    // imported file can carry one. Refusing to move it at all would be worse.
    const tooLong = { timeStart: 10, timeEnd: 300 };
    expect(dragCue(tooLong, "move", -50, BOUNDS)).toEqual({
      timeStart: 0,
      timeEnd: 290,
    });
  });
});

describe("dragCue: resize", () => {
  it("moves one edge and leaves the other alone", () => {
    expect(dragCue(CUE, "resize-start", -20, BOUNDS)).toEqual({
      timeStart: 40,
      timeEnd: 90,
    });
    expect(dragCue(CUE, "resize-end", 30, BOUNDS)).toEqual({
      timeStart: 60,
      timeEnd: 120,
    });
  });

  it("never lets an edge cross the other", () => {
    expect(dragCue(CUE, "resize-start", 999, BOUNDS)).toEqual({
      timeStart: 90 - MIN_CUE_SECONDS,
      timeEnd: 90,
    });
    expect(dragCue(CUE, "resize-end", -999, BOUNDS)).toEqual({
      timeStart: 60,
      timeEnd: 60 + MIN_CUE_SECONDS,
    });
  });

  it("stays inside the timeline", () => {
    expect(dragCue(CUE, "resize-start", -999, BOUNDS).timeStart).toBe(0);
    expect(dragCue(CUE, "resize-end", 999, BOUNDS).timeEnd).toBe(240);
  });
});

describe("dragCue: whole seconds", () => {
  // Not a matter of taste: isValidTimeFormat only accepts mm:ss and formatTime
  // truncates, so a cue at 12.37s would reopen in the editor reading 00:12 and
  // move on save without anyone touching it.
  it("rounds every result", () => {
    for (const delta of [0.4, 2.5, -1.7, 12.37, -0.49]) {
      const { timeStart, timeEnd } = dragCue(CUE, "move", delta, BOUNDS);
      expect(Number.isInteger(timeStart)).toBe(true);
      expect(Number.isInteger(timeEnd)).toBe(true);
    }
    expect(dragCue(CUE, "resize-end", 4.6, BOUNDS).timeEnd).toBe(95);
  });

  it("rounds a snapped edge too, so the playhead cannot smuggle a fraction in", () => {
    // The playhead sits at a fractional time. Snapping to it means the second
    // it is on — 69.6 becomes 70 — because a fractional cue would reopen in the
    // editor as a different cue.
    const snapped = dragCue(CUE, "move", 8, {
      ...BOUNDS,
      snapTargets: [69.6],
      snapToleranceSeconds: 2,
    });
    expect(snapped).toEqual({ timeStart: 70, timeEnd: 100 });
  });
});

describe("dragCue: snapping", () => {
  const withSnap = {
    ...BOUNDS,
    snapTargets: [30, 100, 150],
    snapToleranceSeconds: 3,
  };

  it("pulls a nearby edge exactly onto its target", () => {
    // 60 -> 98, and 98 is within 3s of 100.
    expect(dragCue(CUE, "move", 38, withSnap)).toEqual({
      timeStart: 100,
      timeEnd: 130,
    });
  });

  it("snaps on whichever edge is closest, not only the start", () => {
    // start 60 -> 68 (nothing near), end 90 -> 98, within 3s of 100.
    expect(dragCue(CUE, "move", 8, withSnap)).toEqual({
      timeStart: 70,
      timeEnd: 100,
    });
  });

  it("leaves a shift alone when nothing is within tolerance", () => {
    expect(dragCue(CUE, "move", 20, withSnap)).toEqual({
      timeStart: 80,
      timeEnd: 110,
    });
  });

  it("does nothing without targets or tolerance", () => {
    expect(dragCue(CUE, "move", 38, BOUNDS).timeStart).toBe(98);
    expect(
      dragCue(CUE, "move", 38, { ...BOUNDS, snapTargets: [100] }).timeStart,
    ).toBe(98);
    expect(
      dragCue(CUE, "move", 38, { ...withSnap, snapToleranceSeconds: 0 })
        .timeStart,
    ).toBe(98);
  });

  it("snaps a resized edge", () => {
    expect(dragCue(CUE, "resize-end", 9, withSnap)).toEqual({
      timeStart: 60,
      timeEnd: 100,
    });
  });

  it("still obeys the bounds after snapping", () => {
    // The target sits past the end of the timeline.
    expect(
      dragCue(CUE, "resize-end", 180, {
        ...BOUNDS,
        snapTargets: [241],
        snapToleranceSeconds: 5,
      }).timeEnd,
    ).toBe(240);
  });
});

describe("dragCue: refusals", () => {
  it("returns the cue untouched for a delta that is not a number", () => {
    expect(dragCue(CUE, "move", NaN, BOUNDS)).toBe(CUE);
    expect(dragCue(CUE, "move", Infinity, BOUNDS)).toBe(CUE);
  });

  it("returns the cue untouched for a timeline of no length", () => {
    expect(dragCue(CUE, "move", 10, { durationSeconds: 0 })).toBe(CUE);
  });

  it("never mutates its input", () => {
    const original = { timeStart: 60, timeEnd: 90 };
    dragCue(original, "move", 30, BOUNDS);
    dragCue(original, "resize-end", 30, BOUNDS);
    expect(original).toEqual({ timeStart: 60, timeEnd: 90 });
  });

  it("is a no-op for a zero delta", () => {
    // What tells a click apart from a drag that went nowhere: no change, so no
    // dispatch, so no undo entry.
    expect(dragCue(CUE, "move", 0, BOUNDS)).toEqual(CUE);
    expect(dragCue(CUE, "resize-start", 0, BOUNDS)).toEqual(CUE);
    expect(dragCue(CUE, "resize-end", 0, BOUNDS)).toEqual(CUE);
  });
});
