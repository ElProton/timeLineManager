# Architecture

Timeline Manager is a single-page React application that runs entirely in the
browser. There is no backend, no account system and no network call: a project
lives in the reader's own browser storage and in the JSON files they export.

That constraint shapes everything below. See
[CONTRIBUTING.md](../CONTRIBUTING.md) — it is the one rule a pull request cannot
break.

## The shape of it

```
main.tsx
└── ErrorBoundary            catches render errors, offers a reload
    └── App                  composition only; holds no state of its own
        ├── ProjectInit      when there is no project loaded
        │
        └── editor           when there is
            ├── header       title, soundtrack, duration, undo/redo, exports
            ├── banners      storage blocked · export failed
            ├── toolbar      add track · add cue · filter by track
            ├── AudioBar     attach a soundtrack · transport · length mismatch
            ├── Timeline     the time axis, the waveform, the rows, the playhead
            └── dialogs      CueModal · TrackModal · MetadataModal · ConfirmDialog
```

`App` renders one of two screens depending on whether a project is loaded, and
nothing else decides that: `ProjectInit` shows while `projectData` is `null`.

## Layers

| Layer             | Holds                                   | Rule              |
| ----------------- | --------------------------------------- | ----------------- |
| `src/components/` | Presentation and local UI state         | No business logic |
| `src/hooks/`      | All application state and behaviour     | No JSX            |
| `src/utils/`      | Pure functions                          | No React          |
| `src/types.ts`    | The domain model and the schema version | —                 |

Business logic lives in hooks and utils rather than components. That is what
makes the current test suite possible: the reducer, the hooks and every utility
are tested directly, without rendering anything.

## State

`App` holds **no** state. It calls five hooks and wires their return values into
the tree.

### `useProjectManager` — the project itself

The single source of truth. It owns a `useReducer` over `projectReducer`, so
every mutation is an explicit, named event rather than a scattered setter:

```
INIT_PROJECT · SAVE_CUE · DELETE_CUE · SAVE_TRACK · DELETE_TRACK
SAVE_METADATA · SET_FILTER · CLEAR_ALL · UNDO · REDO
```

