# Data model

## Type diagram

```
ProjectData
├── schemaVersion: number
├── metadata: ProjectMetadata
│     ├── title: string
│     ├── soundtrack?: string     (optional)
│     └── durationSeconds: number
├── tracks: Track[]
│     ├── id: string (UUID)
│     └── name: string
└── cues: Cue[]
      ├── id: string (UUID)
      ├── description: string
      ├── timeStart: number (seconds)
      ├── timeEnd: number (seconds)
      ├── trackIds: string[] (refs → Track.id)
      └── color: string (hex)
```

Source: [src/types.ts](../src/types.ts)

## Vocabulary

Schema v1 used the vocabulary of live show production: an `Actor` performed
`Action`s. Those terms did not travel outside the theatre — a lighting desk, a
drone swarm and a caterer are not "actors". v2 uses terms every affected trade
recognises.

| Concept | Meaning                                                                                                   |
| ------- | --------------------------------------------------------------------------------------------------------- |
| `Track` | A row of the timeline: a person, a team, a device, a channel.                                             |
| `Cue`   | A timed block sitting on one or more tracks. The standard term in live performance, broadcast and events. |

## TypeScript interfaces

### `ProjectMetadata`

| Property          | Type      | Description                                                                                                                              |
| ----------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `title`           | `string`  | Project name. Required, non-blank.                                                                                                       |
| `soundtrack`      | `string?` | **Optional.** The reference recording. Absent when the timeline is built against a voice-over, a video timecode or a plain running time. |
| `durationSeconds` | `number`  | Total length. Strictly positive, capped at `MAX_DURATION_SECONDS` (12 hours).                                                            |

### `Track`

| Property | Type     | Description                                                   |
| -------- | -------- | ------------------------------------------------------------- |
| `id`     | `string` | Unique id (`crypto.randomUUID()`). Unique within the project. |
| `name`   | `string` | Label shown at the head of the row.                           |

### `Cue`

| Property      | Type       | Description                                               |
| ------------- | ---------- | --------------------------------------------------------- |
| `id`          | `string`   | Unique id (UUID v4).                                      |
| `description` | `string`   | Label shown on the block.                                 |
| `timeStart`   | `number`   | Start offset in seconds, inclusive. `>= 0`.               |
| `timeEnd`     | `number`   | End offset in seconds, exclusive. Strictly `> timeStart`. |
| `trackIds`    | `string[]` | Tracks it runs on (N:N). Every id must exist.             |
| `color`       | `string`   | Hex colour, `#rgb` or `#rrggbb`.                          |

### `ProjectData`

| Property        | Type              | Description                |
| --------------- | ----------------- | -------------------------- |
| `schemaVersion` | `number`          | Schema version. See below. |
| `metadata`      | `ProjectMetadata` | Project metadata           |
| `tracks`        | `Track[]`         | Timeline rows              |
| `cues`          | `Cue[]`           | Timed blocks               |

## Relationships

```
Track (1) ←──── (N) Cue.trackIds (N) ────→ (1) Track
                    implicit N:N relation
                    through an array of ids
```

- A **Cue** references one or more **Track**s through `trackIds`.
- Deleting a track strips its id from every `trackIds`. A cue left with no track
  at all is deleted too. The cascade happens in the reducer, so it is undoable.
- There is no temporal uniqueness constraint: cues may overlap.

## Schema versions and migration

`CURRENT_SCHEMA_VERSION` is **2**.

| Version | Shape                                                             |
| ------- | ----------------------------------------------------------------- |
| v0      | No `schemaVersion`. Files written before versioning existed.      |
| v1      | `actors` / `actions` / `actorIds`, `metadata.musicName` required. |
| v2      | `tracks` / `cues` / `trackIds`, `metadata.soundtrack` optional.   |

The migration chain lives in [src/utils/migration.ts](../src/utils/migration.ts)
and runs on **file import and on cache load alike**. It never mutates its input.

> **Changing the model requires** bumping `CURRENT_SCHEMA_VERSION`, adding a
> migration step, and a test covering **every** earlier version. See
> [CONTRIBUTING.md](../CONTRIBUTING.md). A v1 example file is kept in
> [`examples/`](../examples/) precisely to exercise this chain.

## Validation

[src/utils/validation.ts](../src/utils/validation.ts) exports
`isValidProjectData`, the **single gate** for any untrusted data — browser cache
and imported file alike. It runs after migration.

The two paths used to diverge: the cache was validated thoroughly while file
import — the more exposed of the two — checked only a couple of fields and let a
negative duration through.

| Rule                                           | Enforced in     |
| ---------------------------------------------- | --------------- |
| `schemaVersion` an integer `>= 1`              | `validation.ts` |
| `title` non-blank                              | `validation.ts` |
| `0 < durationSeconds <= MAX_DURATION_SECONDS`  | `validation.ts` |
| `soundtrack` absent or a string                | `validation.ts` |
| `tracks` and `cues` are arrays                 | `validation.ts` |
| track ids present and unique                   | `validation.ts` |
| `0 <= timeStart < timeEnd`, both finite        | `validation.ts` |
| every `trackIds` entry references a real track | `validation.ts` |
| `color` matches `#rgb` or `#rrggbb`            | `validation.ts` |
| `timeEnd <= durationSeconds`                   | `CueModal`      |
| `trackIds.length >= 1`                         | `CueModal`      |
| `mm:ss` format, seconds `<= 59`                | `time.ts`       |

## Suggested colour palette

Defined in `CueModal.tsx`:

```
#ef4444  #f97316  #f59e0b  #84cc16  #22c55e
#06b6d4  #3b82f6  #6366f1  #a855f7  #ec4899
```

Ten Tailwind colours. Validation accepts any hex colour, not just these.
