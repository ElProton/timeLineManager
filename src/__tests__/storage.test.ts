import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isCacheAvailable,
  saveCachedProject,
  loadCachedProject,
  clearCachedProject,
} from "../utils/storage";
import { ProjectData } from "../types";

const validProject: ProjectData = {
  schemaVersion: 1,
  metadata: {
    title: "Test Show",
    musicName: "Test Song",
    durationSeconds: 180,
  },
  actors: [{ id: "a1", name: "Alice" }],
  actions: [
    {
      id: "act1",
      description: "Enter stage",
      timeStart: 0,
      timeEnd: 30,
      actorIds: ["a1"],
      color: "#ef4444",
    },
  ],
};

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
        throw new Error("SecurityError");
      });
      expect(isCacheAvailable()).toBe(false);
    });
  });

  describe("saveCachedProject", () => {
    it("saves project to localStorage", () => {
      saveCachedProject(validProject);
      const stored = localStorage.getItem("stm_project_cache");
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(validProject);
    });

    it("does not throw when localStorage is full", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });
      expect(() => saveCachedProject(validProject)).not.toThrow();
    });
  });

  describe("loadCachedProject", () => {
    it("returns null when cache is empty", () => {
      expect(loadCachedProject()).toBeNull();
    });

    it("returns the project when cache is valid", () => {
      localStorage.setItem("stm_project_cache", JSON.stringify(validProject));
      expect(loadCachedProject()).toEqual(validProject);
    });

    it("returns null and clears cache for invalid JSON", () => {
      localStorage.setItem("stm_project_cache", "not-json{{{");
      expect(loadCachedProject()).toBeNull();
      expect(localStorage.getItem("stm_project_cache")).toBeNull();
    });

    it("returns null and clears cache for invalid structure", () => {
      localStorage.setItem(
        "stm_project_cache",
        JSON.stringify({ foo: "bar" }),
      );
      expect(loadCachedProject()).toBeNull();
      expect(localStorage.getItem("stm_project_cache")).toBeNull();
    });

    it("returns null when metadata.title is empty", () => {
      const bad = {
        ...validProject,
        metadata: { ...validProject.metadata, title: "  " },
      };
      localStorage.setItem("stm_project_cache", JSON.stringify(bad));
      expect(loadCachedProject()).toBeNull();
    });

    it("returns null when durationSeconds is 0", () => {
      const bad = {
        ...validProject,
        metadata: { ...validProject.metadata, durationSeconds: 0 },
      };
      localStorage.setItem("stm_project_cache", JSON.stringify(bad));
      expect(loadCachedProject()).toBeNull();
    });

    it("returns null when durationSeconds is negative", () => {
      const bad = {
        ...validProject,
        metadata: { ...validProject.metadata, durationSeconds: -10 },
      };
      localStorage.setItem("stm_project_cache", JSON.stringify(bad));
      expect(loadCachedProject()).toBeNull();
    });

    it("returns null when actors is not an array", () => {
      const bad = { ...validProject, actors: "not-array" };
      localStorage.setItem("stm_project_cache", JSON.stringify(bad));
      expect(loadCachedProject()).toBeNull();
    });

    it("returns null when actions is not an array", () => {
      const bad = { ...validProject, actions: null };
      localStorage.setItem("stm_project_cache", JSON.stringify(bad));
      expect(loadCachedProject()).toBeNull();
    });

    it("accepts a project with empty actors and actions arrays", () => {
      const minimal: ProjectData = {
        schemaVersion: 1,
        metadata: { title: "X", musicName: "", durationSeconds: 60 },
        actors: [],
        actions: [],
      };
      localStorage.setItem("stm_project_cache", JSON.stringify(minimal));
      expect(loadCachedProject()).toEqual(minimal);
    });

    it("migrates v0 data (no schemaVersion) from cache", () => {
      const v0Data = {
        metadata: { title: "Old", musicName: "Song", durationSeconds: 60 },
        actors: [],
        actions: [],
      };
      localStorage.setItem("stm_project_cache", JSON.stringify(v0Data));
      const result = loadCachedProject();
      expect(result).not.toBeNull();
      expect(result!.schemaVersion).toBe(1);
    });

    it("returns null for unsupported schema version", () => {
      const futureData = {
        schemaVersion: 999,
        metadata: { title: "X", musicName: "Y", durationSeconds: 60 },
        actors: [],
        actions: [],
      };
      localStorage.setItem("stm_project_cache", JSON.stringify(futureData));
      expect(loadCachedProject()).toBeNull();
    });
  });

  describe("clearCachedProject", () => {
    it("removes the cache key", () => {
      localStorage.setItem("stm_project_cache", "data");
      clearCachedProject();
      expect(localStorage.getItem("stm_project_cache")).toBeNull();
    });

    it("does not throw if key does not exist", () => {
      expect(() => clearCachedProject()).not.toThrow();
    });
  });
});
