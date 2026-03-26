import { describe, it, expect } from "vitest";
import {
  projectReducer,
  initialState,
  ProjectState,
} from "../hooks/projectReducer";
import { ProjectData, Action, Actor } from "../types";

const baseProject: ProjectData = {
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

function stateWith(projectData: ProjectData): ProjectState {
  return { ...initialState, projectData };
}

describe("projectReducer", () => {
  describe("INIT_PROJECT", () => {
    it("sets projectData and clears history", () => {
      const state: ProjectState = {
        ...initialState,
        past: [baseProject],
        future: [baseProject],
      };
      const result = projectReducer(state, {
        type: "INIT_PROJECT",
        payload: baseProject,
      });
      expect(result.projectData).toEqual(baseProject);
      expect(result.past).toEqual([]);
      expect(result.future).toEqual([]);
    });
  });

  describe("SAVE_ACTION", () => {
    it("adds a new action", () => {
      const state = stateWith(baseProject);
      const newAction: Action = {
        id: "act3",
        description: "Exit",
        timeStart: 60,
        timeEnd: 90,
        actorIds: ["a2"],
        color: "#22c55e",
      };
      const result = projectReducer(state, {
        type: "SAVE_ACTION",
        payload: newAction,
      });
      expect(result.projectData!.actions).toHaveLength(3);
      expect(result.projectData!.actions[2]).toEqual(newAction);
    });

    it("updates an existing action", () => {
      const state = stateWith(baseProject);
      const updated: Action = {
        ...baseProject.actions[0],
        description: "Updated",
      };
      const result = projectReducer(state, {
        type: "SAVE_ACTION",
        payload: updated,
      });
      expect(result.projectData!.actions).toHaveLength(2);
      expect(result.projectData!.actions[0].description).toBe("Updated");
    });

    it("pushes to history and clears future", () => {
      const state: ProjectState = {
        ...stateWith(baseProject),
        future: [baseProject],
      };
      const newAction: Action = {
        id: "act3",
        description: "X",
        timeStart: 0,
        timeEnd: 10,
        actorIds: ["a1"],
        color: "#000",
      };
      const result = projectReducer(state, {
        type: "SAVE_ACTION",
        payload: newAction,
      });
      expect(result.past).toHaveLength(1);
      expect(result.past[0]).toEqual(baseProject);
      expect(result.future).toEqual([]);
    });

    it("does nothing when projectData is null", () => {
      const result = projectReducer(initialState, {
        type: "SAVE_ACTION",
        payload: baseProject.actions[0],
      });
      expect(result).toBe(initialState);
    });
  });

  describe("DELETE_ACTION", () => {
    it("removes the action", () => {
      const state = stateWith(baseProject);
      const result = projectReducer(state, {
        type: "DELETE_ACTION",
        payload: "act1",
      });
      expect(result.projectData!.actions).toHaveLength(1);
      expect(result.projectData!.actions[0].id).toBe("act2");
    });

    it("pushes to history", () => {
      const state = stateWith(baseProject);
      const result = projectReducer(state, {
        type: "DELETE_ACTION",
        payload: "act1",
      });
      expect(result.past).toHaveLength(1);
    });
  });

  describe("SAVE_ACTOR", () => {
    it("adds a new actor", () => {
      const state = stateWith(baseProject);
      const newActor: Actor = { id: "a3", name: "Charlie" };
      const result = projectReducer(state, {
        type: "SAVE_ACTOR",
        payload: newActor,
      });
      expect(result.projectData!.actors).toHaveLength(3);
    });

    it("updates an existing actor", () => {
      const state = stateWith(baseProject);
      const result = projectReducer(state, {
        type: "SAVE_ACTOR",
        payload: { id: "a1", name: "Alicia" },
      });
      expect(result.projectData!.actors[0].name).toBe("Alicia");
      expect(result.projectData!.actors).toHaveLength(2);
    });
  });

  describe("DELETE_ACTOR", () => {
    it("removes actor and cleans up orphan actions", () => {
      const state = stateWith(baseProject);
      const result = projectReducer(state, {
        type: "DELETE_ACTOR",
        payload: "a1",
      });
      expect(result.projectData!.actors).toHaveLength(1);
      expect(result.projectData!.actors[0].id).toBe("a2");
      // act1 had only a1, act2 had a1+a2
      expect(result.projectData!.actions).toHaveLength(1);
      expect(result.projectData!.actions[0].actorIds).toEqual(["a2"]);
    });

    it("resets filteredActorId when deleted actor was filtered", () => {
      const state: ProjectState = {
        ...stateWith(baseProject),
        filteredActorId: "a1",
      };
      const result = projectReducer(state, {
        type: "DELETE_ACTOR",
        payload: "a1",
      });
      expect(result.filteredActorId).toBeNull();
    });

    it("keeps filteredActorId when a different actor is deleted", () => {
      const state: ProjectState = {
        ...stateWith(baseProject),
        filteredActorId: "a2",
      };
      const result = projectReducer(state, {
        type: "DELETE_ACTOR",
        payload: "a1",
      });
      expect(result.filteredActorId).toBe("a2");
    });
  });

  describe("SAVE_METADATA", () => {
    it("updates metadata without truncation", () => {
      const state = stateWith(baseProject);
      const newMeta = {
        title: "New",
        musicName: "Track",
        durationSeconds: 300,
      };
      const result = projectReducer(state, {
        type: "SAVE_METADATA",
        payload: { metadata: newMeta, truncateActions: false },
      });
      expect(result.projectData!.metadata).toEqual(newMeta);
      expect(result.projectData!.actions).toHaveLength(2);
    });

    it("truncates actions when duration is reduced", () => {
      const state = stateWith(baseProject);
      const newMeta = {
        title: "Show",
        musicName: "Song",
        durationSeconds: 20,
      };
      const result = projectReducer(state, {
        type: "SAVE_METADATA",
        payload: { metadata: newMeta, truncateActions: true },
      });
      expect(result.projectData!.actions).toHaveLength(2);
      expect(result.projectData!.actions[0].timeEnd).toBe(20);
      expect(result.projectData!.actions[1].timeEnd).toBe(20);
    });

    it("removes actions starting after new duration", () => {
      const project: ProjectData = {
        ...baseProject,
        actions: [
          ...baseProject.actions,
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
      const state = stateWith(project);
      const newMeta = {
        title: "Show",
        musicName: "Song",
        durationSeconds: 100,
      };
      const result = projectReducer(state, {
        type: "SAVE_METADATA",
        payload: { metadata: newMeta, truncateActions: true },
      });
      expect(result.projectData!.actions).toHaveLength(2);
    });
  });

  describe("SET_FILTER", () => {
    it("sets filteredActorId", () => {
      const result = projectReducer(initialState, {
        type: "SET_FILTER",
        payload: "a1",
      });
      expect(result.filteredActorId).toBe("a1");
    });

    it("clears filteredActorId", () => {
      const state: ProjectState = {
        ...initialState,
        filteredActorId: "a1",
      };
      const result = projectReducer(state, {
        type: "SET_FILTER",
        payload: null,
      });
      expect(result.filteredActorId).toBeNull();
    });

    it("does not affect history", () => {
      const state = stateWith(baseProject);
      const result = projectReducer(state, {
        type: "SET_FILTER",
        payload: "a1",
      });
      expect(result.past).toEqual([]);
      expect(result.future).toEqual([]);
    });
  });

  describe("CLEAR_ALL", () => {
    it("resets to initial state", () => {
      const state: ProjectState = {
        projectData: baseProject,
        filteredActorId: "a1",
        past: [baseProject],
        future: [baseProject],
      };
      const result = projectReducer(state, { type: "CLEAR_ALL" });
      expect(result).toEqual(initialState);
    });
  });

  describe("UNDO", () => {
    it("restores previous state from past", () => {
      const previousProject: ProjectData = {
        ...baseProject,
        actions: [],
      };
      const state: ProjectState = {
        projectData: baseProject,
        filteredActorId: null,
        past: [previousProject],
        future: [],
      };
      const result = projectReducer(state, { type: "UNDO" });
      expect(result.projectData).toEqual(previousProject);
      expect(result.past).toEqual([]);
      expect(result.future).toEqual([baseProject]);
    });

    it("does nothing when past is empty", () => {
      const state = stateWith(baseProject);
      const result = projectReducer(state, { type: "UNDO" });
      expect(result).toBe(state);
    });

    it("does nothing when projectData is null", () => {
      const result = projectReducer(initialState, { type: "UNDO" });
      expect(result).toBe(initialState);
    });

    it("handles multiple undos", () => {
      const v1: ProjectData = { ...baseProject, actions: [] };
      const v2: ProjectData = {
        ...baseProject,
        actors: [{ id: "a1", name: "Alice" }],
      };
      const state: ProjectState = {
        projectData: baseProject,
        filteredActorId: null,
        past: [v1, v2],
        future: [],
      };

      const after1 = projectReducer(state, { type: "UNDO" });
      expect(after1.projectData).toEqual(v2);
      expect(after1.past).toEqual([v1]);

      const after2 = projectReducer(after1, { type: "UNDO" });
      expect(after2.projectData).toEqual(v1);
      expect(after2.past).toEqual([]);
    });
  });

  describe("REDO", () => {
    it("restores next state from future", () => {
      const futureProject: ProjectData = {
        ...baseProject,
        actions: [...baseProject.actions],
      };
      const currentProject: ProjectData = { ...baseProject, actions: [] };
      const state: ProjectState = {
        projectData: currentProject,
        filteredActorId: null,
        past: [],
        future: [futureProject],
      };
      const result = projectReducer(state, { type: "REDO" });
      expect(result.projectData).toEqual(futureProject);
      expect(result.future).toEqual([]);
      expect(result.past).toEqual([currentProject]);
    });

    it("does nothing when future is empty", () => {
      const state = stateWith(baseProject);
      const result = projectReducer(state, { type: "REDO" });
      expect(result).toBe(state);
    });
  });

  describe("history limits", () => {
    it("caps past stack at MAX_HISTORY (50)", () => {
      let state = stateWith(baseProject);
      for (let i = 0; i < 60; i++) {
        state = projectReducer(state, {
          type: "SAVE_ACTION",
          payload: {
            id: `act-${i}`,
            description: `Action ${i}`,
            timeStart: 0,
            timeEnd: 10,
            actorIds: ["a1"],
            color: "#000",
          },
        });
      }
      expect(state.past.length).toBeLessThanOrEqual(50);
    });
  });

  describe("undo then new action clears future", () => {
    it("clears redo stack on new mutation", () => {
      const state = stateWith(baseProject);

      // Perform an action
      const s1 = projectReducer(state, {
        type: "SAVE_ACTION",
        payload: {
          id: "act3",
          description: "X",
          timeStart: 0,
          timeEnd: 10,
          actorIds: ["a1"],
          color: "#000",
        },
      });
      expect(s1.past).toHaveLength(1);

      // Undo
      const s2 = projectReducer(s1, { type: "UNDO" });
      expect(s2.future).toHaveLength(1);

      // New action should clear future
      const s3 = projectReducer(s2, {
        type: "SAVE_ACTOR",
        payload: { id: "a3", name: "Charlie" },
      });
      expect(s3.future).toEqual([]);
    });
  });
});
