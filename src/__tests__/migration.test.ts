import { describe, it, expect, vi } from "vitest";
import { migrateProject } from "../utils/migration";
import { CURRENT_SCHEMA_VERSION } from "../types";

/** A realistic v1 file, as produced by the app before the v2 rename. */
function v1Project() {
  return {
    schemaVersion: 1,
    metadata: { title: "Show", musicName: "Boléro", durationSeconds: 300 },
    actors: [
      { id: "a1", name: "Alice" },
      { id: "a2", name: "Bob" },
    ],
    actions: [
      {
        id: "act1",
        description: "Enter",
        timeStart: 0,
        timeEnd: 30,
        actorIds: ["a1"],
        color: "#ef4444",
      },
      {
        id: "act2",
        description: "Cross",
        timeStart: 10,
        timeEnd: 60,
        actorIds: ["a1", "a2"],
        color: "#3b82f6",
      },
    ],
  };
}

describe("migrateProject", () => {
  describe("rejects unusable input", () => {
    it("returns null for null", () => {
      expect(migrateProject(null)).toBeNull();
    });

    it("returns null for non-object input", () => {
      expect(migrateProject("string")).toBeNull();
      expect(migrateProject(42)).toBeNull();
      expect(migrateProject(true)).toBeNull();
      expect(migrateProject(undefined)).toBeNull();
    });

    it("returns null for an array", () => {
      expect(migrateProject([])).toBeNull();
    });

    it("returns null for an unsupported future version", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = migrateProject({
        schemaVersion: 999,
        metadata: { title: "X", durationSeconds: 60 },
        tracks: [],
        cues: [],
      });
      expect(result).toBeNull();
      expect(spy).toHaveBeenCalledWith("Unsupported schema version: 999");
      spy.mockRestore();
    });
  });

  describe("v0 → v2 (no schemaVersion)", () => {
    it("migrates all the way to the current version", () => {
      const result = migrateProject({
        metadata: { title: "Test", musicName: "Song", durationSeconds: 120 },
        actors: [],
        actions: [],
      });
      expect(result).not.toBeNull();
      expect(result!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(result!.tracks).toEqual([]);
      expect(result!.cues).toEqual([]);
    });

    it("stamps schemaVersion on an empty object without validating structure", () => {
      // migrateProject only handles versioning. An empty object is carried
      // through even though it is structurally invalid; isValidProjectData
      // is what rejects it.
      const result = migrateProject({});
      expect(result).not.toBeNull();
      expect(result!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });
  });

  describe("v1 → v2", () => {
    it("renames actors to tracks, preserving id and name", () => {
      const result = migrateProject(v1Project());
      expect(result!.tracks).toEqual([
        { id: "a1", name: "Alice" },
        { id: "a2", name: "Bob" },
      ]);
      expect(result).not.toHaveProperty("actors");
    });

    it("renames actions to cues and actorIds to trackIds", () => {
      const result = migrateProject(v1Project());
      expect(result!.cues).toEqual([
        {
          id: "act1",
          description: "Enter",
          timeStart: 0,
          timeEnd: 30,
          trackIds: ["a1"],
          color: "#ef4444",
        },
        {
          id: "act2",
          description: "Cross",
          timeStart: 10,
          timeEnd: 60,
          trackIds: ["a1", "a2"],
          color: "#3b82f6",
        },
      ]);
      expect(result).not.toHaveProperty("actions");
    });

    it("moves musicName to soundtrack", () => {
      const result = migrateProject(v1Project());
      expect(result!.metadata).toEqual({
        title: "Show",
        soundtrack: "Boléro",
        durationSeconds: 300,
      });
    });

    it("drops soundtrack when musicName is empty or blank", () => {
      for (const musicName of ["", "   "]) {
        const result = migrateProject({
          schemaVersion: 1,
          metadata: { title: "T", musicName, durationSeconds: 60 },
          actors: [],
          actions: [],
        });
        expect(result!.metadata).toEqual({ title: "T", durationSeconds: 60 });
      }
    });

    it("keeps a cue with no actors, as an empty trackIds", () => {
      const result = migrateProject({
        schemaVersion: 1,
        metadata: { title: "T", musicName: "M", durationSeconds: 60 },
        actors: [],
        actions: [
          {
            id: "c1",
            description: "Orphan",
            timeStart: 0,
            timeEnd: 5,
            color: "#000000",
          },
        ],
      });
      expect(result!.cues).toEqual([
        {
          id: "c1",
          description: "Orphan",
          timeStart: 0,
          timeEnd: 5,
          trackIds: [],
          color: "#000000",
        },
      ]);
    });

    it("tolerates missing actors and actions arrays", () => {
      const result = migrateProject({
        schemaVersion: 1,
        metadata: { title: "T", durationSeconds: 60 },
      });
      expect(result!.tracks).toEqual([]);
      expect(result!.cues).toEqual([]);
    });

    it("carries unknown top-level fields through untouched", () => {
      const result = migrateProject({ ...v1Project(), notes: "keep me" });
      expect(result!.notes).toBe("keep me");
    });
  });

  describe("v2 (already current)", () => {
    it("returns the data unchanged", () => {
      const v2 = {
        schemaVersion: 2,
        metadata: { title: "Show", durationSeconds: 120 },
        tracks: [{ id: "t1", name: "Lighting" }],
        cues: [],
      };
      const result = migrateProject(v2);
      expect(result).toEqual(v2);
    });
  });

  it("never mutates its input", () => {
    const original = v1Project();
    const snapshot = JSON.parse(JSON.stringify(original));
    migrateProject(original);
    expect(original).toEqual(snapshot);
  });
});
