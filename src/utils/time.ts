export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function parseTime(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length !== 2) return 0;
  const m = parseInt(parts[0], 10);
  const s = parseInt(parts[1], 10);
  if (isNaN(m) || isNaN(s)) return 0;
  return m * 60 + s;
}

export function isValidTimeFormat(timeStr: string): boolean {
  return /^\d{2,}:\d{2}$/.test(timeStr);
}
