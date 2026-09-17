# Example projects

Import any of these from the start screen (**Import Project (JSON)**) to see what
a filled-in timeline looks like.

| File                                                 | What it shows                                                                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`lighting-cue-sheet.json`](lighting-cue-sheet.json) | A technical cue sheet: overlapping states, a cue spanning the whole track, a blackout across three tracks. |
| [`event-run-of-show.json`](event-run-of-show.json)   | A half-hour event run of show, with **no soundtrack** — `metadata.soundtrack` is optional.                 |
| [`legacy-v1-project.json`](legacy-v1-project.json)   | A **schema v1** file, from before the Track/Cue rename. Importing it exercises the migration.              |

`legacy-v1-project.json` is deliberately kept in the old format: it is the
fixture that proves old exports still open. It uses `actors`, `actions`,
`actorIds` and a mandatory `musicName`; on import those become `tracks`, `cues`,
`trackIds` and an optional `soundtrack`. See
[`src/utils/migration.ts`](../src/utils/migration.ts).

Do not "fix" it to v2.
