# Timeline Manager

Build, time and share a production timeline synchronised to a soundtrack.

Lay out who does what, and when, across a shared time axis: cast and crew, lighting
and sound, drones, riders, speakers — anything that has to happen at a precise moment
of a track.

**Everything runs in your browser.** No account, no server, no upload: your project
lives in your own browser storage and in the JSON file you export.

> **Status.** This project started as an internal tool for live show production and is
> being opened up for general use. It works and is covered by tests, but parts of the
> vocabulary and several features are still shaped by that original context — see
> [ROADMAP.md](ROADMAP.md). Contributions are welcome; read
> [MAINTENANCE.md](docs/MAINTENANCE.md) first to know what level of support to expect.

## Features

- Time axis derived from a track duration, with automatic `mm:ss` markers
- One row per participant, one coloured block per timed action
- Actions can span several participants, highlighted together on hover
- Filter the view down to a single participant
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

| Script                 | What it does                                     |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Development server with hot reload, on port 3000 |
| `npm run build`        | Production build into `dist/`                    |
| `npm run preview`      | Serve the production build locally               |
| `npm run typecheck`    | TypeScript type checking, no emit                |
| `npm run lint`         | ESLint over `src/`                               |
| `npm run format`       | Rewrite files with Prettier                      |
| `npm run format:check` | Fail if anything is not Prettier-formatted       |
| `npm test`             | Run the test suite once                          |
| `npm run test:watch`   | Run the test suite in watch mode                 |
| `npm run clean`        | Remove `dist/`                                   |

`npm run verify` runs typecheck, lint, format check, tests and build in one go — the
same sequence as CI.

## How your data is stored

The current project is kept in your browser's `localStorage` under a single key and
is written on every change. It never leaves your machine. Use **Save JSON** to keep a
copy you can archive, share or re-import later; **Reset** clears the stored project.

Exported files carry a `schemaVersion`, and older files are migrated automatically
when imported.

## Tech stack

React 19, TypeScript, Vite 6, Tailwind CSS 4, Vitest. No backend, no external API.

## Documentation

- [Architecture](docs/architecture.md), [components](docs/components.md),
  [data model](docs/data_model.md), [utilities](docs/utilities.md)
- [Development setup](docs/dev_setup.md)
- [Roadmap](ROADMAP.md) — what is planned and what is open to contribution
- [Maintenance policy](docs/MAINTENANCE.md) — how this project is looked after

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), and pick an
issue labelled `good first issue` if you are looking for somewhere to begin.

## Licence

[MIT](LICENSE) © Ryan Lefebvre
