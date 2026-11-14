import { formatAbidjanDate } from './abidjan-date';
import { formatFcfa } from './fcfa';
import { maskName } from './mask-name';

const NBSP = '\u00a0';

describe('formatFcfa', () => {
  it('groups thousands with non-breaking spaces and appends F', () => {
    expect(formatFcfa(1000)).toBe(`1${NBSP}000${NBSP}F`);
    expect(formatFcfa(10_800_000)).toBe(`10${NBSP}800${NBSP}000${NBSP}F`);
    expect(formatFcfa(0)).toBe(`0${NBSP}F`);
  });

  it('uses a true minus sign for negative amounts', () => {
    expect(formatFcfa(-500)).toBe(`−${NBSP}500${NBSP}F`);
  });

  it('adds + only when signed', () => {
    expect(formatFcfa(5000, true)).toBe(`+${NBSP}5${NBSP}000${NBSP}F`);
    expect(formatFcfa(5000)).toBe(`5${NBSP}000${NBSP}F`);
  });

  it('never shows decimals and handles empty values', () => {
    expect(formatFcfa(1234.9)).toBe(`1${NBSP}234${NBSP}F`);
    expect(formatFcfa(null)).toBe('—');
    expect(formatFcfa(undefined)).toBe('—');
  });
});

describe('formatAbidjanDate', () => {
  const iso = '2026-11-02T13:05:00Z';

  it('formats jj/mm/aaaa HH:mm in Africa/Abidjan (UTC+0)', () => {
    expect(formatAbidjanDate(iso)).toBe('02/11/2026 13:05');
  });

  it('formats date, time and long variants', () => {
    expect(formatAbidjanDate(iso, 'date')).toBe('02/11/2026');
    expect(formatAbidjanDate(iso, 'time')).toBe('13 h 05');
    expect(formatAbidjanDate(iso, 'long')).toBe('Lundi 2 novembre');
  });

  it('uses Abidjan time, not the browser offset', () => {
    expect(formatAbidjanDate('2026-11-02T23:30:00Z', 'date')).toBe('02/11/2026');
  });

  it('returns a dash for empty or invalid input', () => {
    expect(formatAbidjanDate(null)).toBe('—');
    expect(formatAbidjanDate('not a date')).toBe('—');
  });
});

describe('maskName', () => {
  it('keeps only the first letter of each word', () => {
    expect(maskName('Koné Diarra')).toBe('K*** D***');
    expect(maskName('  mariam   traoré ')).toBe('M*** T***');
  });

  it('returns an empty string for empty input', () => {
    expect(maskName('')).toBe('');
    expect(maskName(null)).toBe('');
  });
});
