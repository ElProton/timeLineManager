import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectManager } from "../hooks/useProjectManager";
import { ProjectData, Action, Actor } from "../types";

// Mock storage module
vi.mock("../utils/storage", () => ({
  loadCachedProject: vi.fn(() => null),
  saveCachedProject: vi.fn(),
  clearCachedProject: vi.fn(),
}));

import {
  loadCachedProject,
  saveCachedProject,
  clearCachedProject,
} from "../utils/storage";

const mockProject: ProjectData = {
  schemaVersion: 1,
  metadata: { title: "Show", musicName: "Song", durationSeconds: 180 },
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

describe("useProjectManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
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

  describe("saveAction", () => {
    it("adds a new action", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      const newAction: Action = {
        id: "act3",
        description: "Exit",
        timeStart: 60,
        timeEnd: 90,
        actorIds: ["a2"],
        color: "#22c55e",
      };
      act(() => result.current.saveAction(newAction));

      expect(result.current.projectData!.actions).toHaveLength(3);
      expect(result.current.projectData!.actions[2]).toEqual(newAction);
    });

    it("updates an existing action", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      const updated: Action = { ...mockProject.actions[0], description: "Updated" };
      act(() => result.current.saveAction(updated));

      expect(result.current.projectData!.actions).toHaveLength(2);
      expect(result.current.projectData!.actions[0].description).toBe("Updated");
    });
  });

  describe("deleteAction", () => {
    it("removes the action when confirmed", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));
      act(() => result.current.deleteAction("act1"));

      expect(result.current.projectData!.actions).toHaveLength(1);
      expect(result.current.projectData!.actions[0].id).toBe("act2");
    });

    it("does not remove when confirm is cancelled", () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));
      act(() => result.current.deleteAction("act1"));

      expect(result.current.projectData!.actions).toHaveLength(2);
    });
  });

  describe("saveActor", () => {
    it("adds a new actor", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      const newActor: Actor = { id: "a3", name: "Charlie" };
      act(() => result.current.saveActor(newActor));

      expect(result.current.projectData!.actors).toHaveLength(3);
    });

    it("updates an existing actor", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      act(() => result.current.saveActor({ id: "a1", name: "Alicia" }));

      expect(result.current.projectData!.actors[0].name).toBe("Alicia");
      expect(result.current.projectData!.actors).toHaveLength(2);
    });
  });

  describe("deleteActor", () => {
    it("removes actor and cleans up orphan actions", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      // Delete Alice (a1) — act1 has only a1, act2 has a1+a2
      act(() => result.current.deleteActor("a1"));

      expect(result.current.projectData!.actors).toHaveLength(1);
      expect(result.current.projectData!.actors[0].id).toBe("a2");

      // act1 should be removed (only had a1), act2 should remain with only a2
      expect(result.current.projectData!.actions).toHaveLength(1);
      expect(result.current.projectData!.actions[0].id).toBe("act2");
      expect(result.current.projectData!.actions[0].actorIds).toEqual(["a2"]);
    });

    it("resets filteredActorId if deleted actor was filtered", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));
      act(() => result.current.setFilteredActorId("a1"));
      expect(result.current.filteredActorId).toBe("a1");

      act(() => result.current.deleteActor("a1"));
      expect(result.current.filteredActorId).toBeNull();
    });
  });

  describe("saveMetadata", () => {
    it("updates metadata without truncation", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      const newMeta = { title: "New", musicName: "Track", durationSeconds: 300 };
      act(() => result.current.saveMetadata(newMeta, false));

      expect(result.current.projectData!.metadata).toEqual(newMeta);
      expect(result.current.projectData!.actions).toHaveLength(2);
    });

    it("truncates actions when duration is reduced", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      // Reduce duration to 20s — act1 ends at 30, act2 starts at 10 ends at 60
      const newMeta = { title: "Show", musicName: "Song", durationSeconds: 20 };
      act(() => result.current.saveMetadata(newMeta, true));

      // act1 starts at 0 < 20, should remain but timeEnd clamped to 20
      // act2 starts at 10 < 20, should remain but timeEnd clamped to 20
      expect(result.current.projectData!.actions).toHaveLength(2);
      expect(result.current.projectData!.actions[0].timeEnd).toBe(20);
      expect(result.current.projectData!.actions[1].timeEnd).toBe(20);
    });

    it("removes actions that start after new duration", () => {
      const { result } = renderHook(() => useProjectManager());

      const project: ProjectData = {
        ...mockProject,
        actions: [
          ...mockProject.actions,
          {
            id: "act3",
            description: "Late",
            timeStart: 170,
            timeEnd: 180,
            actorIds: ["a1"],
            color: "#000",
          },
        ],
      };
      act(() => result.current.initProject(project));

      const newMeta = { title: "Show", musicName: "Song", durationSeconds: 100 };
      act(() => result.current.saveMetadata(newMeta, true));

      // act3 starts at 170 >= 100, should be removed
      expect(result.current.projectData!.actions).toHaveLength(2);
    });
  });

  describe("maxActionEnd", () => {
    it("is 0 when no project", () => {
      const { result } = renderHook(() => useProjectManager());
      expect(result.current.maxActionEnd).toBe(0);
    });

    it("returns the latest timeEnd", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));
      expect(result.current.maxActionEnd).toBe(60);
    });
  });

  describe("clearCache", () => {
    it("resets all state when confirmed", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));
      act(() => result.current.setFilteredActorId("a1"));

      act(() => result.current.clearCache());

      expect(clearCachedProject).toHaveBeenCalled();
      expect(result.current.projectData).toBeNull();
      expect(result.current.cachedProject).toBeNull();
      expect(result.current.filteredActorId).toBeNull();
    });

    it("does nothing when confirm is cancelled", () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      act(() => result.current.clearCache());
      expect(result.current.projectData).toEqual(mockProject);
    });
  });

  describe("filteredActorId", () => {
    it("defaults to null", () => {
      const { result } = renderHook(() => useProjectManager());
      expect(result.current.filteredActorId).toBeNull();
    });

    it("can be set and cleared", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.setFilteredActorId("a1"));
      expect(result.current.filteredActorId).toBe("a1");

      act(() => result.current.setFilteredActorId(null));
      expect(result.current.filteredActorId).toBeNull();
    });
  });

  describe("undo / redo", () => {
    it("starts with canUndo and canRedo as false", () => {
      const { result } = renderHook(() => useProjectManager());
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it("can undo after saving an action", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      const newAction: Action = {
        id: "act3",
        description: "Exit",
        timeStart: 60,
        timeEnd: 90,
        actorIds: ["a2"],
        color: "#22c55e",
      };
      act(() => result.current.saveAction(newAction));
      expect(result.current.canUndo).toBe(true);
      expect(result.current.projectData!.actions).toHaveLength(3);

      act(() => result.current.undo());
      expect(result.current.projectData!.actions).toHaveLength(2);
      expect(result.current.canRedo).toBe(true);
    });

    it("can redo after undo", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      const newActor: Actor = { id: "a3", name: "Charlie" };
      act(() => result.current.saveActor(newActor));
      act(() => result.current.undo());
      expect(result.current.projectData!.actors).toHaveLength(2);

      act(() => result.current.redo());
      expect(result.current.projectData!.actors).toHaveLength(3);
      expect(result.current.canRedo).toBe(false);
    });

    it("clears redo stack on new mutation after undo", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));

      act(() => result.current.saveActor({ id: "a3", name: "Charlie" }));
      act(() => result.current.undo());
      expect(result.current.canRedo).toBe(true);

      act(() => result.current.saveActor({ id: "a4", name: "Dave" }));
      expect(result.current.canRedo).toBe(false);
    });

    it("initProject resets undo/redo history", () => {
      const { result } = renderHook(() => useProjectManager());
      act(() => result.current.initProject(mockProject));
      act(() => result.current.saveActor({ id: "a3", name: "Charlie" }));
      expect(result.current.canUndo).toBe(true);

      act(() => result.current.initProject(mockProject));
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });
});
