import { CURRENT_SCHEMA_VERSION } from "../types";

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * v1 → v2: rename the show-production vocabulary to a generic one.
 *
 *   actors            → tracks
 *   actions           → cues
 *   action.actorIds   → cue.trackIds
 *   metadata.musicName (required) → metadata.soundtrack (optional)
 *
 * Every object is rebuilt field by field rather than deep-cloned, so the input
 * is left untouched. Unknown fields are carried over deliberately, so a file
 * written by a newer minor revision does not lose data on the way through.
 *
 * The original reason for not deep-cloning was that jsdom had no
 * `structuredClone`. The version this project tests against does, so that no
 * longer applies — but a migration that states each version's shape explicitly
 * is worth more than one that copies a blob, so this stays as it is.
 */
function v1ToV2(record: Raw): Raw {
  const { musicName, ...restMetadata } = isRecord(record.metadata)
    ? record.metadata
    : {};

  const metadata: Raw = { ...restMetadata };
  if (typeof musicName === "string" && musicName.trim() !== "") {
    metadata.soundtrack = musicName;
  }

  const tracks = Array.isArray(record.actors)
    ? record.actors.map((actor) => (isRecord(actor) ? { ...actor } : actor))
    : [];

  const cues = Array.isArray(record.actions)
    ? record.actions.map((action) => {
        if (!isRecord(action)) return action;
        const { actorIds, ...restCue } = action;
        return {
          ...restCue,
          trackIds: Array.isArray(actorIds) ? [...actorIds] : [],
        };
      })
    : [];

  const { actors: _actors, actions: _actions, ...rest } = record;

  return { ...rest, schemaVersion: 2, metadata, tracks, cues };
}

/**
 * Migrates raw parsed JSON from any previous schema version to the current one.
 * Returns the migrated data, or null if the data is unrecoverable.
 *
 * Migration chain:
 *   v0 (pre-versioning) → v1 : stamps schemaVersion
 *   v1                  → v2 : generic vocabulary (see `v1ToV2`)
 *
 * The input is never mutated: each step returns a new object. Callers pass in
 * freshly parsed JSON that they may also hold a reference to, and an earlier
 * version of this function wrote `schemaVersion` straight onto that object.
 *
 * This only handles versioning, not structural validity — that is the job of
 * `isValidProjectData` in `utils/validation.ts`.
 */
export function migrateProject(data: unknown): Raw | null {
  if (!isRecord(data)) return null;

  let record: Raw = { ...data };
  let version =
    typeof record.schemaVersion === "number" ? record.schemaVersion : 0;

  // v0 → v1: legacy data without a version — just stamp it.
  if (version === 0) {
    record = { ...record, schemaVersion: 1 };
    version = 1;
  }

  if (version === 1) {
    record = v1ToV2(record);
    version = 2;
  }

  if (version !== CURRENT_SCHEMA_VERSION) {
    console.warn(`Unsupported schema version: ${version}`);
    return null;
  }

  return record;
}
