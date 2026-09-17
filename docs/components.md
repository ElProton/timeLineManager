# Components

Every component lives in [`src/components/`](../src/components/). They are
presentational: application state and behaviour belong in
[`src/hooks/`](../src/hooks/), described in [the architecture](architecture.md).

```
ErrorBoundary
└── App
    ├── ProjectInit              ← no project loaded
    │
    ├── header / banners / toolbar   (inline in App, not extracted)
    ├── Timeline
    ├── CueModal        ┐
    ├── TrackModal      │ all four built on Modal
    ├── MetadataModal   │
    └── ConfirmDialog   ┘
```

Header, banners and toolbar are rendered inline in `App.tsx`. They are markup
with no logic of their own, and extracting them would add indirection without
removing anything.

---

## `Modal` — the dialog shell

**File:** [src/components/Modal.tsx](../src/components/Modal.tsx)

The most important component here: every dialog is built on it, so accessibility
is solved once rather than four times.

| Prop       | Type         | Description                               |
| ---------- | ------------ | ----------------------------------------- |
| `isOpen`   | `boolean`    | Renders nothing when false                |
| `onClose`  | `() => void` | Escape, close button, backdrop press      |
| `title`    | `string`     | Heading, and the dialog's accessible name |
| `children` | `ReactNode`  | Body                                      |
| `footer`   | `ReactNode?` | Action buttons                            |
| `maxWidth` | `string?`    | Tailwind class, defaults to `max-w-lg`    |

