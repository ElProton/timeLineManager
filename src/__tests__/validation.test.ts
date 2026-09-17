import { describe, it, expect } from "vitest";
import { isValidProjectData } from "../utils/validation";
import { MAX_DURATION_SECONDS } from "../types";
import { makeProject, makeCue, makeEmptyProject } from "./fixtures";

describe("isValidProjectData", () => {
  it("accepts a well-formed project", () => {
    expect(isValidProjectData(makeProject())).toBe(true);
  });

  it("accepts a project with no tracks and no cues", () => {
    expect(isValidProjectData(makeEmptyProject())).toBe(true);
  });

  describe("shape", () => {
    it.each([null, undefined, 42, "text", true, []])("rejects %p", (value) => {
      expect(isValidProjectData(value)).toBe(false);
    });

    it("rejects a missing or non-numeric schemaVersion", () => {
      expect(
        isValidProjectData(makeProject({ schemaVersion: undefined as never })),
      ).toBe(false);
      expect(
        isValidProjectData(makeProject({ schemaVersion: "2" as never })),
      ).toBe(false);
      expect(isValidProjectData(makeProject({ schemaVersion: 0 }))).toBe(false);
    });

    it("rejects non-array tracks or cues", () => {
      expect(isValidProjectData(makeProject({ tracks: "no" as never }))).toBe(
        false,
      );
      expect(isValidProjectData(makeProject({ cues: null as never }))).toBe(
        false,
      );
    });
  });

  describe("metadata", () => {
    it("rejects a blank title", () => {
      for (const title of ["", "   "]) {
        expect(
          isValidProjectData(
            makeProject({ metadata: { title, durationSeconds: 60 } }),
          ),
        ).toBe(false);
      }
    });

    it("accepts a project with no soundtrack", () => {
      expect(
        isValidProjectData(
          makeEmptyProject({ metadata: { title: "T", durationSeconds: 60 } }),
        ),
      ).toBe(true);
    });

    it("rejects a non-string soundtrack", () => {
      expect(
        isValidProjectData(
          makeEmptyProject({
            metadata: {
              title: "T",
              durationSeconds: 60,
              soundtrack: 7 as never,
            },
          }),
        ),
      ).toBe(false);
    });

    it.each([0, -10, NaN, Infinity, MAX_DURATION_SECONDS + 1])(
      "rejects a duration of %p",
      (durationSeconds) => {
        expect(
          isValidProjectData(
            makeEmptyProject({ metadata: { title: "T", durationSeconds } }),
          ),
        ).toBe(false);
      },
    );

    it("accepts the maximum duration", () => {
      expect(
        isValidProjectData(
          makeEmptyProject({
            metadata: { title: "T", durationSeconds: MAX_DURATION_SECONDS },
          }),
        ),
      ).toBe(true);
    });
  });

  describe("tracks", () => {
    it("rejects a track with no id", () => {
      expect(
        isValidProjectData(
          makeProject({ tracks: [{ id: "", name: "X" }], cues: [] }),
        ),
      ).toBe(false);
    });

    it("rejects duplicate track ids", () => {
      expect(
        isValidProjectData(
          makeProject({
            tracks: [
              { id: "t1", name: "A" },
              { id: "t1", name: "B" },
            ],
            cues: [],
          }),
        ),
      ).toBe(false);
    });
  });

  describe("cues", () => {
    it("rejects a cue ending before it starts", () => {
      expect(
        isValidProjectData(
          makeProject({ cues: [makeCue({ timeStart: 30, timeEnd: 10 })] }),
        ),
      ).toBe(false);
    });

    it("rejects a zero-length cue", () => {
      expect(
        isValidProjectData(
          makeProject({ cues: [makeCue({ timeStart: 10, timeEnd: 10 })] }),
        ),
      ).toBe(false);
    });

    it("rejects a negative start", () => {
      expect(
        isValidProjectData(
          makeProject({ cues: [makeCue({ timeStart: -1, timeEnd: 10 })] }),
        ),
      ).toBe(false);
    });

    it("rejects a cue referencing a track that does not exist", () => {
      // Otherwise the cue renders on no row at all and vanishes silently.
      expect(
        isValidProjectData(
          makeProject({ cues: [makeCue({ trackIds: ["ghost"] })] }),
        ),
      ).toBe(false);
    });

    it.each(["red", "#12", "#1234", "ef4444", ""])(
      "rejects the colour %p",
      (color) => {
        expect(
          isValidProjectData(makeProject({ cues: [makeCue({ color })] })),
        ).toBe(false);
      },
    );

    it.each(["#fff", "#FFFFFF", "#ef4444"])(
      "accepts the colour %p",
      (color) => {
        expect(
          isValidProjectData(makeProject({ cues: [makeCue({ color })] })),
        ).toBe(true);
      },
    );
  });
});
