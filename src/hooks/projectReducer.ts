import type { ProjectData, ProjectMetadata, Cue, Track } from "../types";

const MAX_HISTORY = 50;

// ---------------------------------------------------------------------------
// Events (discriminated union)
//
// Named "event" rather than "action" throughout: in this codebase a Cue used to
// be called an Action, so `action.payload` and a domain action lived in the same
// scope and read identically. Keep the distinction explicit.
// ---------------------------------------------------------------------------

export type ProjectEvent =
  | { type: "INIT_PROJECT"; payload: ProjectData }
  | { type: "SAVE_CUE"; payload: Cue }
  | { type: "DELETE_CUE"; payload: string }
  | { type: "SAVE_TRACK"; payload: Track }
  | { type: "DELETE_TRACK"; payload: string }
  | {
      type: "SAVE_METADATA";
      payload: { metadata: ProjectMetadata; truncateCues: boolean };
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
  filteredTrackId: string | null;
  /** Snapshots for undo (most recent last). */
  past: ProjectData[];
  /** Snapshots for redo (most recent first). */
  future: ProjectData[];
}

export const initialState: ProjectState = {
  projectData: null,
  filteredTrackId: null,
  past: [],
  future: [],
};

// ---------------------------------------------------------------------------
// Helper: push current snapshot to history before mutating
// ---------------------------------------------------------------------------

function pushToHistory(
  past: ProjectData[],
  current: ProjectData,
): ProjectData[] {
  return [...past, current].slice(-MAX_HISTORY);
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function projectReducer(
  state: ProjectState,
  event: ProjectEvent,
): ProjectState {
  switch (event.type) {
    // -- Initialisation (resets history) ------------------------------------
    case "INIT_PROJECT":
      return {
        ...state,
        projectData: event.payload,
        past: [],
        future: [],
      };

    // -- CRUD: Cues ---------------------------------------------------------
    case "SAVE_CUE": {
      if (!state.projectData) return state;
      const data = state.projectData;
      const exists = data.cues.some((cue) => cue.id === event.payload.id);
      const newData: ProjectData = {
        ...data,
        cues: exists
          ? data.cues.map((cue) =>
              cue.id === event.payload.id ? event.payload : cue,
            )
          : [...data.cues, event.payload],
      };
      return {
        ...state,
        projectData: newData,
        past: pushToHistory(state.past, state.projectData),
        future: [],
      };
    }

    case "DELETE_CUE": {
      if (!state.projectData) return state;
      const newData: ProjectData = {
        ...state.projectData,
        cues: state.projectData.cues.filter((cue) => cue.id !== event.payload),
      };
      return {
        ...state,
        projectData: newData,
        past: pushToHistory(state.past, state.projectData),
        future: [],
      };
    }

    // -- CRUD: Tracks -------------------------------------------------------
    case "SAVE_TRACK": {
      if (!state.projectData) return state;
      const data = state.projectData;
      const exists = data.tracks.some((track) => track.id === event.payload.id);
      const newData: ProjectData = {
        ...data,
        tracks: exists
          ? data.tracks.map((track) =>
              track.id === event.payload.id ? event.payload : track,
            )
          : [...data.tracks, event.payload],
      };
      return {
        ...state,
        projectData: newData,
        past: pushToHistory(state.past, state.projectData),
        future: [],
      };
    }

    case "DELETE_TRACK": {
      if (!state.projectData) return state;
      const data = state.projectData;
      // Drop the track from every cue, then drop cues left with no track.
      const newCues = data.cues
        .map((cue) => ({
          ...cue,
          trackIds: cue.trackIds.filter((id) => id !== event.payload),
        }))
        .filter((cue) => cue.trackIds.length > 0);

      const newData: ProjectData = {
        ...data,
        tracks: data.tracks.filter((track) => track.id !== event.payload),
        cues: newCues,
      };
      return {
        ...state,
        projectData: newData,
        past: pushToHistory(state.past, state.projectData),
        future: [],
        filteredTrackId:
          state.filteredTrackId === event.payload
            ? null
            : state.filteredTrackId,
      };
    }

    // -- Metadata -----------------------------------------------------------
    case "SAVE_METADATA": {
      if (!state.projectData) return state;
      const { metadata, truncateCues } = event.payload;
      let newCues = state.projectData.cues;
      if (truncateCues) {
        newCues = state.projectData.cues
          .filter((cue) => cue.timeStart < metadata.durationSeconds)
          .map((cue) => ({
            ...cue,
            timeEnd: Math.min(cue.timeEnd, metadata.durationSeconds),
          }));
      }
      const newData: ProjectData = {
        ...state.projectData,
        metadata,
        cues: newCues,
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
      return { ...state, filteredTrackId: event.payload };

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
