import { useState, useReducer, useEffect } from "react";
import { ProjectData, ProjectMetadata, Action, Actor } from "../types";
import {
  saveCachedProject,
  loadCachedProject,
  clearCachedProject,
} from "../utils/storage";
import { projectReducer, initialState } from "./projectReducer";

export function useProjectManager() {
  const [state, dispatch] = useReducer(projectReducer, initialState);
  const [cachedProject, setCachedProject] = useState<ProjectData | null>(null);

  // Load cache on mount
  useEffect(() => {
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

  const initProject = (data: ProjectData) => {
    dispatch({ type: "INIT_PROJECT", payload: data });
  };

  const clearCache = () => {
    if (!confirm("Clear saved data and start over?")) return;
    clearCachedProject();
    setCachedProject(null);
    dispatch({ type: "CLEAR_ALL" });
  };

  const saveAction = (action: Action) => {
    dispatch({ type: "SAVE_ACTION", payload: action });
  };

  const deleteAction = (actionId: string) => {
    if (!confirm("Are you sure you want to delete this action?")) return;
    dispatch({ type: "DELETE_ACTION", payload: actionId });
  };

  const saveActor = (actor: Actor) => {
    dispatch({ type: "SAVE_ACTOR", payload: actor });
  };

  const deleteActor = (actorId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this actor? Actions associated only with this actor will be removed.",
      )
    )
      return;
    dispatch({ type: "DELETE_ACTOR", payload: actorId });
  };

  const saveMetadata = (
    metadata: ProjectMetadata,
    truncateActions: boolean,
  ) => {
    dispatch({ type: "SAVE_METADATA", payload: { metadata, truncateActions } });
  };

  const setFilteredActorId = (id: string | null) => {
    dispatch({ type: "SET_FILTER", payload: id });
  };

  const undo = () => dispatch({ type: "UNDO" });
  const redo = () => dispatch({ type: "REDO" });

  const maxActionEnd = state.projectData
    ? state.projectData.actions.reduce((max, a) => Math.max(max, a.timeEnd), 0)
    : 0;

  return {
    projectData: state.projectData,
    cachedProject,
    filteredActorId: state.filteredActorId,
    setFilteredActorId,
    maxActionEnd,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    initProject,
    clearCache,
    saveAction,
    deleteAction,
    saveActor,
    deleteActor,
    saveMetadata,
    undo,
    redo,
  };
}
