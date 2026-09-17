import type { Cue, ProjectData, Track } from "../types";

/**
 * Shared test fixtures.
 *
 * Every test file used to declare its own near-identical ProjectData literal,
 * so a change to the model had to be applied in three places. Builders take an
 * override object so a test can state only what it actually cares about.
 */

export function makeTrack(overrides: Partial<Track> = {}): Track {
  return { id: "t1", name: "Alice", ...overrides };
}

export function makeCue(overrides: Partial<Cue> = {}): Cue {
  return {
    id: "c1",
    description: "Enter",
    timeStart: 0,
    timeEnd: 30,
    trackIds: ["t1"],
    color: "#ef4444",
    ...overrides,
  };
}

/** Two tracks, two cues, the second running on both. */
export function makeProject(overrides: Partial<ProjectData> = {}): ProjectData {
  return {
    schemaVersion: 2,
    metadata: { title: "Show", soundtrack: "Song", durationSeconds: 180 },
    tracks: [
      makeTrack({ id: "t1", name: "Alice" }),
      makeTrack({ id: "t2", name: "Bob" }),
    ],
    cues: [
      makeCue({ id: "c1", description: "Enter", timeStart: 0, timeEnd: 30 }),
      makeCue({
        id: "c2",
        description: "Cross",
        timeStart: 10,
        timeEnd: 60,
        trackIds: ["t1", "t2"],
        color: "#3b82f6",
      }),
    ],
    ...overrides,
  };
}

/** An empty but valid project. */
export function makeEmptyProject(
  overrides: Partial<ProjectData> = {},
): ProjectData {
  return makeProject({ tracks: [], cues: [], ...overrides });
}
