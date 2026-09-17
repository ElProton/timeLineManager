# Spec: local cache (auto-save)

> **Status: implemented, archived.** This is the original specification, kept as
> a record of what was decided and why. It is **not** maintained and must not be
> read as a description of the current code — for that, see
> [architecture.md](../architecture.md).
>
> **Where the shipped code deliberately differs**, and why:
>
> | Spec                                                   | What shipped                                                                                                                                   |
> | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
> | The `useEffect`s live in `App.tsx`                     | They live in `useProjectManager`. `App` holds no state at all.                                                                                 |
> | `beforeunload` guards unconditionally                  | It is installed **only** when storage is blocked. With auto-save working there is nothing unsaved to lose, so a prompt would be noise.         |
> | ALT-03: storage unavailable shows **no visible error** | A standing amber banner tells the reader to export before closing. Silently not saving someone's work was judged worse than a visible warning. |
> | Purge uses native `confirm()`                          | It uses the in-app `ConfirmDialog` via `useConfirm`.                                                                                           |
> | `loadCachedProject` validates                          | It **migrates first**, then validates, so a cache written by an older version still loads.                                                     |
>
> The functional rules RG-01 to RG-07 below all hold. The French original is in
> the git history.

## 1. Summary

**Goal:** remove the risk of losing work by persisting the project automatically
in the browser's `localStorage`, and offering to restore it on next launch.

**Consumer:** the person using the app.

**Criticality at the time:** high — the absence of any persistence was the
application's main weakness.

## 2. Scope

### 2.1 In scope

- Automatic save of `ProjectData` to `localStorage` on every mutation
- Restore on launch, with an explicit user choice: resume or start fresh
- Manual purge from the header
- Protection against accidental tab closure (`beforeunload`)

### 2.2 Out of scope

- A "last saved N seconds ago" indicator — comfort, not needed for the first cut
- Multiple projects in the cache — needs a different storage model (indexed keys,
  a project picker)

## 3. Functional rules

| ID    | Rule                                                                                                   | Rationale                                                    |
| ----- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| RG-01 | The cache is written on every mutation of the project                                                  | Mutations are discrete, through dialogs — no debounce needed |
| RG-02 | A single `localStorage` entry is used                                                                  | One project at a time                                        |
| RG-03 | If a valid cache exists at launch, the reader chooses between resuming and starting fresh              | Never silently load an old project                           |
| RG-04 | Choosing "new project" does **not** purge the cache; it is overwritten when the new project is created | A safety net against a misclick                              |
| RG-05 | The purge button removes the entry **and** resets the project to `null`                                | A clean return to the initial state                          |
| RG-06 | If `localStorage` is unavailable or full, the app works on without a cache                             | A storage problem must never block the reader                |
| RG-07 | Importing a JSON file or creating a project overwrites the cache rather than deleting it               | The import or creation becomes the new source of truth       |

## 4. Scenarios

### Nominal — automatic save

1. The reader changes the project
2. An effect observes the change
3. The project is serialised and written to `localStorage`
4. No visual feedback; the operation is silent

### Nominal — restore on launch

1. The reader opens the app
2. A valid cache entry is found
3. The start screen shows _Previous session found_ with the project's title,
   soundtrack, duration, and its track and cue counts
4. **Resume** loads it directly; **New Project** shows the create form

### Nominal — manual purge

1. The reader presses Reset in the header
2. A confirmation is requested
3. On confirm, the entry is removed and the app returns to the start screen
4. On cancel, nothing happens

### Alternative and error paths

| ID     | Condition                            | Expected behaviour                                    | Console                                                     |
| ------ | ------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------- |
| ALT-01 | Empty cache at launch                | Normal start screen, no restore banner                | —                                                           |
| ALT-02 | Cache holds invalid or corrupt JSON  | Drop the entry silently, show the normal start screen | `warn("Cached project data is corrupted, clearing cache.")` |
| ALT-03 | `localStorage` unavailable           | The app works without a cache                         | `warn("localStorage unavailable, auto-save disabled.")`     |
| ERR-01 | A write fails (`QuotaExceededError`) | Ignore, log                                           | `warn("Failed to save to cache:", error)`                   |

## 5. Technical design

### 5.1 Module

`src/utils/storage.ts` encapsulates every `localStorage` operation as stateless
functions:

```typescript
const STORAGE_KEY = "stm_project_cache";

isCacheAvailable(): boolean
saveCachedProject(data: ProjectData): void
loadCachedProject(): ProjectData | null
clearCachedProject(): void
```

`loadCachedProject` returns `null` when there is no data, the JSON does not
parse, or the structure does not validate, and removes the corrupt entry before
returning.

### 5.2 Constraints

- `localStorage` holds roughly 5 MB per origin, far beyond any realistic project
- Serialisation is `JSON.stringify` without pretty-printing; the readable form is
  reserved for the file export
- Writes are synchronous, one per mutation

### 5.3 Security

No authentication, no sensitive data. The cache is plain text readable by anyone
with access to the browser profile — which is how browsers work, and the tool
stores nothing confidential. Validation on read is what protects the app from a
tampered entry.

### 5.4 Observability

Three console warnings, listed in the table above. A fourth was added later for a
failing `removeItem`.

## 6. Definition of done

- [x] The project persists on every mutation
- [x] Reopening the app offers to restore
- [x] Resume loads the cached project
- [x] New Project shows the form without purging
- [x] The header carries a purge button with confirmation
- [x] Import and creation overwrite the cache
- [x] A corrupt cache does not crash the app
- [x] `storage.ts` is independently testable, and tested
- [x] `tsc --noEmit` passes
- [ ] ~~Storage unavailable shows no visible error~~ — **reversed on purpose**, see
      the status header
