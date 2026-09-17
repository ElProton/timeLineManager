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
    ├── AudioBar
    ├── Timeline
    │   └── Waveform
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

| Prop              | Type                        | Description                                   |
| ----------------- | --------------------------- | --------------------------------------------- |
| `data`            | `ProjectData`               | The whole project                             |
| `filteredTrackId` | `string \| null`            | `null` shows every track                      |
| `audio`           | `TimelineAudio?`            | Absent or detached: no playhead               |
| `zoom`            | `number?`                   | 1 fits the container, 4 is four times as wide |
| `onEditCue`       | `(cue: Cue) => void`        | Opens the cue editor                          |
| `onMoveCue`       | `(cue: Cue) => void`        | A cue retimed on the timeline itself          |
| `onDeleteCue`     | `(cueId: string) => void`   | Asks for confirmation, then deletes           |
| `onEditTrack`     | `(track: Track) => void`    | Opens the track editor                        |
| `onDeleteTrack`   | `(trackId: string) => void` | Asks for confirmation, then deletes           |

`TimelineAudio` is deliberately narrower than what `useAudio` returns — the timeline
draws a position and asks for a new one, and knows nothing about files or playback:

| Field            | Type                        | Description                                  |
| ---------------- | --------------------------- | -------------------------------------------- |
| `isAttached`     | `boolean`                   | Gates the waveform, the playhead and seek    |
| `getCurrentTime` | `() => number`              | Called every animation frame, so not a value |
| `duration`       | `number`                    | The file's own length, which may differ      |
| `peaks`          | `Peak[]`                    | Handed to `Waveform`                         |
| `seek`           | `(seconds: number) => void` | Where a click on the axis goes               |

A `forwardRef` onto the node `useExport` captures for the JPEG export.

```
┌───────────────┬──────────────────────────────────────┐
│ [soundtrack]  │  00:00 ... 00:30 ... 01:00 ...       │  time axis  (click to seek)
├───────────────┼──────────────────────────────────────┤
│               │  ▁▃█▇▃▁▁▂▅█▆▂▁                       │  waveform   (click to seek)
├───────────────┼──────────────────────────────────────┤
│ Lighting  [✎🗑]│  ██████  ████████████                │  track row
│ Drone A   [✎🗑]│       ████████       ██████████      │
│ Catering  [✎🗑]│  ██████████████████████████          │
└───────────────┴──────────────────────────────────────┘
                   ╵ playhead, spanning axis to last row
```

**Positioning** is percentage-based against the total duration, through
`timeToPercent` in [`utils/timeline.ts`](../src/utils/timeline.ts); the axis interval
comes from `markerTimes` in the same file, which keeps the axis under 40 labels
whatever the duration.