What it guarantees:

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` wired to the heading
  through `useId`.
- **Focus moves in on open** — to the first focusable element that is not the
  close button, so the reader lands on a form field rather than on _Close_. The
  close button carries `data-modal-dismiss` so it can be skipped.
- **Focus is trapped** — `Tab` and `Shift+Tab` cycle within the dialog. The
  handler only intervenes at the two edges; browsers move focus themselves in
  between.
- **Focus is restored** to whatever opened the dialog, on close.
- **`Escape` closes.**
- **Backdrop press closes**, but only when the press both starts and ends on the
  backdrop, so a drag that began inside the dialog does not dismiss it.

It is hand-written rather than using the native `<dialog>` element. jsdom
implements neither `showModal()` nor `close()`, so a native dialog could not be
tested here. Covered by [`Modal.test.tsx`](../src/__tests__/Modal.test.tsx).

---

## `ProjectInit` — the start screen

**File:** [src/components/ProjectInit.tsx](../src/components/ProjectInit.tsx)

| Prop            | Type                               | Description                           |
| --------------- | ---------------------------------- | ------------------------------------- |
| `onInit`        | `(data: ProjectData) => void`      | Hands a validated project up to `App` |
| `cachedProject` | `ProjectData \| null \| undefined` | Drives the resume banner              |

Three ways in, not two:

1. **Resume.** When `cachedProject` is set, the screen leads with _Previous
   session found_ — title, soundtrack, duration, and the track and cue counts —
   and a **Resume Project** button. **New Project** switches to the form without
   erasing the cache.
2. **Create.** Title (required), soundtrack (optional), total duration as
   `mm:ss`. Validation rejects an empty title, a malformed or out-of-range
   duration, and anything over `MAX_DURATION_SECONDS`.
3. **Import.** A `.json` file, parsed and then put through `migrateProject` and
   `isValidProjectData` — the same gate the cache uses.

Import failures report separately from form errors, in plain language: not JSON,
unreadable file, or not a valid project. Both channels render with `role="alert"`.
The file input is reset after each attempt so the same file can be retried.

---

## `Timeline` — the view

**File:** [src/components/Timeline.tsx](../src/components/Timeline.tsx)

| Prop              | Type                        | Description                         |
| ----------------- | --------------------------- | ----------------------------------- |
| `data`            | `ProjectData`               | The whole project                   |
| `filteredTrackId` | `string \| null`            | `null` shows every track            |
| `onEditCue`       | `(cue: Cue) => void`        | Opens the cue editor                |
| `onDeleteCue`     | `(cueId: string) => void`   | Asks for confirmation, then deletes |
| `onEditTrack`     | `(track: Track) => void`    | Opens the track editor              |
| `onDeleteTrack`   | `(trackId: string) => void` | Asks for confirmation, then deletes |

A `forwardRef` onto the node `useExport` captures for the JPEG export.

```
┌───────────────┬──────────────────────────────────────┐
│ [soundtrack]  │  00:00 ... 00:30 ... 01:00 ...       │  time axis
├───────────────┼──────────────────────────────────────┤
│ Lighting  [✎🗑]│  ██████  ████████████                │  track row
│ Drone A   [✎🗑]│       ████████       ██████████      │
│ Catering  [✎🗑]│  ██████████████████████████          │
└───────────────┴──────────────────────────────────────┘
```

**Positioning** is percentage-based against the total duration; the axis interval
comes from `markerTimes` in [`utils/timeline.ts`](../src/utils/timeline.ts), which
keeps the axis under 40 labels whatever the duration.

**Multi-track cues** appear on every row they run on. Hovering or focusing one
draws a dashed band across the full height — only when no filter is active.

**Keyboard and pointer.** A cue is a `role="button"` with `tabIndex={0}`, opens
on click, `Enter` or `Space`, and carries an `aria-label` naming it and its time
range. Per-cue delete and per-track edit/delete buttons appear on hover or focus
and have their own `aria-label`s. Moving between rows from the keyboard is not
implemented yet — see [the roadmap](../ROADMAP.md).

**Empty state.** With no tracks: _No tracks to display. Add a track to get
started._

---

## `CueModal` — create and edit a cue

**File:** [src/components/CueModal.tsx](../src/components/CueModal.tsx)

| Prop          | Type                       | Description                   |
| ------------- | -------------------------- | ----------------------------- |
| `isOpen`      | `boolean`                  |                               |
| `onClose`     | `() => void`               |                               |
| `onSave`      | `(cue: Cue) => void`       |                               |
| `initialCue`  | `Cue \| null \| undefined` | `null` or absent means create |
| `tracks`      | `Track[]`                  | Offered as selectable chips   |
| `maxDuration` | `number`                   | Upper bound for the end time  |

| Field       | Validation                                                       |
| ----------- | ---------------------------------------------------------------- |
| Description | Required, non-blank                                              |
| Start time  | `mm:ss`, seconds under 60, before the end time                   |
| End time    | `mm:ss`, seconds under 60, after the start, within `maxDuration` |
| Tracks      | At least one; chips carry `aria-pressed`                         |
| Colour      | One of ten; swatches carry `aria-pressed` and an `aria-label`    |

Creating a cue defaults to `00:00` → `min(30, maxDuration)`. The id is generated
on save for a new cue and preserved when editing. Errors render inline with
`role="alert"`.

---

## `TrackModal` — create and edit a track

**File:** [src/components/TrackModal.tsx](../src/components/TrackModal.tsx)

| Prop           | Type                         | Description                   |
| -------------- | ---------------------------- | ----------------------------- |
| `isOpen`       | `boolean`                    |                               |
| `onClose`      | `() => void`                 |                               |
| `onSave`       | `(track: Track) => void`     |                               |
| `initialTrack` | `Track \| null \| undefined` | `null` or absent means create |

One field, the name, required and trimmed. `Enter` saves. A hint under the field
says what a track is — _a person, a team, a device, a channel_ — because the word
carries no meaning until someone tells you what it maps to in your trade.

---

## `MetadataModal` — project settings

**File:** [src/components/MetadataModal.tsx](../src/components/MetadataModal.tsx)

| Prop        | Type                                                         | Description                     |
| ----------- | ------------------------------------------------------------ | ------------------------------- |
| `isOpen`    | `boolean`                                                    |                                 |
| `onClose`   | `() => void`                                                 |                                 |
| `onSave`    | `(metadata: ProjectMetadata, truncateCues: boolean) => void` |                                 |
| `metadata`  | `ProjectMetadata`                                            | Current values                  |
| `maxCueEnd` | `number`                                                     | Latest end time across all cues |

Title, soundtrack and total duration. Same duration rules as the start screen.

Its point of interest is the **live warning**: as soon as the duration you are
typing falls below `maxCueEnd`, a `role="status"` notice says how far the cues
run and that shortening will trim or remove those past the new limit. Saving then
passes `truncateCues: true` and the reducer does the trimming — undoably.

An empty soundtrack is dropped rather than stored as an empty string, so the
field stays genuinely optional.

---

## `ConfirmDialog` — confirmation

**File:** [src/components/ConfirmDialog.tsx](../src/components/ConfirmDialog.tsx)

Replaces the browser's native `confirm()`, which cannot be styled or translated
and is suppressed outright in some embedded contexts.

| Prop           | Type         | Description                       |
| -------------- | ------------ | --------------------------------- |
| `isOpen`       | `boolean`    |                                   |
| `title`        | `string`     |                                   |
| `message`      | `string`     |                                   |
| `confirmLabel` | `string`     |                                   |
| `cancelLabel`  | `string`     |                                   |
| `destructive`  | `boolean`    | Renders the confirm button in red |
| `onConfirm`    | `() => void` |                                   |
| `onCancel`     | `() => void` |                                   |

You do not build these props by hand: `useConfirm` returns them ready to spread,
alongside a promise-based `confirm()`. `App` renders one instance and every
destructive action awaits it.

---

## `ErrorBoundary` — the last resort

**File:** [src/components/ErrorBoundary.tsx](../src/components/ErrorBoundary.tsx)

Wraps `<App />` in `main.tsx`. The only class component in the project, because
error boundaries have no hook equivalent.

On a render error it shows the message, a **Reload** button, and a link to the
bug report form — and says the thing that actually matters: the project is in
browser storage, so reloading should bring it back.
