import { useState, useReducer, useEffect } from "react";
import type { ProjectData, ProjectMetadata, Cue, Track } from "../types";
import {
  saveCachedProject,
  loadCachedProject,
  clearCachedProject,
  isCacheAvailable,
} from "../utils/storage";
import { projectReducer, initialState } from "./projectReducer";

export function useProjectManager() {
  const [state, dispatch] = useReducer(projectReducer, initialState);
  const [cachedProject, setCachedProject] = useState<ProjectData | null>(null);
  const [cacheAvailable, setCacheAvailable] = useState(true);

  // Load cache on mount
  useEffect(() => {
    const available = isCacheAvailable();
    setCacheAvailable(available);
    if (!available) {
      console.warn("localStorage unavailable, auto-save disabled.");
      return;
    }
    const cached = loadCachedProject();
    if (cached) {
      setCachedProject(cached);
    }
  }, []);

  // Sync project data to cache
  useEffect(() => {
    if (state.projectData) {
      saveCachedProject(state.projectData);
    }
  }, [state.projectData]);

  // Warn before leaving only when there is genuinely unsaved work. With
  // auto-save on, every change is already persisted, so a prompt would be
  // noise; without it, closing the tab loses everything.
  useEffect(() => {
    if (cacheAvailable || !state.projectData) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy browsers require returnValue to be set.
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [cacheAvailable, state.projectData]);

  const initProject = (data: ProjectData) => {
    dispatch({ type: "INIT_PROJECT", payload: data });
  };

  /**
   * Clears the stored project and returns to the init screen.
   *
   * Confirmation is the caller's job — see `useConfirm`. Keeping it here would
   * force this hook to be async and couple it to a dialog component.
   */
  const clearCache = () => {
    clearCachedProject();
    setCachedProject(null);
    dispatch({ type: "CLEAR_ALL" });
  };

  const saveCue = (cue: Cue) => {
    dispatch({ type: "SAVE_CUE", payload: cue });
  };

  const deleteCue = (cueId: string) => {
    dispatch({ type: "DELETE_CUE", payload: cueId });
  };

  const saveTrack = (track: Track) => {
    dispatch({ type: "SAVE_TRACK", payload: track });
  };

  /** Also strips the track from every cue, and drops cues left with none. */
  const deleteTrack = (trackId: string) => {
    dispatch({ type: "DELETE_TRACK", payload: trackId });
  };

  const saveMetadata = (metadata: ProjectMetadata, truncateCues: boolean) => {
    dispatch({ type: "SAVE_METADATA", payload: { metadata, truncateCues } });
  };

  const setFilteredTrackId = (id: string | null) => {
    dispatch({ type: "SET_FILTER", payload: id });
  };

  const undo = () => dispatch({ type: "UNDO" });
  const redo = () => dispatch({ type: "REDO" });

  const maxCueEnd = state.projectData
    ? state.projectData.cues.reduce((max, cue) => Math.max(max, cue.timeEnd), 0)
    : 0;

  return {
    projectData: state.projectData,
    cachedProject,
    cacheAvailable,
    filteredTrackId: state.filteredTrackId,
    setFilteredTrackId,
    maxCueEnd,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    initProject,
    clearCache,
    saveCue,
    deleteCue,
    saveTrack,
    deleteTrack,
    saveMetadata,
    undo,
    redo,
  };
}
