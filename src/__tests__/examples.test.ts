import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { migrateProject } from "../utils/migration";
import { isValidProjectData } from "../utils/validation";

const files = [
  "lighting-cue-sheet.json",
  "event-run-of-show.json",
  "legacy-v1-project.json",
];

describe("bundled examples", () => {
  it.each(files)("%s imports cleanly through the real code path", (file) => {
    const raw = JSON.parse(readFileSync(`examples/${file}`, "utf8"));
    const migrated = migrateProject(raw);
    expect(migrated).not.toBeNull();
    expect(isValidProjectData(migrated)).toBe(true);
  });

  it("legacy-v1-project.json is still a v1 file, as documented", () => {
    const raw = JSON.parse(
      readFileSync("examples/legacy-v1-project.json", "utf8"),
    );
    expect(raw.schemaVersion).toBe(1);
    expect(raw).toHaveProperty("actors");
    expect(raw.metadata).toHaveProperty("musicName");
  });

  it("migrating the legacy file yields tracks and cues", () => {
    const raw = JSON.parse(
      readFileSync("examples/legacy-v1-project.json", "utf8"),
    );
    const migrated = migrateProject(raw)!;
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.tracks).toHaveLength(2);
    expect(
      (migrated.cues as { trackIds: string[] }[])[1].trackIds,
    ).toHaveLength(2);
    expect(migrated.metadata).toHaveProperty("soundtrack", "Boléro");
  });

  it("event-run-of-show.json has no soundtrack, proving it is optional", () => {
    const raw = JSON.parse(
      readFileSync("examples/event-run-of-show.json", "utf8"),
    );
    expect(raw.metadata.soundtrack).toBeUndefined();
    expect(isValidProjectData(migrateProject(raw))).toBe(true);
  });
});
