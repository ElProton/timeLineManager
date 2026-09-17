# Utilities

Pure functions, no React. Everything here is tested directly — see
[`src/__tests__/`](../src/__tests__/).

---

## `cn` — CSS class merging

**File:** [src/utils/cn.ts](../src/utils/cn.ts)

```typescript
cn(...inputs: ClassValue[]): string
```

Combines `clsx` (conditional class concatenation) with `tailwind-merge`
(resolving Tailwind conflicts). The standard pattern in Tailwind projects.

```tsx
className={cn(
  "base-class",
  isActive && "bg-blue-500",   // clsx: conditional inclusion
  "bg-red-500"                 // tailwind-merge: conflict resolved → bg-red-500 wins
)}
```

---

## `time` — time handling

**File:** [src/utils/time.ts](../src/utils/time.ts)

All of these work on `mm:ss` ↔ whole seconds.

### `formatTime`

```typescript
formatTime(seconds: number): string
```

Formats seconds as zero-padded `mm:ss`. **Minutes are not capped at 59** and it
never rolls over into hours: an hour reads `60:00`.

| Input  | Output    |
| ------ | --------- |
| `0`    | `"00:00"` |
| `75`   | `"01:15"` |
| `600`  | `"10:00"` |
| `3600` | `"60:00"` |

### `parseTime`

```typescript
parseTime(timeStr: string): number
```

Parses `mm:ss` into seconds, returning `0` for anything it cannot parse. The
string is validated by `isValidTimeFormat` **before any digit is read**, because
`parseInt` alone accepts `"01:5abc"` and returns `5`.

| Input       | Output |
| ----------- | ------ |
| `"01:15"`   | `75`   |
| `"10:00"`   | `600`  |
| `"abc"`     | `0`    |
| `"00:99"`   | `0`    |
| `"01:5abc"` | `0`    |

### `isValidTimeFormat`

```typescript
isValidTimeFormat(timeStr: string): boolean
```

True when the string matches `/^\d{2,}:[0-5]\d$/`.

| Input      | Output  |
| ---------- | ------- |
| `"00:00"`  | `true`  |
| `"01:15"`  | `true`  |
| `"00:59"`  | `true`  |
| `"100:00"` | `true`  |
| `"00:99"`  | `false` |
| `"03:60"`  | `false` |
| `"1:5"`    | `false` |
| `"ab:cd"`  | `false` |

**Minutes are deliberately unbounded** — a 100-minute timeline is written
`100:00`, and `formatTime` never produces hours. **Seconds are bounded at 59.**

> **History.** The earlier pattern was `/^\d{2,}:\d{2}$/`, which accepted
> `"00:99"`: the entry silently became 99 seconds and was redisplayed as
> `"01:39"`. No test covered a value above `:59`, so the bug was invisible.

### `sanitiseFilename`

```typescript
sanitiseFilename(name: string): string
```

Makes free text safe as a download filename. Project titles are typed by hand,
so a project called "Gala 1/2" used to produce a filename the browser truncated
or rejected.

| Input                | Output               |
| -------------------- | -------------------- |
| `"Opening ceremony"` | `"Opening_ceremony"` |
| `"Gala 1/2"`         | `"Gala_1-2"`         |
| `"  spaced   out "`  | `"spaced_out"`       |
| `"Boléro final"`     | `"Boléro_final"`     |
| `""`                 | `"timeline"`         |

Forbidden characters (`/ \ : * ? " < > |`) become hyphens, control characters are
stripped, whitespace becomes underscores, and the result is capped at 100
characters. Accented characters are kept. An empty result falls back to
`"timeline"`.

---

## `timeline` — the time axis scale

**File:** [src/utils/timeline.ts](../src/utils/timeline.ts)

```typescript
markerStep(durationSeconds: number): number
markerTimes(durationSeconds: number): number[]
```

Picks the interval between axis labels from a fixed scale of round values — 1, 2,
5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600 seconds — taking the first that
keeps the axis at 40 labels or fewer. Past that scale it falls back to
`Math.ceil(duration / 40)`.

| Duration  | Step chosen         | Markers |
| --------- | ------------------- | ------- |
| 3 min     | 5 s                 | 37      |
| 15 min    | 30 s                | 31      |
| 1 hour    | 2 min               | 31      |
| `9999:00` | 14 999 s (~250 min) | 40      |

> **History.** The earlier rule — 30 s below ten minutes, 60 s above — generated
> **10,000 markers per track row** for a mistyped duration such as `9999:00`,
> which froze the tab. It also left a three-minute timeline with only seven
> labels.

---

## `validation` — structural validation

**File:** [src/utils/validation.ts](../src/utils/validation.ts)

```typescript
isValidProjectData(data: unknown): data is ProjectData
```

The single gate for any untrusted data — browser cache and imported file alike —
run after migration. The full rule list is in
[data_model.md](data_model.md#validation).

---

## `migration` — schema migration

**File:** [src/utils/migration.ts](../src/utils/migration.ts)

```typescript
migrateProject(data: unknown): Record<string, unknown> | null
```

Applies the chain `v0 → v1 → v2`. Returns `null` when the data is unusable or
carries an unknown version.

**It never mutates its input.** Each step rebuilds the objects field by field
rather than deep-cloning — `structuredClone` is unavailable in jsdom, so the
tests could not rely on it.

---

## `storage` — the browser cache

**File:** [src/utils/storage.ts](../src/utils/storage.ts)

```typescript
STORAGE_KEY: string
isCacheAvailable(): boolean
saveCachedProject(data: ProjectData): void
loadCachedProject(): ProjectData | null
clearCachedProject(): void
```

Wraps `localStorage` under a single key. `isCacheAvailable` probes with a
write/read/delete cycle, so private browsing, a full quota or a blocking policy
are all detected the same way.

`loadCachedProject` runs the cached value through `migrateProject` and
`isValidProjectData`, and **clears the entry** when either rejects it, so a
corrupted cache cannot wedge the app on every load.

Every operation swallows its errors and warns to the console: a storage problem
must never block someone mid-edit. `STORAGE_KEY` is exported so tests need not
repeat the literal.
