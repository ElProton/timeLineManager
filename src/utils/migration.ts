import { CURRENT_SCHEMA_VERSION } from "../types";

/**
 * Migrates raw parsed JSON from any previous schema version to the current version.
 * Returns the migrated data object, or null if the data is unrecoverable.
 *
 * Migration chain:
 *   v0 (pre-versioning) → v1 : adds schemaVersion field
 *   Future versions: add incremental steps here.
 */
export function migrateProject(data: unknown): Record<string, unknown> | null {
  if (data === null || typeof data !== "object") return null;

  const record = data as Record<string, unknown>;
  let version =
    typeof record.schemaVersion === "number" ? record.schemaVersion : 0;

  // v0 → v1: Legacy data without schemaVersion — just stamp it.
  if (version === 0) {
    record.schemaVersion = 1;
    version = 1;
  }

  // Future migrations:
  // if (version === 1) { /* transform v1 → v2 */ version = 2; }

  if (version !== CURRENT_SCHEMA_VERSION) {
    console.warn(`Unsupported schema version: ${version}`);
    return null;
  }

  return record;
}
