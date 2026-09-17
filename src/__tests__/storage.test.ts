import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  STORAGE_KEY,
  isCacheAvailable,
  saveCachedProject,
  loadCachedProject,
  clearCachedProject,
} from "../utils/storage";
import { makeProject, makeEmptyProject } from "./fixtures";

const validProject = makeProject();

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("isCacheAvailable", () => {
    it("returns true when localStorage is available", () => {
      expect(isCacheAvailable()).toBe(true);
    });

    it("returns false when localStorage throws", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      expect(isCacheAvailable()).toBe(false);
    });
  });

  describe("saveCachedProject", () => {
    it("saves project to localStorage", () => {
      saveCachedProject(validProject);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(
        validProject,
      );
    });

    it("does not throw when localStorage is full", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(() => saveCachedProject(validProject)).not.toThrow();
      expect(warn).toHaveBeenCalled();
    });
  });

  describe("loadCachedProject", () => {
    it("returns null when cache is empty", () => {
      expect(loadCachedProject()).toBeNull();
    });

    it("returns the project when cache is valid", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validProject));
      expect(loadCachedProject()).toEqual(validProject);
    });

    it("accepts a project with empty tracks and cues arrays", () => {
      const empty = makeEmptyProject();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
      expect(loadCachedProject()).toEqual(empty);
    });

    it("returns null and clears cache for invalid JSON", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem(STORAGE_KEY, "not-json{{{");
      expect(loadCachedProject()).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(warn).toHaveBeenCalled();
    });

    it("returns null and clears cache for invalid structure", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));
      expect(loadCachedProject()).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(warn).toHaveBeenCalled();
    });

    it("returns null for an unsupported schema version", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...validProject, schemaVersion: 999 }),
      );
      expect(loadCachedProject()).toBeNull();
      expect(warn).toHaveBeenCalled();
    });

    it("migrates a v1 cache written before the Track/Cue rename", () => {
      const v1 = {
        schemaVersion: 1,
        metadata: { title: "Legacy", musicName: "Song", durationSeconds: 180 },
        actors: [{ id: "a1", name: "Alice" }],
        actions: [
          {
            id: "act1",
            description: "Enter",
            timeStart: 0,
            timeEnd: 30,
            actorIds: ["a1"],
            color: "#ef4444",
          },
        ],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v1));

      const loaded = loadCachedProject();
      expect(loaded).not.toBeNull();
      expect(loaded!.schemaVersion).toBe(2);
      expect(loaded!.metadata).toEqual({
        title: "Legacy",
        soundtrack: "Song",
        durationSeconds: 180,
      });
      expect(loaded!.tracks).toEqual([{ id: "a1", name: "Alice" }]);
      expect(loaded!.cues[0].trackIds).toEqual(["a1"]);
    });

    it("migrates a v0 cache (no schemaVersion)", () => {
      const v0 = {
        metadata: { title: "Ancient", musicName: "Song", durationSeconds: 90 },
        actors: [],
        actions: [],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v0));

      const loaded = loadCachedProject();
      expect(loaded).not.toBeNull();
      expect(loaded!.schemaVersion).toBe(2);
      expect(loaded!.tracks).toEqual([]);
    });
  });

  describe("clearCachedProject", () => {
    it("removes the cache key", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validProject));
      clearCachedProject();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("does not throw if key does not exist", () => {
      expect(() => clearCachedProject()).not.toThrow();
    });
  });
});
