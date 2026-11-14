/**
 * Daily cash cut-off (16:00 by default, Africa/Abidjan = UTC+0, no DST).
 * After the cut-off, new entries go to the next business day (J+1).
 */

export interface CutoffCountdown {
  locked: boolean;
  /** "2 h 05", "45 min" or "Fermée". */
  label: string;
  /** Share of the collection day already elapsed, 0–100. */
  progress: number;
}

/** `"16:30"` → `990`. */
export function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

/** `"16:00"` → `"16 h 00"` (French way of writing hours). */
export function formatHourLabel(hhmm: string): string {
  return hhmm.replace(':', ' h ');
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

/** Time left before the cut-off; `dayStart` and `cutoff` are `HH:mm` in Abidjan time. */
export function cutoffCountdown(now: Date, dayStart: string, cutoff: string): CutoffCountdown {
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const startMin = toMinutes(dayStart);
  const cutoffMin = toMinutes(cutoff);
  const left = cutoffMin - nowMin;
  if (left <= 0) return { locked: true, label: 'Fermée', progress: 100 };
  const elapsed = ((nowMin - startMin) / (cutoffMin - startMin)) * 100;
  return { locked: false, label: formatDuration(left), progress: clamp(elapsed, 0, 100) };
}

/** True from the cut-off time (inclusive) until midnight, Abidjan time. */
export function isAfterCutoff(now: Date, cutoff: string): boolean {
  return now.getUTCHours() * 60 + now.getUTCMinutes() >= toMinutes(cutoff);
}

/**
 * Business day (`YYYY-MM-DD`) an entry made at `now` belongs to: today before the cut-off,
 * the next day (J+1) from the cut-off on. Abidjan = UTC+0, so the UTC date is the local date.
 */
export function businessDateOf(now: Date, cutoff: string): string {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (isAfterCutoff(now, cutoff)) day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
