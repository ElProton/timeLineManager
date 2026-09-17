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

All of these work on `mm:ss` ↔ whole seconds, except `formatTimePrecise`.

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

### `formatTimePrecise`

```typescript
formatTimePrecise(seconds: number): string
```

`mm:ss.t`, for the transport readout. `formatTime` floors to whole seconds, which is
right for the fields a reader types but leaves a moving playhead looking stuck for six
frames at a time. Kept separate so the input format cannot drift behind it. Truncates
rather than rounds, like `formatTime`, and never shows a negative position.

| Input   | Output      |
| ------- | ----------- |
| `0`     | `"00:00.0"` |
| `12.4`  | `"00:12.4"` |
| `59.99` | `"00:59.9"` |
| `-5`    | `"00:00.0"` |

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

## `timeline` — the time axis, and time ↔ position

**File:** [src/utils/timeline.ts](../src/utils/timeline.ts)

```typescript
markerStep(durationSeconds: number, laneWidthPx?: number): number
markerTimes(durationSeconds: number, laneWidthPx?: number): number[]
timeToPercent(seconds: number, durationSeconds: number): number
percentToTime(percent: number, durationSeconds: number): number
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

Given a **lane width** it also accounts for the room a label needs, which is
what makes zooming worth anything: four times the width earns more labels rather
than the same ones spread further apart. Without it the interval comes from the
duration alone, exactly as before.

| Duration and lane | Step | Labels | Apart               |
| ----------------- | ---- | ------ | ------------------- |
| 40 s, no width    | 1 s  | 41     | — (they overlapped) |
| 40 s in 1059 px   | 5 s  | 9      | 133 px              |
| 40 s in 4959 px   | 1 s  | 41     | 106 px              |

> **History.** The earlier rule — 30 s below ten minutes, 60 s above — generated
> **10,000 markers per track row** for a mistyped duration such as `9999:00`,
> which froze the tab. It also left a three-minute timeline with only seven
> labels. Bounding the _count_ fixed the freeze and said nothing about whether
> the labels fit: a 40-second timeline drew 41 of them 26 px apart, and they
> ran into each other until the width was taken into account.

### `timeToPercent` and `percentToTime`

Every position on screen is a percentage of the total duration — axis markers, grid
lines, cue blocks, the playhead. Applied to the difference of two times,
`timeToPercent` gives a width instead of an offset; the arithmetic is the same.
`percentToTime` is the inverse, and is what a click on the time axis uses.

`percentToTime(timeToPercent(t, d), d) === t`, within floating-point tolerance.

**Only one of them clamps, deliberately.**

| Function        | Clamps?     | Why                                                                                                                                                                     |
| --------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timeToPercent` | No          | `timeEnd <= durationSeconds` is enforced by `CueModal`, not by `isValidProjectData`, so an imported cue can run past the end — and it should visibly overflow its lane. |
| `percentToTime` | To `[0, d]` | A pointer can leave the element it was measured against, and seeking to a negative time is not a thing.                                                                 |

Both return `0` for a duration of zero or less, rather than `Infinity` or `NaN`.

The playhead does its own clamping, because a playhead past the end means the file is
longer than the timeline and belongs at the end — not overflowing it.

> **History.** This conversion was copied to four places in `Timeline.tsx` and its
> inverse did not exist, which is exactly what clicking the timeline needed.

---

## `waveform` — peak extraction

**File:** [src/utils/waveform.ts](../src/utils/waveform.ts)

```typescript
interface Peak { min: number; max: number }
computePeaks(channels: Float32Array[], buckets: number): Peak[]
```

Reduces a decoded signal to one min/max pair per column of the waveform drawing. This
is the whole of the waveform maths: a waveform library would have been the seventh
runtime dependency and roughly doubled the bundle, against thirty lines of arithmetic
that run once, when a file is attached.

Measured on six minutes of 44.1 kHz stereo — 15.9 million samples — it takes **93 ms**
for 2000 columns. The decode it follows costs considerably more.

It takes the **channels**, not a single `Float32Array`, so a hard-panned track is not
drawn as silence. Mixing down first would allocate a second copy of a buffer that
already weighs 61 MB for six minutes of stereo at the 22.05 kHz `useAudio` decodes
to; taking the extent across channels in the same pass costs nothing.

Every bucket gets at least one sample, so asking for more columns than there are
samples stretches the drawing instead of leaving gaps in it. An empty signal, or a
request for no columns, returns `[]`.

Being pure, it is where the logic can be tested at all: jsdom provides no Web Audio,
so nothing downstream of the decode can be.

---

## `dragCue` — retiming a cue

**File:** [src/utils/dragCue.ts](../src/utils/dragCue.ts)

```typescript
type DragMode = "move" | "resize-start" | "resize-end";
dragCue(cue, mode, deltaSeconds, bounds): { timeStart, timeEnd }
```

Where a cue lands after being dragged. The whole of the drag logic, and the only
part of it that can be tested at all: jsdom reports every element as zero-sized
and has no `setPointerCapture`, so no pixel-to-time conversion is reachable
there. The component measures, this decides. The keyboard calls the same
function — a nudge is a drag with no snap targets.

**Results are whole seconds.** Not a preference: `isValidTimeFormat` accepts
only `mm:ss` and `formatTime` truncates, so a cue left at 12.37 s would reopen
in the editor reading `00:12` and move on save without anyone touching it.

| Rule                                              | Why                                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `move` preserves the cue's length                 | A cue pushed against either end stops there instead of being squashed against it. |
| `resize-*` keeps at least `MIN_CUE_SECONDS` (1 s) | `timeEnd > timeStart` is required, and `mm:ss` cannot write less.                 |
| `timeEnd <= durationSeconds`                      | Enforced **here**, because `isValidProjectData` never did — only `CueModal`.      |
| A zero delta returns the cue unchanged            | How a drag that went nowhere avoids costing an undo entry.                        |

`bounds.snapTargets` is a plain list of times, so the function knows nothing
about audio while still being what a playhead snaps to. Snapped values are
rounded like any other, so a playhead at 12.6 s pulls an edge to 13.

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
rather than deep-cloning, which also makes each version's shape explicit in the
code. Unknown fields are carried over on purpose, so a file from a newer minor
revision does not lose data passing through.

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
