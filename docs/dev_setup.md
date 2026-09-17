# Development setup

## Prerequisites

- **Node.js 20 or later** (CI runs on 20 and 22)
- **npm** (ships with Node.js)

No API key, no external service, no database: the app runs entirely in the
browser.

## Install and run

```bash
npm install
npm run dev
```

The app is then served on <http://localhost:3000>.

## Scripts

| Script                 | Command                           | What it does                                                 |
| ---------------------- | --------------------------------- | ------------------------------------------------------------ |
| `npm run dev`          | `vite --port=3000 --host=0.0.0.0` | Development server with hot reload                           |
| `npm run build`        | `vite build`                      | Production build into `dist/`                                |
| `npm run preview`      | `vite preview`                    | Serve the production build locally                           |
| `npm run clean`        | `rm -rf dist`                     | Remove the build output                                      |
| `npm run typecheck`    | `tsc --noEmit`                    | Type checking, no emit                                       |
| `npm run lint`         | `eslint .`                        | Static analysis                                              |
| `npm run format`       | `prettier --write .`              | Reformat files                                               |
| `npm run format:check` | `prettier --check .`              | Fail if anything is unformatted                              |
| `npm run check:links`  | `node scripts/check-links.mjs`    | Fail on a dead relative link in any Markdown file            |
| `npm test`             | `vitest run`                      | Run the test suite once                                      |
| `npm run test:watch`   | `vitest`                          | Run the test suite in watch mode                             |
| `npm run verify`       | the whole chain                   | typecheck + lint + format:check + check:links + test + build |

`npm run verify` is exactly what CI runs. **Run it before opening a pull
request**: if it passes locally it will pass in CI, and if it fails locally CI
will tell you the same thing more slowly.

## Vite configuration

File: [../vite.config.ts](../vite.config.ts)

### Plugins

| Plugin                 | Role                                    |
| ---------------------- | --------------------------------------- |
| `@vitejs/plugin-react` | JSX / React support                     |
| `@tailwindcss/vite`    | Tailwind CSS 4 integration (no PostCSS) |

### Environment variables

**The application reads none.** There is no `.env`, and no `process.env` access
anywhere in `src/`.

One build-time variable exists: `BASE_PATH`, read in `vite.config.ts` and set by
the GitHub Pages workflow so the demo can be served from a sub-path. It defaults
to `/`, so local development and self-hosting need nothing.

### Path alias

| Alias | Resolves to |
| ----- | ----------- |
| `@/*` | `./src/*`   |

Mirrored in `tsconfig.json` and `vite.config.ts`.

### Tests

Vitest is configured in the same file as Vite:

- `jsdom` environment
- `globals: true`, so `describe` / `it` / `expect` need no import
- `setupFiles: ./src/__tests__/setup.ts`, which loads the
  `@testing-library/jest-dom` matchers and clears the DOM after each test
- test files are `src/**/*.test.{ts,tsx}`

## TypeScript configuration

File: [../tsconfig.json](../tsconfig.json)

| Option                 | Value       | Note                                         |
| ---------------------- | ----------- | -------------------------------------------- |
| `strict`               | `true`      | Full strict mode, non-negotiable             |
| `noUnusedLocals`       | `true`      | Rejects dead variables and imports           |
| `noUnusedParameters`   | `true`      | Prefix with `_` to ignore one deliberately   |
| `verbatimModuleSyntax` | `true`      | Requires `import type` for type-only imports |
| `moduleResolution`     | `bundler`   | Matches Vite                                 |
| `jsx`                  | `react-jsx` | No need to import `React`                    |
| `noEmit`               | `true`      | TypeScript is used for checking only         |

> **History.** `@types/react` and `@types/react-dom` were missing from this
> project until its overhaul. With `strict` also off, every JSX element was
> implicitly `any` and `tsc --noEmit` passed while verifying nothing. Do not
> remove those two packages.

## Code quality

| Tool           | Config file        | Scope                                              |
| -------------- | ------------------ | -------------------------------------------------- |
| ESLint 9       | `eslint.config.js` | recommended JS, `typescript-eslint`, React hooks   |
| Prettier 3     | `.prettierrc.json` | Everything but `dist`, `coverage` and the lockfile |
| EditorConfig   | `.editorconfig`    | Indentation, line endings, encoding                |
| Git attributes | `.gitattributes`   | Forces LF line endings                             |

Source files are **UTF-8 without BOM**. The repository was purged of them; do not
reintroduce one (some Windows editors add one by default).

## File layout

```
timeLineManager/
├── index.html                    # SPA entry point
├── eslint.config.js
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── favicon.svg
├── scripts/
│   └── check-links.mjs           # Markdown link checker used by CI
├── examples/                     # Sample projects, incl. a v1 file for migration
├── docs/                         # Technical documentation (this folder)
└── src/
    ├── main.tsx                  # React root: createRoot + StrictMode + ErrorBoundary
    ├── App.tsx                   # Composition; holds no state
    ├── types.ts                  # Domain model, schema version, duration cap
    ├── index.css                 # Tailwind import + Inter font
    ├── components/
    │   ├── ProjectInit.tsx       # Start screen: create, import, resume
    │   ├── Timeline.tsx          # Time axis and track rows (forwardRef)
    │   ├── Modal.tsx             # Accessible dialog shell
    │   ├── CueModal.tsx          # Cue create/edit
    │   ├── TrackModal.tsx        # Track create/edit
    │   ├── MetadataModal.tsx     # Project settings
    │   ├── ConfirmDialog.tsx     # Replaces native confirm()
    │   └── ErrorBoundary.tsx     # Render-error fallback
    ├── hooks/
    │   ├── projectReducer.ts     # Reducer, event union, undo/redo history
    │   ├── useProjectManager.ts  # Project state and persistence
    │   ├── useModals.ts          # Dialog open/close and editing target
    │   ├── useExport.ts          # JSON and JPEG export
    │   └── useConfirm.ts         # Promise-based confirmation
    ├── utils/
    │   ├── cn.ts                 # clsx + tailwind-merge
    │   ├── time.ts               # mm:ss parsing, formatting, filename sanitising
    │   ├── timeline.ts           # Bounded time-axis scale
    │   ├── storage.ts            # localStorage cache
    │   ├── migration.ts          # Schema migration chain
    │   └── validation.ts         # The single gate for untrusted data
    └── __tests__/
        ├── setup.ts              # Vitest setup (jest-dom + cleanup)
        ├── fixtures.ts           # Shared ProjectData builders
        └── *.test.{ts,tsx}
```

## Styling

- **Framework:** Tailwind CSS 4 through the Vite plugin, so there is no
  `tailwind.config.js`
- **Theme:** configured with `@theme` in [../src/index.css](../src/index.css)
- **Font:** Inter, loaded from Google Fonts
- **Palette:** `neutral` for surfaces, `indigo` for accents
