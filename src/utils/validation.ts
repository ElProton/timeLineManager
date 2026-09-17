import { MAX_DURATION_SECONDS } from "../types";
import type { ProjectData } from "../types";

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isValidTrack(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id) && typeof value.name === "string";
}

function isValidCue(value: unknown, trackIds: Set<string>): boolean {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.id)) return false;
  if (typeof value.description !== "string") return false;

  const { timeStart, timeEnd } = value;
  if (typeof timeStart !== "number" || !Number.isFinite(timeStart))
    return false;
  if (typeof timeEnd !== "number" || !Number.isFinite(timeEnd)) return false;
  if (timeStart < 0 || timeEnd <= timeStart) return false;

  if (!Array.isArray(value.trackIds)) return false;
  // Every referenced track must exist, otherwise the cue renders on no row and
  // silently disappears.
  if (!value.trackIds.every((id) => typeof id === "string" && trackIds.has(id)))
    return false;

  return typeof value.color === "string" && HEX_COLOR.test(value.color);
}

/**
 * Structural validation of a candidate ProjectData.
 *
 * This is the single gate for untrusted data, used both by the cache and by
 * file import. It runs after `migrateProject`, so it only ever sees data
 * claiming to be the current schema version.
 *
 * Validation is deliberately thorough rather than cheap: the file import path
 * accepts a JSON file from anywhere, and a malformed cue renders as a block
 * with a NaN width or vanishes without explanation.
 */
export function isValidProjectData(data: unknown): data is ProjectData {
  if (!isRecord(data)) return false;

  if (
    typeof data.schemaVersion !== "number" ||
    !Number.isInteger(data.schemaVersion) ||
    data.schemaVersion < 1
  ) {
    return false;
  }

  if (!isRecord(data.metadata)) return false;
  const metadata = data.metadata;

  if (!isNonEmptyString(metadata.title)) return false;
  if (
    metadata.soundtrack !== undefined &&
    typeof metadata.soundtrack !== "string"
  ) {
    return false;
  }

  const { durationSeconds } = metadata;
  if (
    typeof durationSeconds !== "number" ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    durationSeconds > MAX_DURATION_SECONDS
  ) {
    return false;
  }

  if (!Array.isArray(data.tracks) || !Array.isArray(data.cues)) return false;
  if (!data.tracks.every(isValidTrack)) return false;

  const ids = data.tracks.map((track) => (track as { id: string }).id);
  if (new Set(ids).size !== ids.length) return false; // duplicate track ids

  const trackIds = new Set(ids);
  if (!data.cues.every((cue) => isValidCue(cue, trackIds))) return false;

  return true;
}
