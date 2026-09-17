# Roadmap

What this project intends to become, and what is open for you to pick up.

Nothing here is dated, and nothing here is assigned. This is a
[low-maintenance project](docs/MAINTENANCE.md): items get done when someone does
them. **If an item matters to you, that someone can be you** — comment on the
matching issue and start. You do not need permission.

Legend: 🟢 good first issue · 🔵 needs some familiarity with the codebase · 🟣 large

---

## The direction

Timeline Manager started as an internal tool for live show production. It works, but
it still reads like a theatre tool: it talks about _actors_ and _scenes_, and it asks
for a _music track name_.

**The goal is to make the same idea useful to anyone who has to make things happen at
precise moments of a soundtrack**: lighting, sound and video operators, drone and
pyrotechnics shows, choreographers, event and wedding planners, podcast and video
editors, conference stage managers, equestrian and sports displays.

Two principles hold across everything below:

1. **It stays in the browser.** No backend, no accounts, no telemetry. This is what
   keeps the project free to run and possible to maintain with nobody on call.
2. **It stays generic.** Trade-specific behaviour is welcome as an option, never as
   the default.

---

## 1. Generic vocabulary — _planned, schema v2_

The data model still uses the vocabulary of the original use case. It is being
renamed, with automatic migration so existing JSON files keep opening.

| Today                  | Becomes                 | Why                                                                                        |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| `Actor`                | `Track`                 | A lighting desk, a drone swarm and a caterer are not "actors". Also ambiguous in software. |
| `Action`               | `Cue`                   | "Cue" is the standard term across live performance, broadcast and events.                  |
| `musicName` (required) | `soundtrack` (optional) | You might be timing against a voice-over, a video timecode or a minute-by-minute brief.    |

Placeholders like "Boléro", "Final Tableau" and "Enter Stage Left" go with it.

🔵 **[Schema v2 and migration]** — the migration chain and its tests already exist in
`src/utils/migration.ts`; this extends them.

---

## 2. Actually musical — _the biggest gap_

The project promises a timeline "synchronised to a soundtrack", but the application
knows nothing about sound. It draws an `mm:ss` grid and stops there. In its current
state it is a Gantt chart measured in minutes.

This is where the difference lies between _another Gantt tool_ and _the tool people
were looking for_. All of it is possible locally through the Web Audio API, with no
server and no upload.

- 🟣 **Load an audio file, play it, show a playhead** — the signature feature.
- 🟣 **Waveform display behind the timeline** — makes placing a cue by eye possible.
- 🔵 **BPM, bar and beat grid, snap-to-beat** — what makes "musical" mean something.
- 🟢 **Section markers on the axis** (intro, chorus, blackout, go) — small, useful now,
  and does not depend on audio loading.

---

## 3. Editing that does not fight you

Today every adjustment means opening a modal and retyping `mm:ss`. This is the first
thing that makes real use painful.

- 🟣 **Drag and resize blocks directly on the timeline.**
- 🔵 **Zoom on the time axis** — required as soon as you are placing cues to the second
  across a fifteen-minute track.
- 🟢 **Keyboard shortcuts** — `Ctrl+Z` / `Ctrl+Y` for the existing undo/redo,
  `Ctrl+S` to export, `Delete` to remove the selection.
- 🔵 **Overlap detection** — warn when one track has two cues at the same moment.

---

## 4. Organising real projects

- 🔵 **Multiple projects.** There is currently one `localStorage` slot: a new project
  replaces the previous one. This blocks any repeated use.
- 🔵 **Layers / track groups.** Separate artistic from technical, or teams from
  suppliers. There is a design for this in
  [`docs/adr/001-layer-system.md`](docs/adr/001-layer-system.md) — the reasoning
  holds, the implementation predates the current architecture and needs redoing.
- 🟢 **Colour per track, and a customisable palette.** Ten colours are currently
  hard-coded in `ActionModal.tsx`.

---

## 5. Getting the timeline out

A timeline is mostly used _away_ from the screen — printed, on a clipboard, at a
lighting desk.

- 🟢 **Print stylesheet and PDF export.** The current JPEG export prints badly.
- 🟢 **CSV export**, for spreadsheets and manual running orders.
- 🔵 **Share by URL**, encoding the project in the link — no server needed.

---

## 6. Reach

- 🔵 **Internationalisation (English / French).** The interface is English, except for
  a few French strings in the project settings modal. Strings need extracting first.
- 🔵 **Keyboard and screen reader accessibility.** Modals have no `Escape` handler,
  no focus trap and no ARIA roles; the timeline cannot be navigated by keyboard.
  Relevant on stage too, where hands are busy.
- 🔵 **Responsive layout.** The timeline assumes at least 800 px. Tablets are exactly
  where you consult a running order.
- 🟢 **Dark mode.** Backstage is dark.

---

## 7. Robustness

Known defects, each small and self-contained. Good places to start.

- 🟢 **`00:99` is accepted as a valid time** and silently becomes `01:39`.
  `isValidTimeFormat` does not bound the seconds field.
- 🟢 **A typo in the duration can freeze the tab.** `9999:00` generates ten thousand
  time markers per track row.
- 🟢 **Import validation is weaker than cache validation.** `isValidProjectData` in
  `storage.ts` is thorough but only guards the cache; the file import path checks
  almost nothing, so a negative duration gets through.
- 🟢 **`migrateProject` mutates its argument** instead of copying it.
- 🟢 **Exported filenames are not sanitised** — a project called `Gala 1/2` produces a
  broken filename.
- 🟢 **Native `confirm()` and `alert()`** are used in five places: unstyled,
  untranslatable and blocked in some embedded contexts.
- 🟢 **No React error boundary** — a render error blanks the page silently.
- 🔵 **`beforeunload` protection is specified but never implemented**
  (see `docs/specs/cache_local_autosave.md` §2.1).
- 🔵 **No component tests.** The utilities, reducer and hooks are well covered;
  the components are not covered at all.

---

## Explicitly not planned

Not because they are bad ideas, but because they would change what this project is
and what it costs to keep alive. A fork is the right home for them.

- **A backend, user accounts or cloud sync.** Something would have to be hosted, paid
  for, secured and kept up — see [the maintenance policy](docs/MAINTENANCE.md).
- **Real-time collaboration.** Same reason.
- **Telemetry or analytics** of any kind.
- **A mobile app.** The web app should simply work on a tablet.

---

## Suggesting something

Open an issue. Say what you are trying to do and why the current tool gets in the
way — that is far more useful than a proposed solution. It will be labelled and land
on this page.

Bear in mind that **an item on this roadmap is a statement of intent, not a
commitment**, and that a pull request will always get there faster than a request.
