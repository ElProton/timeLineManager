# Roadmap

What this project intends to become, and what is open for you to pick up.

Nothing here is dated, and nothing here is assigned. This is a
[low-maintenance project](docs/MAINTENANCE.md): items get done when someone does
them. **If an item matters to you, that someone can be you** — comment on the
matching issue and start. You do not need permission.

Legend: ✅ delivered · 🟢 good first issue · 🔵 needs some familiarity with the
codebase · 🟣 large

---

## The direction

Timeline Manager started as an internal tool for live show production, and read like
one: it talked about _actors_ and _actions_, and demanded the name of a music track.
That vocabulary has gone (§1), and the app now plays the soundtrack rather than
merely naming it (§2). What is left below is the distance between a tool one person
could use and one anybody can.

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

## 1. Generic vocabulary — _delivered, schema v2_

The data model used the vocabulary of the original use case. It has been renamed,
with automatic migration so existing JSON files keep opening — there is a v1 file in
[`examples/`](examples/) that exercises exactly that.

| Today                  | Becomes                 | Why                                                                                        |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| `Actor`                | `Track`                 | A lighting desk, a drone swarm and a caterer are not "actors". Also ambiguous in software. |
| `Action`               | `Cue`                   | "Cue" is the standard term across live performance, broadcast and events.                  |
| `musicName` (required) | `soundtrack` (optional) | You might be timing against a voice-over, a video timecode or a minute-by-minute brief.    |

Placeholders like "Boléro", "Final Tableau" and "Enter Stage Left" went with it, and
`metadata.musicName` became the optional `metadata.soundtrack`.

---

## 2. Actually musical — _core delivered_

Attach a local audio file and the timeline plays it: a transport, a playhead that
follows the sound, the waveform behind the tracks, and a click on the time axis or
the waveform to move there. Space plays and pauses, the arrow keys seek five seconds.

The file never leaves the machine and is not part of the exported project, so it is
re-attached each session — the project stores only its name, in
`metadata.soundtrack`, and the app asks for it back by name.

- ✅ **Load an audio file, play it, show a playhead.**
- ✅ **Waveform display behind the timeline.**
- 🔵 **BPM, bar and beat grid, snap-to-beat** — what makes "musical" mean something.
  It now has an audio layer to sit on. Two things to know before starting: at 120 BPM
  a four-minute track is 480 beats **per track row**, and `MAX_MARKERS = 40` exists
  precisely because an unbounded marker generator once froze the tab — a beat grid
  has to be bounded, or drawn on the canvas, never as DOM nodes. And a BPM is project
  data, so it means schema v3 and a migration; see
  [CONTRIBUTING.md](CONTRIBUTING.md).
- 🟢 **Section markers on the axis** (intro, chorus, blackout, go) — small, useful now,
  and does not depend on audio at all.
- 🔵 **Remember the attached file between sessions**, in IndexedDB. Deliberately left
  out: `localStorage` holds around 5 MB against a 3–50 MB recording, and jsdom
  provides no IndexedDB, so it would be the first untested code in the project.

---

## 3. Editing that does not fight you

Today every adjustment means opening a modal and retyping `mm:ss`. This is the first
thing that makes real use painful.

- 🟣 **Drag and resize blocks directly on the timeline.**
- 🔵 **Zoom on the time axis** — required as soon as you are placing cues to the second
  across a fifteen-minute track.
- 🟢 **Keyboard shortcuts.** The transport has some — space plays and pauses, the
  arrow keys seek — handled in `AudioBar.tsx`, which also shows how to tell a
  shortcut from someone typing in a field. Still missing: `Ctrl+Z` / `Ctrl+Y` for the
  existing undo/redo, `Ctrl+S` to export, `Delete` to remove the selection.
- 🔵 **Overlap detection** — warn when one track has two cues at the same moment.
- 🔵 **Rendering performance on large projects.** `hoveredCueId` is local state in
  `Timeline`, so hovering one cue re-renders every track row and every block. Only
  the time-axis markers are memoised (`useMemo` in `Timeline.tsx`). Splitting the
  rows into memoised components, or lifting hover out of the render path, is the
  obvious fix.

---

## 4. Organising real projects

- 🔵 **Multiple projects.** There is currently one `localStorage` slot: a new project
  replaces the previous one. This blocks any repeated use.
- 🔵 **Layers / track groups.** Separate artistic from technical, or teams from
  suppliers. There is a design for this in
  [`docs/adr/001-layer-system.md`](docs/adr/001-layer-system.md) — the reasoning
  holds, the implementation predates the current architecture and needs redoing.
- 🟢 **Colour per track, and a customisable palette.** Ten colours are currently
  hard-coded in `CueModal.tsx`.

---

## 5. Getting the timeline out

A timeline is mostly used _away_ from the screen — printed, on a clipboard, at a
lighting desk.

- 🟢 **Print stylesheet and PDF export.** The current JPEG export prints badly.
- 🟢 **CSV export**, for spreadsheets and manual running orders.
- 🔵 **Share by URL**, encoding the project in the link — no server needed.

---

## 6. Reach

- 🔵 **Internationalisation (English / French).** The interface is entirely English
  and its strings are hard-coded in the components. Extracting them is the first
  step; there is no i18n library in the project.
- 🔵 **Keyboard and screen reader accessibility.** Dialogs are already handled —
  `Escape`, focus trap, focus restoration and `role`/`aria-modal` all live in
  `Modal.tsx` — and a cue can be focused and opened with `Enter` or `Space`. What is
  missing is moving between tracks and cues from the keyboard without tabbing through
  every block, and a coherent screen-reader reading of the timeline as a whole.
  Relevant on stage too, where hands are busy.
- 🔵 **Responsive layout.** The timeline assumes at least 800 px. Tablets are exactly
  where you consult a running order.
- 🟢 **Dark mode.** Backstage is dark.

---

## 7. Robustness

Known defects, each small and self-contained. Good places to start.

Most of the defects found in the first audit are fixed. What is left:

- 🔵 **Component test coverage is thin.** The utilities, reducer, hooks, `Modal` and
  the confirmation flow are covered; the form modals, `Timeline`, `ProjectInit`,
  `AudioBar` and `Waveform` are not. The last two need a browser: jsdom has no Web
  Audio, no canvas and no `ResizeObserver`.
- 🟢 **The time axis crowds its own labels on short timelines.** `MAX_MARKERS = 40`
  bounds the marker count so the tab cannot freeze, but says nothing about how wide a
  label is: a 40-second timeline draws 41 labels about 26 px apart and they overlap.
  The axis needs to pick its interval from the lane's width in pixels, not from the
  duration alone. See `markerStep` in `src/utils/timeline.ts`.

Already fixed, listed so nobody re-reports them: `00:99` accepted as a time, a
mistyped duration freezing the tab, import validation weaker than cache validation, a
mutating `migrateProject`, unsanitised export filenames, native `confirm()`/`alert()`,
no error boundary, the unimplemented `beforeunload` guard, the Inter font fetched
from Google Fonts on every load, and a multi-track hover band drawn 192 px left of
the cues it bracketed.

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
