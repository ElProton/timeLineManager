# Timeline Manager

[![CI](https://github.com/ElProton/timeLineManager/actions/workflows/ci.yml/badge.svg)](https://github.com/ElProton/timeLineManager/actions/workflows/ci.yml)
[![Licence: MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

Build, time and share a production timeline synchronised to a soundtrack.

Lay out who does what, and when, across a shared time axis: cast and crew, lighting
and sound, drones, riders, speakers — anything that has to happen at a precise moment
of a track.

**Everything runs in your browser.** No account, no server, no upload: your project
lives in your own browser storage and in the JSON file you export.

> **Status.** This project started as an internal tool for live show production and is
> being opened up for general use. The theatre vocabulary has gone and it now plays
> the soundtrack it times against, but several features are still missing for anyone
> who is not its author — see [ROADMAP.md](ROADMAP.md). Contributions are welcome;
> read [MAINTENANCE.md](docs/MAINTENANCE.md) first to know what level of support to
> expect.

**[Try it →](https://elproton.github.io/timeLineManager/)** — nothing to install.
Import one of the [example projects](examples/) to see a filled-in timeline.

## Features

- **Attach an audio file and hear it**: play/pause, a playhead that follows the
  sound, the waveform drawn behind the tracks, and a click on the time axis to jump
  to a moment. Space plays and pauses, the arrow keys seek
- Time axis with automatic `mm:ss` markers, and the option to take the timeline's
  length from the audio file itself
- One **track** per row — a person, a team, a device, a channel
- One coloured **cue** per timed block; a cue can span several tracks and is
  highlighted across all of them on hover
- **Retime a cue on the timeline itself**: drag it, stretch it by either edge, or
  nudge it with the arrow keys. It snaps to the playhead and to neighbouring cues,
  and a whole gesture is a single undo
- **Zoom** in to place cues to the second across a long track
- Filter the view down to a single track
- Undo / redo across every edit
- Automatic save to browser storage, with session recovery on reload
- Import and export as a versioned JSON file, with automatic schema migration
- Export the timeline as a JPEG image

## Getting started

**Prerequisites:** Node.js 20 or later.

```bash
npm install
npm run dev
```

The app is then served on <http://localhost:3000>.

## Scripts

| Script                 | What it does                                      |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Development server with hot reload, on port 3000  |
| `npm run build`        | Production build into `dist/`                     |
| `npm run preview`      | Serve the production build locally                |
| `npm run typecheck`    | TypeScript type checking, no emit                 |
| `npm run lint`         | ESLint over `src/`                                |
| `npm run format`       | Rewrite files with Prettier                       |
| `npm run format:check` | Fail if anything is not Prettier-formatted        |
| `npm run check:links`  | Fail on a dead relative link in any Markdown file |
| `npm test`             | Run the test suite once                           |
| `npm run test:watch`   | Run the test suite in watch mode                  |
| `npm run clean`        | Remove `dist/`                                    |

`npm run verify` runs typecheck, lint, format check, the link check, tests and build
in one go — the same sequence as CI.

## How your data is stored

The current project is kept in your browser's `localStorage` under a single key and
is written on every change. It never leaves your machine. Use **Save JSON** to keep a
copy you can archive, share or re-import later; **Reset** clears the stored project.

Exported files carry a `schemaVersion`, and older files are migrated automatically
when imported — including projects saved before the tracks-and-cues rename. See
[the data model](docs/data_model.md).

**The audio file is not part of the project.** It is read from your disk, played, and
never uploaded, stored or exported — a project is a JSON file you can mail someone,
and a 40 MB recording is not. What the project keeps is the file's _name_, so the app
can ask you for it again next time you open the timeline.

## Tech stack

React 19, TypeScript, Vite 6, Tailwind CSS 4, Vitest. No backend, no external API.

## Documentation

- [Development setup](docs/dev_setup.md) — start here
- [Architecture](docs/architecture.md), [components](docs/components.md),
  [data model](docs/data_model.md), [utilities](docs/utilities.md)
- [Architecture decisions](docs/adr/), [specifications](docs/specs/) and [example projects](examples/)
- [Roadmap](ROADMAP.md) — what is planned and what is open to contribution
- [Maintenance policy](docs/MAINTENANCE.md) — how this project is looked after
- [Security policy](SECURITY.md)

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), and pick an
issue labelled `good first issue` if you are looking for somewhere to begin. The
[roadmap](ROADMAP.md) marks the items that need no prior knowledge of the codebase.

**Have three pull requests merged and you can ask for commit access** — see
[MAINTENANCE.md](docs/MAINTENANCE.md). This project is meant to outlive any single
maintainer.

## Licence

[MIT](LICENSE) © Ryan Lefebvre
