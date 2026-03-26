import { ProjectData, ProjectMetadata, Action, Actor } from "../types";

const MAX_HISTORY = 50;

// ---------------------------------------------------------------------------
// Action types (discriminated union)
// ---------------------------------------------------------------------------

export type ProjectAction =
  | { type: "INIT_PROJECT"; payload: ProjectData }
  | { type: "SAVE_ACTION"; payload: Action }
  | { type: "DELETE_ACTION"; payload: string }
  | { type: "SAVE_ACTOR"; payload: Actor }
  | { type: "DELETE_ACTOR"; payload: string }
  | {
      type: "SAVE_METADATA";
      payload: { metadata: ProjectMetadata; truncateActions: boolean };
    }
  | { type: "SET_FILTER"; payload: string | null }
  | { type: "CLEAR_ALL" }
  | { type: "UNDO" }
  | { type: "REDO" };

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface ProjectState {
  projectData: ProjectData | null;
  filteredActorId: string | null;
  /** Snapshots for undo (most recent last). */
  past: ProjectData[];
  /** Snapshots for redo (most recent first). */
  future: ProjectData[];
}

export const initialState: ProjectState = {
  projectData: null,
  filteredActorId: null,
  past: [],
  future: [],
};

// ---------------------------------------------------------------------------
// Helper: push current snapshot to history before mutating
// ---------------------------------------------------------------------------

function pushToHistory(past: ProjectData[], current: ProjectData): ProjectData[] {
  return [...past, current].slice(-MAX_HISTORY);
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function projectReducer(
  state: ProjectState,
  action: ProjectAction,
): ProjectState {
  switch (action.type) {
    // -- Initialisation (resets history) ------------------------------------
    case "INIT_PROJECT":
      return {
        ...state,
        projectData: action.payload,
        past: [],
        future: [],
      };

    // -- CRUD: Actions ------------------------------------------------------
    case "SAVE_ACTION": {
      if (!state.projectData) return state;
      const data = state.projectData;
      const exists = data.actions.some((a) => a.id === action.payload.id);
      const newData: ProjectData = {
        ...data,
        actions: exists
          ? data.actions.map((a) =>
              a.id === action.payload.id ? action.payload : a,
            )
          : [...data.actions, action.payload],
      };
      return {
        ...state,
        projectData: newData,
        past: pushToHistory(state.past, state.projectData),
        future: [],
      };
    }

    case "DELETE_ACTION": {
      if (!state.projectData) return state;
      const newData: ProjectData = {
        ...state.projectData,
        actions: state.projectData.actions.filter(
          (a) => a.id !== action.payload,
        ),
      };
      return {
        ...state,
        projectData: newData,
        past: pushToHistory(state.past, state.projectData),
        future: [],
      };
    }

    // -- CRUD: Actors -------------------------------------------------------
    case "SAVE_ACTOR": {
      if (!state.projectData) return state;
      const data = state.projectData;
      const exists = data.actors.some((a) => a.id === action.payload.id);
      const newData: ProjectData = {
        ...data,
        actors: exists
          ? data.actors.map((a) =>
              a.id === action.payload.id ? action.payload : a,
            )
          : [...data.actors, action.payload],
      };
      return {
        ...state,
        projectData: newData,
        past: pushToHistory(state.past, state.projectData),
        future: [],
      };
    }

    case "DELETE_ACTOR": {
      if (!state.projectData) return state;
      const data = state.projectData;
      const newActions = data.actions
        .map((a) => ({
          ...a,
          actorIds: a.actorIds.filter((id) => id !== action.payload),
        }))
        .filter((a) => a.actorIds.length > 0);

      const newData: ProjectData = {
        ...data,
        actors: data.actors.filter((a) => a.id !== action.payload),
        actions: newActions,
      };
      return {
        ...state,
        projectData: newData,
        past: pushToHistory(state.past, state.projectData),
        future: [],
        filteredActorId:
          state.filteredActorId === action.payload
            ? null
            : state.filteredActorId,
      };
    }

    // -- Metadata -----------------------------------------------------------
    case "SAVE_METADATA": {
      if (!state.projectData) return state;
      const { metadata, truncateActions } = action.payload;
      let newActions = state.projectData.actions;
      if (truncateActions) {
        newActions = state.projectData.actions
          .filter((a) => a.timeStart < metadata.durationSeconds)
          .map((a) => ({
            ...a,
            timeEnd: Math.min(a.timeEnd, metadata.durationSeconds),
          }));
      }
      const newData: ProjectData = {
        ...state.projectData,
        metadata,
        actions: newActions,
      };
      return {
        ...state,
        projectData: newData,
        past: pushToHistory(state.past, state.projectData),
        future: [],
      };
    }

    // -- UI-only (not undoable) ---------------------------------------------
    case "SET_FILTER":
      return { ...state, filteredActorId: action.payload };

    case "CLEAR_ALL":
      return { ...initialState };

    // -- Undo / Redo --------------------------------------------------------
    case "UNDO": {
      if (state.past.length === 0 || !state.projectData) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        projectData: previous,
        past: state.past.slice(0, -1),
        future: [state.projectData, ...state.future],
      };
    }

    case "REDO": {
      if (state.future.length === 0 || !state.projectData) return state;
      const next = state.future[0];
      return {
        ...state,
        projectData: next,
        past: [...state.past, state.projectData],
        future: state.future.slice(1),
      };
    }

    default:
      return state;
  }
}
