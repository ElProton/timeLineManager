/** Metadata shared by the whole project. */
export interface ProjectMetadata {
  title: string;
  /**
   * Name of the reference recording the timeline is built against.
   * Optional: a timeline may be timed against a voice-over, a video timecode
   * or nothing at all.
   */
  soundtrack?: string;
  durationSeconds: number;
}

/** A row of the timeline: a person, a team, a device, a channel. */
export interface Track {
  id: string;
  name: string;
}

/** A timed block on one or more tracks. */
export interface Cue {
  id: string;
  description: string;
  /** Start offset in seconds, inclusive. */
  timeStart: number;
  /** End offset in seconds, exclusive. */
  timeEnd: number;
  /** Tracks this cue runs on. At least one. */
  trackIds: string[];
  /** Hex colour, `#rgb` or `#rrggbb`. */
  color: string;
}

/**
 * Schema version of the persisted project.
 *
 * v1 — `actors` / `actions` / `actorIds`, mandatory `metadata.musicName`.
 * v2 — renamed to `tracks` / `cues` / `trackIds`, `metadata.soundtrack`
 *      optional. The v1 vocabulary came from live show production and did not
 *      travel to other trades; see docs/adr and ROADMAP.md.
 *
 * Bumping this requires a migration step in `utils/migration.ts` and a test
 * covering every earlier version — see CONTRIBUTING.md.
 */
export const CURRENT_SCHEMA_VERSION = 2;

export interface ProjectData {
  schemaVersion: number;
  metadata: ProjectMetadata;
  tracks: Track[];
  cues: Cue[];
}

/** Longest timeline accepted, in seconds. Twelve hours. */
export const MAX_DURATION_SECONDS = 12 * 60 * 60;
