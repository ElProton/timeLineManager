import { ProjectData } from "../types";
import { migrateProject } from "./migration";

const STORAGE_KEY = "stm_project_cache";

/**
 * Vérifie la disponibilité de localStorage via un cycle write/read/delete.
 * Retourne false si l'API est absente ou bloquée (navigation privée, etc.).
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
 * Sauvegarde le projet dans localStorage.
 * Échoue silencieusement si localStorage est indisponible ou plein (QuotaExceededError).
 */
export function saveCachedProject(data: ProjectData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to save to cache:", error);
  }
}

/**
 * Charge le projet depuis localStorage.
 *
 * @returns Le ProjectData désérialisé si le cache est valide, null sinon.
 *
 * Retourne null dans les cas suivants :
 * - Aucune donnée en cache
 * - JSON invalide (parse error)
 * - Structure ProjectData invalide (champs manquants ou types incorrects)
 *
 * Supprime automatiquement les entrées corrompues avant de retourner null.
 */
export function loadCachedProject(): ProjectData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;

    const parsed = JSON.parse(raw);
    const migrated = migrateProject(parsed);
    if (!migrated || !isValidProjectData(migrated)) {
      console.warn("Cached project data is corrupted, clearing cache.");
      clearCachedProject();
      return null;
    }

    return migrated as ProjectData;
  } catch {
    console.warn("Cached project data is corrupted, clearing cache.");
    clearCachedProject();
    return null;
  }
}

/**
 * Supprime l'entrée cache du localStorage.
 */
export function clearCachedProject(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear cache:", error);
  }
}

/**
 * Validation structurelle minimale d'un objet candidat ProjectData.
 * Vérifie la présence et le type des champs critiques sans valider
 * chaque action/acteur en profondeur (trade-off perf vs. exhaustivité).
 */
function isValidProjectData(data: unknown): data is ProjectData {
  if (data === null || typeof data !== "object") return false;

  const candidate = data as Record<string, unknown>;

  if (typeof candidate.schemaVersion !== "number" || candidate.schemaVersion < 1) {
    return false;
  }

  if (candidate.metadata === null || typeof candidate.metadata !== "object") {
    return false;
  }

  const metadata = candidate.metadata as Record<string, unknown>;
  if (typeof metadata.title !== "string" || metadata.title.trim() === "") {
    return false;
  }
  if (typeof metadata.musicName !== "string") return false;
  if (typeof metadata.durationSeconds !== "number" || metadata.durationSeconds <= 0) {
    return false;
  }

  if (!Array.isArray(candidate.actors)) return false;
  if (!Array.isArray(candidate.actions)) return false;

  return true;
}
