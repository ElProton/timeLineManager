import type { ProjectData } from "../types";
import { migrateProject } from "./migration";
import { isValidProjectData } from "./validation";

/** Exported so tests do not have to repeat the literal. */
export const STORAGE_KEY = "stm_project_cache";

/**
 * Probes localStorage with a write/read/delete cycle.
 * False when the API is missing or blocked (private browsing, quota, policy).
 */
export function isCacheAvailable(): boolean {
  const testKey = `${STORAGE_KEY}_test`;
  try {
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Persists the project.
 * Fails silently when localStorage is unavailable or full: a storage problem
 * must never block the user mid-edit.
 */
export function saveCachedProject(data: ProjectData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to save to cache:", error);
  }
}

/**
 * Loads the cached project, migrating it if it was written by an older
 * version of the app.
 *
 * Returns null — and clears the corrupted entry — when there is no cache,
 * the JSON does not parse, the schema version is unsupported, or the
 * structure does not validate.
 */
export function loadCachedProject(): ProjectData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;

    const migrated = migrateProject(JSON.parse(raw));
    if (!isValidProjectData(migrated)) {
      console.warn("Cached project data is corrupted, clearing cache.");
      clearCachedProject();
      return null;
    }

    return migrated;
  } catch {
    console.warn("Cached project data is corrupted, clearing cache.");
    clearCachedProject();
    return null;
  }
}

/** Removes the cache entry. */
export function clearCachedProject(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear cache:", error);
  }
}
