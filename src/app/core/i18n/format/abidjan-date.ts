import { BUSINESS_TIME_ZONE } from '../../config/settings.defaults';

export type AbidjanDateFormat = 'datetime' | 'date' | 'time' | 'long';

const FORMATTERS: Record<AbidjanDateFormat, Intl.DateTimeFormat> = {
  datetime: new Intl.DateTimeFormat('fr-FR', {
    timeZone: BUSINESS_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }),
  date: new Intl.DateTimeFormat('fr-FR', {
    timeZone: BUSINESS_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }),
  time: new Intl.DateTimeFormat('fr-FR', {
    timeZone: BUSINESS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }),
  /** "lundi 2 novembre" — page subtitles in the mockup. */
  long: new Intl.DateTimeFormat('fr-FR', {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }),
};

/**
 * Formats an ISO UTC date in Africa/Abidjan (UTC+0, no DST).
 * `datetime` → `02/11/2026 13:05`, `date` → `02/11/2026`, `time` → `13 h 05`, `long` → `Lundi 2 novembre`.
 */
export function formatAbidjanDate(
  value: string | Date | null | undefined,
  format: AbidjanDateFormat = 'datetime',
): string {
  if (value === null || value === undefined || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const text = FORMATTERS[format].format(date);
  switch (format) {
    case 'datetime':
      return text.replace(',', '');
    case 'time':
      return text.replace(':', ' h ');
    case 'long':
      return text.charAt(0).toUpperCase() + text.slice(1);
    default:
      return text;
  }
}
