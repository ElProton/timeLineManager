## What this changes

<!-- One or two sentences. What is different after this is merged? -->

## Why

<!-- What problem does it solve? Link the issue if there is one: Fixes #123 -->

## How it was checked

<!-- Which scenarios you exercised by hand. A screenshot or a short clip saves a
     review round trip when the interface changes. -->

## Checklist

- [ ] `npm run verify` passes locally (typecheck, lint, format, tests, build)
- [ ] Behaviour changes are covered by a test; bug fixes include a test that failed before
- [ ] This adds no backend, account system, telemetry or network call
- [ ] No new runtime dependency, or the description explains why one is needed
- [ ] If `ProjectData` changed: `CURRENT_SCHEMA_VERSION` bumped, migration added, migration test added
- [ ] If `src/hooks/` or `src/types.ts` changed: the affected docs under `docs/` were updated
