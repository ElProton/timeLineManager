/** Formats a number of seconds as `mm:ss`. Minutes are not capped at 59. */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Parses `mm:ss` into seconds. Returns 0 for anything it cannot parse.
 *
 * Strict on purpose: `parseInt` alone accepts "01:5abc" and returns 5, so the
 * string is validated before any digits are read.
 */
export function parseTime(timeStr: string): number {
  if (!isValidTimeFormat(timeStr)) return 0;
  const [minutes, seconds] = timeStr.split(":");
  return parseInt(minutes, 10) * 60 + parseInt(seconds, 10);
}

/**
 * True when `timeStr` is `mm:ss`.
 *
 * Minutes are deliberately unbounded — a 100-minute timeline is written
 * "100:00", and `formatTime` never rolls over into hours. Seconds are bounded
 * at 59: the earlier pattern accepted "00:99" and quietly turned it into
 * 99 seconds, which `formatTime` then displayed back as "01:39".
 */
export function isValidTimeFormat(timeStr: string): boolean {
  return /^\d{2,}:[0-5]\d$/.test(timeStr);
}

/** Characters no filesystem or browser download will accept unescaped. */
const FORBIDDEN_FILENAME_CHARS = /[/\\:*?"<>|]/g;

/**
 * Makes a string safe to use as a download filename.
 *
 * Titles are free text, so a project called "Gala 1/2" would otherwise produce
 * a filename the browser truncates or rejects.
 */
export function sanitiseFilename(name: string): string {
  const cleaned = Array.from(name)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code > 31 && code !== 127;
    })
    .join("")
    .replace(FORBIDDEN_FILENAME_CHARS, "-")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[_.-]+|[_.-]+$/g, "")
    .slice(0, 100);
  return cleaned || "timeline";
}
