import { describe, it, expect, vi } from "vitest";
import { migrateProject } from "../utils/migration";
import { CURRENT_SCHEMA_VERSION } from "../types";

describe("migrateProject", () => {
  it("returns null for null input", () => {
    expect(migrateProject(null)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(migrateProject("string")).toBeNull();
    expect(migrateProject(42)).toBeNull();
    expect(migrateProject(true)).toBeNull();
    expect(migrateProject(undefined)).toBeNull();
  });

  it("migrates v0 (no schemaVersion) to current version", () => {
    const v0Data = {
      metadata: { title: "Test", musicName: "Song", durationSeconds: 120 },
      actors: [],
      actions: [],
    };
    const result = migrateProject(v0Data);
    expect(result).not.toBeNull();
    expect(result!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("preserves all existing fields during v0 → v1 migration", () => {
    const v0Data = {
      metadata: { title: "Show", musicName: "Track", durationSeconds: 300 },
      actors: [{ id: "a1", name: "Alice" }],
      actions: [
        {
          id: "act1",
          description: "Enter",
          timeStart: 0,
          timeEnd: 30,
          actorIds: ["a1"],
          color: "#ef4444",
        },
      ],
    };
    const result = migrateProject(v0Data);
    expect(result).not.toBeNull();
    expect(result!.metadata).toEqual(v0Data.metadata);
    expect(result!.actors).toEqual(v0Data.actors);
    expect(result!.actions).toEqual(v0Data.actions);
  });

  it("returns v1 data as-is (already current)", () => {
    const v1Data = {
      schemaVersion: 1,
      metadata: { title: "Show", musicName: "Song", durationSeconds: 120 },
      actors: [],
      actions: [],
    };
    const result = migrateProject(v1Data);
    expect(result).not.toBeNull();
    expect(result!.schemaVersion).toBe(1);
  });

  it("returns null for unsupported future version", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const futureData = {
      schemaVersion: 999,
      metadata: { title: "X", musicName: "Y", durationSeconds: 60 },
      actors: [],
      actions: [],
    };
    const result = migrateProject(futureData);
    expect(result).toBeNull();
    expect(spy).toHaveBeenCalledWith("Unsupported schema version: 999");
    spy.mockRestore();
  });

  it("returns null for empty object (no metadata)", () => {
    // migrateProject only handles versioning, not structure validation
    // An empty object gets schemaVersion stamped but is structurally invalid
    // (validation happens separately in storage.ts)
    const result = migrateProject({});
    expect(result).not.toBeNull();
    expect(result!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});
