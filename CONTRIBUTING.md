# Contributing

Thanks for considering it. This project is low-maintenance by design — please read
[the maintenance policy](docs/MAINTENANCE.md) so you know what to expect before you
invest time.

## Quick start

```bash
git clone https://github.com/ElProton/timeLineManager.git
cd timeLineManager
npm install
npm run dev          # http://localhost:3000
```

Before opening a pull request:

```bash
npm run verify
```

That runs typecheck, lint, format check, tests and build — **the exact sequence CI
runs**. If it passes locally, it will pass in CI. If it fails locally, CI will tell
you the same thing more slowly.

## Where to start

- Issues labelled **`good first issue`** are self-contained and need no prior
  knowledge of the codebase.
- Issues labelled **`help wanted`** are on the roadmap and unassigned.
- [ROADMAP.md](ROADMAP.md) lists what is planned. Anything on it is fair game; you
  do not need to ask first.

**You do not need permission to start work.** Comment on the issue so two people do
not do the same thing, then go.

## Ground rules

### The hard constraint

**The app runs entirely in the browser.** No backend, no accounts, no telemetry, no
analytics, no network calls to anything. Projects live in the user's own browser
storage and in the JSON files they export.

This is not conservatism. It is what makes the project free to run, free to host and
possible to maintain without anyone on call. A pull request that breaks it will be
declined regardless of how good the feature is.

### Stay generic

This started as a tool for live show production, and it still carries some of that
vocabulary. **It is being deliberately widened**, not narrowed. When you add
something, ask whether a lighting operator, a wedding planner, a drone show
programmer and a video editor would all recognise it. If a feature only makes sense
for one trade, make it optional.

### Scope

One pull request, one change. A refactor and a feature in the same branch take four
times as long to review and are four times more likely to stall.

## Code conventions

They are enforced by tooling, so you mostly do not have to think about them:

- **TypeScript strict.** `any` needs a comment explaining itself.
- **`import type`** for type-only imports (`verbatimModuleSyntax` is on).
- **Prettier** decides formatting. Run `npm run format`; do not argue with it.
- **ESLint** must pass with zero warnings.
- **UTF-8, no BOM, LF line endings.** `.editorconfig` and `.gitattributes` handle
  this; check your editor is not adding a BOM if you are on Windows.

### Structure

| Directory         | What belongs there                         |
| ----------------- | ------------------------------------------ |
| `src/components/` | Presentational React components            |
| `src/hooks/`      | State and behaviour, including the reducer |
| `src/utils/`      | Pure functions, no React                   |
| `src/types.ts`    | The data model and the schema version      |
| `src/__tests__/`  | Tests, mirroring the file they cover       |

Business logic goes in hooks or utils, not in components. It is what makes the
current test suite possible.

## Tests

Vitest and Testing Library are already set up.

- Utilities and reducers: test them directly, they are pure.
- Hooks: `renderHook` from `@testing-library/react`.
- **Any behaviour change needs a test.** Any bug fix needs a test that fails before
  the fix.

```bash
npm test             # once
npm run test:watch   # while working
```

## Changing the data model

`ProjectData` carries a `schemaVersion`, and users have JSON files on disk that must
keep opening. If you change the shape of the model:

1. Bump `CURRENT_SCHEMA_VERSION` in `src/types.ts`.
2. Add a migration step in `src/utils/migration.ts`.
3. Add a test in `src/__tests__/migration.test.ts` that migrates a realistic file
   from **every** earlier version.

A change that silently breaks existing files will not be merged.

## Commits and pull requests

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add zoom control to the time axis
fix: reject times with more than 59 seconds
docs: document the migration procedure
chore: update dependencies
```

Explain **why** in the body, not what — the diff already says what.

In the pull request description, say what changes, why, and how you checked it. If
it changes the interface, a screenshot saves a review round trip.

## Language

**The repository is in English** — code, comments, documentation, issues and pull
requests alike — so that anyone can read the reducer or the migration chain
before changing them.

The one exception is [`docs/contrib/ai-agents/`](docs/contrib/ai-agents/), a set
of optional editor-agent definitions kept in French. They are not part of the
build and nobody needs them to contribute.

The user interface is English only; see [the roadmap](ROADMAP.md) for
internationalisation.

## Code of conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Licence

Contributions are licensed under the [MIT Licence](LICENSE), like the rest of the
project.
