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
            ├── Timeline     the time axis and the track rows
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

`App` holds **no** state. It calls four hooks and wires their return values into
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

### `useModals`, `useExport`, `useConfirm`

- **`useModals`** — which dialog is open, and which entity it is editing.
  `null` means "create", an object means "edit".
- **`useExport`** — the `ref` onto the timeline node, JSON download, JPEG capture
  via `html-to-image`, and an `exportError` string surfaced as an in-app banner
  rather than thrown or `alert()`ed.
- **`useConfirm`** — a promise-based `confirm(options)` so call sites read top to
  bottom: `if (!(await confirm({...}))) return;`

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

Positions are percentages of the total duration:

```
left  = (cue.timeStart / durationSeconds) * 100%
width = ((cue.timeEnd - cue.timeStart) / durationSeconds) * 100%
```

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
  the project free to run and possible to maintain with nobody on call.

## Conventions

- Ids are `crypto.randomUUID()`.
- The `@` import alias points at `src/`, mirrored in `tsconfig.json` and
  `vite.config.ts`.
- The app reads no environment variables. `BASE_PATH` exists only at build time,
  set by the GitHub Pages workflow so the demo can be served from a sub-path.
