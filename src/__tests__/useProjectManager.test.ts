import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectManager } from "../hooks/useProjectManager";
import type { Cue, ProjectData, Track } from "../types";
import { makeProject, makeCue, makeTrack } from "./fixtures";

// Mock storage module
vi.mock("../utils/storage", () => ({
  isCacheAvailable: vi.fn(() => true),
  loadCachedProject: vi.fn(() => null),
  saveCachedProject: vi.fn(),
  clearCachedProject: vi.fn(),
}));

import {
  isCacheAvailable,
  loadCachedProject,
  saveCachedProject,
  clearCachedProject,
} from "../utils/storage";

const mockProject = makeProject();

describe("useProjectManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isCacheAvailable).mockReturnValue(true);
  });

  it("starts with null projectData", () => {
    const { result } = renderHook(() => useProjectManager());
    expect(result.current.projectData).toBeNull();
  });

  it("loads cached project on mount", () => {
    vi.mocked(loadCachedProject).mockReturnValue(mockProject);
    const { result } = renderHook(() => useProjectManager());
    expect(result.current.cachedProject).toEqual(mockProject);
  });

  it("initProject sets projectData", () => {
    const { result } = renderHook(() => useProjectManager());
    act(() => result.current.initProject(mockProject));
    expect(result.current.projectData).toEqual(mockProject);
  });

  it("syncs projectData to cache on change", () => {
    const { result } = renderHook(() => useProjectManager());
    act(() => result.current.initProject(mockProject));
    expect(saveCachedProject).toHaveBeenCalledWith(mockProject);
  });

  describe("saveCue", () => {
    it("adds a new cue", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      const newCue: Cue = makeCue({
        id: "c3",
        description: "Exit",
        timeStart: 60,
        timeEnd: 90,
        trackIds: ["t2"],
        color: "#22c55e",
      });
      act(() => result.current.saveCue(newCue));

      expect(result.current.projectData!.cues).toHaveLength(3);
      expect(result.current.projectData!.cues[2]).toEqual(newCue);
    });

    it("updates an existing cue", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      const updated: Cue = {
        ...mockProject.cues[0],
        description: "Updated",
      };
      act(() => result.current.saveCue(updated));

      expect(result.current.projectData!.cues).toHaveLength(2);
      expect(result.current.projectData!.cues[0].description).toBe("Updated");
    });
  });

  describe("deleteCue", () => {
    it("removes the cue", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));
      act(() => result.current.deleteCue("c1"));

      expect(result.current.projectData!.cues).toHaveLength(1);
      expect(result.current.projectData!.cues[0].id).toBe("c2");
    });

    it("ignores an unknown id", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));
      act(() => result.current.deleteCue("nope"));

      expect(result.current.projectData!.cues).toHaveLength(2);
    });
  });

  describe("saveTrack", () => {
    it("adds a new track", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      const newTrack: Track = makeTrack({ id: "t3", name: "Charlie" });
      act(() => result.current.saveTrack(newTrack));

      expect(result.current.projectData!.tracks).toHaveLength(3);
    });

    it("updates an existing track", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      act(() => result.current.saveTrack({ id: "t1", name: "Alicia" }));

      expect(result.current.projectData!.tracks[0].name).toBe("Alicia");
      expect(result.current.projectData!.tracks).toHaveLength(2);
    });
  });

  describe("deleteTrack", () => {
    it("removes track and cleans up orphan cues", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      // Delete Alice (a1) — act1 has only a1, act2 has a1+a2
      act(() => result.current.deleteTrack("t1"));

      expect(result.current.projectData!.tracks).toHaveLength(1);
      expect(result.current.projectData!.tracks[0].id).toBe("t2");

      // act1 should be removed (only had a1), act2 should remain with only a2
      expect(result.current.projectData!.cues).toHaveLength(1);
      expect(result.current.projectData!.cues[0].id).toBe("c2");
      expect(result.current.projectData!.cues[0].trackIds).toEqual(["t2"]);
    });

    it("resets filteredTrackId if deleted track was filtered", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));
      act(() => result.current.setFilteredTrackId("t1"));
      expect(result.current.filteredTrackId).toBe("t1");

      act(() => result.current.deleteTrack("t1"));
      expect(result.current.filteredTrackId).toBeNull();
    });
  });

  describe("saveMetadata", () => {
    it("updates metadata without truncation", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      const newMeta = {
        title: "New",
        soundtrack: "Track",
        durationSeconds: 300,
      };
      act(() => result.current.saveMetadata(newMeta, false));

      expect(result.current.projectData!.metadata).toEqual(newMeta);
      expect(result.current.projectData!.cues).toHaveLength(2);
    });

    it("truncates cues when duration is reduced", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      // Reduce duration to 20s — act1 ends at 30, act2 starts at 10 ends at 60
      const newMeta = {
        title: "Show",
        soundtrack: "Song",
        durationSeconds: 20,
      };
      act(() => result.current.saveMetadata(newMeta, true));

      // act1 starts at 0 < 20, should remain but timeEnd clamped to 20
      // act2 starts at 10 < 20, should remain but timeEnd clamped to 20
      expect(result.current.projectData!.cues).toHaveLength(2);
      expect(result.current.projectData!.cues[0].timeEnd).toBe(20);
      expect(result.current.projectData!.cues[1].timeEnd).toBe(20);
    });

    it("removes cues that start after new duration", () => {
      const { result } = renderHook(() => useProjectManager());

      const project: ProjectData = {
        ...mockProject,
        cues: [
          ...mockProject.cues,
          makeCue({
            id: "c3",
            description: "Late",
            timeStart: 170,
            timeEnd: 180,
            trackIds: ["t1"],
            color: "#000000",
          }),
        ],
      };
      act(() => result.current.initProject(project));

      const newMeta = {
        title: "Show",
        soundtrack: "Song",
        durationSeconds: 100,
      };
      act(() => result.current.saveMetadata(newMeta, true));

      // act3 starts at 170 >= 100, should be removed
      expect(result.current.projectData!.cues).toHaveLength(2);
    });
  });

  describe("maxCueEnd", () => {
    it("is 0 when no project", () => {
      const { result } = renderHook(() => useProjectManager());
      expect(result.current.maxCueEnd).toBe(0);
    });

    it("returns the latest timeEnd", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));
      expect(result.current.maxCueEnd).toBe(60);
    });
  });

  describe("clearCache", () => {
    it("resets all state", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));
      act(() => result.current.setFilteredTrackId("t1"));

      act(() => result.current.clearCache());

      expect(clearCachedProject).toHaveBeenCalled();
      expect(result.current.projectData).toBeNull();
      expect(result.current.cachedProject).toBeNull();
      expect(result.current.filteredTrackId).toBeNull();
    });
  });

  describe("cache availability", () => {
    it("reports the cache as available and loads from it", () => {
      vi.mocked(loadCachedProject).mockReturnValue(mockProject);
      const { result } = renderHook(() => useProjectManager());

      expect(result.current.cacheAvailable).toBe(true);
      expect(result.current.cachedProject).toEqual(mockProject);
    });

    it("skips loading and warns when storage is blocked", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(isCacheAvailable).mockReturnValue(false);

      const { result } = renderHook(() => useProjectManager());

      expect(result.current.cacheAvailable).toBe(false);
      expect(loadCachedProject).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        "localStorage unavailable, auto-save disabled.",
      );
      warn.mockRestore();
    });
  });

  describe("filteredTrackId", () => {
    it("defaults to null", () => {
      const { result } = renderHook(() => useProjectManager());
      expect(result.current.filteredTrackId).toBeNull();
    });

    it("can be set and cleared", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.setFilteredTrackId("t1"));
      expect(result.current.filteredTrackId).toBe("t1");

      act(() => result.current.setFilteredTrackId(null));
      expect(result.current.filteredTrackId).toBeNull();
    });
  });

  describe("undo / redo", () => {
    it("starts with canUndo and canRedo as false", () => {
      const { result } = renderHook(() => useProjectManager());
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it("can undo after saving a cue", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      const newAction: Cue = {
        id: "act3",
        description: "Exit",
        timeStart: 60,
        timeEnd: 90,
        trackIds: ["t2"],
        color: "#22c55e",
      };
      act(() => result.current.saveCue(newAction));
      expect(result.current.canUndo).toBe(true);
      expect(result.current.projectData!.cues).toHaveLength(3);

      act(() => result.current.undo());
      expect(result.current.projectData!.cues).toHaveLength(2);
      expect(result.current.canRedo).toBe(true);
    });

    it("can redo after undo", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      const newTrack: Track = makeTrack({ id: "t3", name: "Charlie" });
      act(() => result.current.saveTrack(newTrack));
      act(() => result.current.undo());
      expect(result.current.projectData!.tracks).toHaveLength(2);

      act(() => result.current.redo());
      expect(result.current.projectData!.tracks).toHaveLength(3);
      expect(result.current.canRedo).toBe(false);
    });

    it("clears redo stack on new mutation after undo", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      act(() => result.current.saveTrack({ id: "a3", name: "Charlie" }));
      act(() => result.current.undo());
      expect(result.current.canRedo).toBe(true);

      act(() => result.current.saveTrack({ id: "a4", name: "Dave" }));
      expect(result.current.canRedo).toBe(false);
    });

    it("initProject resets undo/redo history", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));
      act(() => result.current.saveTrack({ id: "a3", name: "Charlie" }));
      expect(result.current.canUndo).toBe(true);

      act(() => result.current.initProject(mockProject));
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });
});