**`LaneOverlay` is the one coordinate frame.** Cues sit in a lane that starts after
the 192 px label gutter, so anything spanning the rows must be positioned in that
lane too. `LaneOverlay` repeats the `w-48 shrink-0` + `flex-1` pair every row is
built from and hosts both the hover band and the playhead. Before it existed the band
was drawn against the full width, which put it 144 px left of its own cue —
see [the architecture](architecture.md#rendering-the-timeline).

**Multi-track cues** appear on every row they run on. Hovering or focusing one
draws a dashed band across the full height — only when no filter is active.

**The playhead** is a `translateX` percentage written straight onto `style.transform`
in a `requestAnimationFrame` loop, never through React. The waveform covers the span
the file actually occupies: a two-minute file on a ten-minute timeline draws across
the first fifth, because the playhead is scaled to the timeline and the two have to
agree. That it does not fill the lane **is** the length mismatch, shown rather than
described — and `AudioBar` offers to fix it.

**Clicking the time axis or the waveform** moves the playhead there, via
`percentToTime`. Cue rows are deliberately not click-to-seek: a click there opens the
cue.

### Retiming a cue

Grab a block to move it, take either edge to stretch it. `useCueDrag` runs the
gesture; the arithmetic is in [`dragCue`](utilities.md#dragcue--retiming-a-cue).

- **One gesture is one undo entry.** `pointermove` fires around sixty times a
  second and the reducer snapshots on every `SAVE_CUE`, capped at fifty, so
  dispatching per move would erase the whole undo history in a single drag. One
  `SAVE_CUE` leaves at the end — none at all if the cue did not move.
- **The preview does not go through React**: `left` and `width` are written
  straight onto the blocks, as the playhead's transform is. A multi-track cue is
  found by `data-cue-id`, so every row it appears on moves together.
- **Snapping is to the playhead and to other cues' edges**, never to the axis
  markers. Markers were tried first: at a 5-second interval and an 8px
  tolerance a third of the timeline snapped to a round number, and 78 seconds
  was unreachable. A playhead and a neighbouring cue are things someone aims at.
- **Arrow keys retime a focused cue** — `Shift` for the end, `Alt` for the
  start. They call `preventDefault`, which is how `AudioBar` knows to leave the
  transport alone: a cue is a `div` with `role="button"`, so its own
  `isTypingTarget` check cannot recognise it.

### Zoom

`zoom` is applied as a single width on the content node. Everything inside is a
percentage of its lane, so cues, markers, the waveform and the playhead all
follow with no arithmetic changing. The track labels are `sticky left-0` so the
names survive scrolling, and the axis is given the lane's measured width so it
draws more labels rather than the same ones further apart.

The control lives in `App`, not here: this component's node is what `useExport`
captures, so a control inside it would appear in the JPEG.

Measuring the lane uses a `ResizeObserver`, which jsdom does not provide —
whoever writes the first `Timeline` test will need a stub, the way
`useAudio.test.ts` stubs Web Audio.

**Keyboard and pointer.** A cue is a `role="button"` with `tabIndex={0}`, opens
on click, `Enter` or `Space`, and carries an `aria-label` naming it and its time
range. Per-cue delete and per-track edit/delete buttons appear on hover or focus
and have their own `aria-label`s. Moving between rows from the keyboard is not
implemented yet — see [the roadmap](../ROADMAP.md).

**Empty state.** With no tracks: _No tracks to display. Add a track to get
started._

---

## `Waveform` — the soundtrack, drawn

**File:** [src/components/Waveform.tsx](../src/components/Waveform.tsx)

| Prop     | Type      | Description                                |
| -------- | --------- | ------------------------------------------ |
| `peaks`  | `Peak[]`  | Min/max pairs from `computePeaks`          |
| `colour` | `string?` | Any CSS colour, defaults to the app indigo |

A `<canvas>`, not a few thousand DOM nodes — the same reasoning that caps the time
axis at 40 markers, with fifty times as many columns. It fills its parent, redraws
through a `ResizeObserver`, and matches its bitmap to `devicePixelRatio` so the
drawing stays sharp on a retina screen. Silence draws as a hairline rather than
nothing, so a quiet passage reads as quiet and not as a failed drawing.

`html-to-image` copies a canvas through `toDataURL`, so the waveform comes out in the
JPEG export like everything else.

Not covered by tests: jsdom has neither a 2D canvas context nor `ResizeObserver`. The
arithmetic it draws is in [`computePeaks`](utilities.md#waveform--peak-extraction),
which is pure and is tested.

---

## `AudioBar` — attaching and playing a soundtrack

**File:** [src/components/AudioBar.tsx](../src/components/AudioBar.tsx)

Takes fourteen props, all of them from `useAudio` or the project metadata. The ones
worth knowing:

| Prop              | Type                        | Description                                   |
| ----------------- | --------------------------- | --------------------------------------------- |
| `soundtrack`      | `string \| undefined`       | `metadata.soundtrack` — the file it expects   |
| `audioDuration`   | `number`                    | The file's length, `0` until the browser says |
| `projectDuration` | `number`                    | `metadata.durationSeconds`                    |
| `getCurrentTime`  | `() => number`              | Read every frame for the readout              |
| `onAdoptDuration` | `(seconds: number) => void` | Offers the file's length to the project       |

**With nothing attached** it names the file the project is set to, if there is one, and
says plainly that the file stays on the machine and is not part of the export. That is
the whole of the re-attach story: the project stores a name, not a recording.

**With a file attached** it is a transport — play/pause, `mm:ss.t` position, total
length, the file name, replace and remove.

**The readout is written straight into the DOM** through a ref, in the same
`requestAnimationFrame` loop pattern as the playhead. It changes sixty times a second;
state would re-render the bar just as often.

**Keyboard.** Space plays and pauses, `←` and `→` seek five seconds. The handler is on
`window`, and steps aside when the key belongs to whatever has focus: a field, a
button, a link, or anything while a dialog is open — a dialog has its own focus trap
and its own meaning for every one of those keys.

**The length mismatch** is a `role="status"` line offering the file's own length. It
is offered, never applied on its own: `durationSeconds` is the denominator of every
position on screen, and shortening it trims or removes cues. Taking it up therefore
goes through the same confirmation the settings dialog warns about, and lands via
`saveMetadata(metadata, truncateCues)` so it is undoable.

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
