# ADR-001: a layer system for the timeline

## Status

**Proposed — not implemented. Archived.**

> This ADR comes from
> [PR #1](https://github.com/ElProton/timeLineManager/pull/1), opened on
> 2026-03-23 and since closed. The reasoning still holds and the decision stands
> in principle, but that pull request's code was written against an earlier
> codebase — state in `App.tsx` through `useState`, no `schemaVersion`, migration
> logic duplicated inside `ProjectInit` — and cannot be reused. The
> implementation has to be redone on the current architecture; see
> [ROADMAP.md](../../ROADMAP.md) §4.
>
> The JSON below is therefore **indicative**. Any real implementation must carry
> `schemaVersion` and use the v2 vocabulary (`Track` / `Cue`).
>
> This document is archived and is not maintained.

## Date

2026-03-23

## Context

The application manages a single timeline with tracks and cues. For one show —
same soundtrack, same duration — it is useful to represent several layers of
information:

- **Artistic:** performer movement, choreography, staging
- **Technical:** lighting, sound, effects, scene changes
- Any other layer the production needs

Today everything sits on one view, which becomes hard to read as the number of
tracks and cues grows.

Outside live performance the same need appears under other names: separating
teams from suppliers, sound from video, speakers from transitions.

## Decision

### Data model

Introduce a **Layer** concept.

**Before:**

```json
{
  "metadata": { "title": "...", "soundtrack": "...", "durationSeconds": 900 },
  "tracks": [...],
  "cues": [...]
}
```

**After:**

```json
{
  "metadata": { "title": "...", "soundtrack": "...", "durationSeconds": 900 },
  "layers": [
    { "id": "uuid", "name": "Artistic", "tracks": [...], "cues": [...] },
    { "id": "uuid", "name": "Technical", "tracks": [...], "cues": [...] }
  ]
}
```

### Design rules

1. **Shared:** `metadata` — title, soundtrack, total duration — is common to
   every layer.
2. **Per layer:** each layer owns its own tracks and cues.
3. **Unique names**, so a layer can be identified at a glance.
4. **A default layer** is created with every new project.
5. **Backward compatibility** is handled by the migration chain in
   `src/utils/migration.ts` — **not** by logic duplicated inside `ProjectInit`,
   which is what the original pull request did.

### Interface

1. A **selector** in the toolbar picks the active layer and adds new ones.
2. Existing operations apply to the active layer.
3. The image export covers the **active layer**; the JSON export covers the
   **whole project**, every layer included.

### TypeScript

```typescript
interface Layer {
  id: string;
  name: string;
  tracks: Track[];
  cues: Cue[];
}

interface ProjectData {
  schemaVersion: number;
  metadata: ProjectMetadata;
  layers: Layer[];
}
```

## Consequences

### Positive

- **Separation of concerns:** information organised by domain
- **Visual clarity:** each layer shows only what belongs to it
- **Flexibility:** no cap on the number of layers
- **Backward compatible:** older files migrate automatically
- **Generic:** the concept carries outside live performance without renaming

### Negative

- **A more complex model:** state management gains the indirection of an active
  layer, including in the reducer and the undo/redo history
- **Risk of confusion:** the reader has to know which layer they are editing

### Neutral

- The JSON format changes but stays one file per project
- The image export captures only the active layer, deliberately, for legibility