The reducer's parameter is called `event`, not `action`. In the v1 model a timed
block _was_ an `Action`, so `action.payload` and a domain action sat in the same
scope reading identically. The rename removed the ambiguity for good — see
[the data model](data_model.md#vocabulary).

`ProjectState` carries the project, the active track filter, and two snapshot
stacks — `past` and `future` — that drive undo/redo. Every mutating event pushes
the previous project onto `past` and clears `future`; the history is capped at 50
snapshots. `SET_FILTER` is deliberately **not** undoable: it changes what you
look at, not what you have.

The hook also owns persistence, described below, and exposes `maxCueEnd`, which
`MetadataModal` uses to warn before a shorter duration would truncate cues.

### `useModals`, `useExport`, `useConfirm`, `useAudio`

- **`useModals`** — which dialog is open, and which entity it is editing.
  `null` means "create", an object means "edit".
- **`useExport`** — the `ref` onto the timeline node, JSON download, JPEG capture
  via `html-to-image`, and an `exportError` string surfaced as an in-app banner
  rather than thrown or `alert()`ed.
- **`useConfirm`** — a promise-based `confirm(options)` so call sites read top to
  bottom: `if (!(await confirm({...}))) return;`
- **`useAudio`** — the attached soundtrack: the file, the element that plays it, its
  waveform and its real duration. Described in [its own section](#the-soundtrack).

`useAnimationFrame` is a sixth hook, but not one `App` calls: `AudioBar` and
`Timeline` use it directly to update the transport readout and the playhead.

**Confirmation deliberately lives in `App`, not in `useProjectManager`.** An
in-app dialog is asynchronous. Keeping the decision inside the state hook would
make every mutation async and couple it to a component. Instead the hook exposes
raw mutations, `App` asks first, and the hook stays synchronous and trivially
testable — its tests have nothing to stub.

## Persistence

**The project is saved automatically.** An effect in `useProjectManager` writes
the whole project to `localStorage` on every change, under a single key. Nothing
is debounced because mutations are discrete — they come from dialogs, not from
keystrokes.

On mount the hook probes storage with a write/read/delete cycle:

- **Available** — it loads any cached project and offers it on the start screen
  as _Previous session found_, with the title, duration and track and cue counts.
  The reader chooses to resume or start fresh; choosing fresh does **not** erase
  the cache, it is overwritten when the new project is created.
- **Blocked** (private browsing, quota, policy) — the app runs normally without
  saving, shows a standing amber banner telling the reader to export before
  closing, and installs a `beforeunload` guard. The guard exists **only** in this
  case: with auto-save working there is nothing unsaved to lose, so a prompt would
  be pure noise.

Every storage operation is wrapped: a failure warns to the console and is
otherwise ignored. A storage problem must never block someone mid-edit.

## The soundtrack

Attaching an audio file is what turns an `mm:ss` grid into a timeline you can place
cues on by ear. Three decisions shape how it works.

**The file is not project data, and never enters `ProjectData`.** A project is a JSON
file people mail each other; a 40 MB recording is not. Nothing in the code would stop
it: `isValidProjectData` does not reject unknown keys, and `migrateProject`
deliberately preserves them — so anything smuggled in would be serialised into every
exported file and held by up to fifty undo snapshots. The guard is discipline. Audio
state lives entirely in `useAudio`; the only thing the project carries is
`metadata.soundtrack`, the file's **name**, which was already free text. On the next
session the app asks for that file back by name.

**Playback is an `HTMLAudioElement`; Web Audio is used only for the waveform.** The
element gives play, pause and seek for free, and its `currentTime` is accurate to a
few milliseconds — far finer than anyone can place a cue by eye. An
`AudioBufferSourceNode` would be sample-accurate but would need its own clock and
cannot be paused. Web Audio does the one thing the element cannot: hand over the
samples. `decodeAudioData` runs **once**, on an `OfflineAudioContext` that never
opens an output device, and the decoded buffer is dropped as soon as
the peaks are out of it. Six minutes of stereo is 121 MB of `Float32` samples at
44.1 kHz, which is why the context asks for 22.05 kHz: `decodeAudioData` resamples to
whatever rate it is given, and 61 MB is the better half of that bargain. A waveform
column spans thousands of samples either way.

**The playhead does not go through React.** It is a percentage `translateX` written
straight onto `style.transform` inside a `requestAnimationFrame` loop. Hovering a
single cue already re-renders every row and every block — an open
[roadmap](../ROADMAP.md) item — and doing that sixty times a second would turn a
known cost into an unusable one.

The waveform itself is thirty lines of arithmetic in
[`utils/waveform.ts`](../src/utils/waveform.ts) rather than a library: a waveform
package would have been a seventh runtime dependency and roughly doubled the bundle.
The whole feature added about 3 kB gzipped.

## Untrusted data has exactly one way in

Two sources are untrusted: the browser cache and an imported JSON file. Both go
through the same two steps, in this order:

```
JSON.parse ──► migrateProject ──► isValidProjectData ──► ProjectData
               (utils/migration)   (utils/validation)
```

- **`migrateProject`** runs the chain `v0 → v1 → v2` and returns `null` for an
  unknown version. It never mutates its input: each step rebuilds the objects
  field by field.
- **`isValidProjectData`** is the single gate. It checks the schema version, the
  metadata, the shape of every track and cue, that track ids are unique, that
  time bounds are finite and ordered, that every `trackIds` entry references a
  track that exists, and that colours are hex.

This mattered: the two paths used to diverge, with the cache validated thoroughly
and the file import — the least trusted input of the two — checking two fields.
A negative duration got through. Full rules are in
[the data model](data_model.md#validation).

## Rendering the timeline

`Timeline` is a `forwardRef` component so `useExport` can capture its DOM node as
an image.

Positions are percentages of the total duration, through `timeToPercent` and its
inverse `percentToTime` in [`utils/timeline.ts`](../src/utils/timeline.ts):

```
left  = timeToPercent(cue.timeStart, durationSeconds)
width = timeToPercent(cue.timeEnd - cue.timeStart, durationSeconds)
```

`percentToTime` is what a click on the time axis uses to decide where to move the
playhead.

**There is one coordinate frame, and it is not the full width.** Cues sit inside a
lane that starts after the 192 px label gutter, so anything spanning the rows —
the multi-track hover band, the playhead — has to be positioned in that same lane or
it is offset by exactly that gutter. The band was, for as long as it existed: measured
in a browser it sat 144 px left of its own cue and was 48 px too wide, invisible
behind `opacity-30` and dashed borders. Both now hang off `LaneOverlay`, which
repeats the `w-48 shrink-0` + `flex-1` pair every row is built from, so the frame
cannot drift unless the rows drift with it.

The time axis picks its interval from a fixed scale of round values — 1, 2, 5,
10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600 seconds — choosing the first that
keeps the axis under 40 labels. A fixed 30s/60s rule used to put ten thousand
markers on the page for a mistyped duration, and left a three-minute timeline
with seven. See [`utils/timeline.ts`](../src/utils/timeline.ts).

A cue that runs on several tracks appears on each of their rows. Hovering or
focusing one draws a dashed band across the full height, so the reader can see
the rows it ties together — only when no track filter is active, since a filtered
view has nothing to tie.

Deleting a track strips its id from every cue, then drops any cue left with no
track at all. That cascade lives in the reducer, so it is undoable like anything
else.

## Dialogs

All four dialogs share one shell, [`Modal`](../src/components/Modal.tsx), which
provides `role="dialog"`, `aria-modal`, `aria-labelledby`, a focus trap, `Escape`
to close, backdrop-press to dismiss, and focus restored to whatever opened it.
Initial focus deliberately skips the close button so the reader lands on the
first form field.

It is hand-written rather than built on the native `<dialog>` element, which
would have given the focus trap and `Escape` for free. **jsdom implements neither
`showModal()` nor `close()`**, so a native dialog could not be covered by this
project's tests. The trade was made knowingly.

## Stack

Versions are in [`package.json`](../package.json); this table names the role of
each piece rather than repeating numbers that drift.

| Concern       | Choice                                           |
| ------------- | ------------------------------------------------ |
| UI            | React 19, StrictMode                             |
| Language      | TypeScript, `strict`                             |
| Build         | Vite 6                                           |
| Styling       | Tailwind CSS 4, via the Vite plugin (no PostCSS) |
| Icons         | lucide-react                                     |
| Image export  | html-to-image                                    |
| Class merging | clsx + tailwind-merge                            |
| Tests         | Vitest, jsdom, Testing Library                   |
| Quality       | ESLint 9, Prettier                               |

There are six runtime dependencies. Adding a seventh needs justifying in the pull
request — see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Deliberate absences

- **No router.** One screen, two states.
- **No state management library.** A reducer and four hooks carry it.
- **No backend, no accounts, no telemetry, no network calls.** This is what keeps
  the project free to run and possible to maintain with nobody on call. It holds
  literally: there is no web font either, because fetching one hands a third party
  the IP address of every reader. The interface uses the system font stack.

## Conventions

- Ids are `crypto.randomUUID()`.
- The `@` import alias points at `src/`, mirrored in `tsconfig.json` and
  `vite.config.ts`.
- The app reads no environment variables. `BASE_PATH` exists only at build time,
  set by the GitHub Pages workflow so the demo can be served from a sub-path.
