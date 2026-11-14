import { IsoDateTime } from '../../models';

const HOUR_MS = 3_600_000;

/** Plain French elapsed time for short lists: "à l'instant", "il y a 3 h", "hier", "il y a 4 jours". */
export function formatTimeAgo(from: IsoDateTime, now: Date): string {
  const hours = Math.floor((now.getTime() - Date.parse(from)) / HOUR_MS);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'hier' : `il y a ${days} jours`;
}
