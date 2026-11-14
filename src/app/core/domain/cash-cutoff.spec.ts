import {
  businessDateOf,
  cutoffCountdown,
  formatHourLabel,
  isAfterCutoff,
  toMinutes,
} from './cash-cutoff';

const at = (hhmm: string) => new Date(`2026-11-10T${hhmm}:00Z`);

describe('cash cut-off countdown', () => {
  it('converts HH:mm to minutes and to a French label', () => {
    expect(toMinutes('16:30')).toBe(990);
    expect(formatHourLabel('16:00')).toBe('16 h 00');
  });

  it('shows hours and minutes left during the day', () => {
    const c = cutoffCountdown(at('13:55'), '07:00', '16:00');
    expect(c).toEqual({ locked: false, label: '2 h 05', progress: (415 / 540) * 100 });
  });

  it('switches to minutes in the last hour', () => {
    expect(cutoffCountdown(at('15:59'), '07:00', '16:00').label).toBe('1 min');
  });

  it('is locked from 16:00 exactly (strict cut-off)', () => {
    expect(cutoffCountdown(at('16:00'), '07:00', '16:00')).toEqual({
      locked: true,
      label: 'Fermée',
      progress: 100,
    });
  });

  it('never shows a negative progress before the collection day starts', () => {
    expect(cutoffCountdown(at('06:00'), '07:00', '16:00').progress).toBe(0);
  });
});

describe('business date (16:00 cut-off)', () => {
  it('keeps today before the cut-off', () => {
    expect(isAfterCutoff(at('15:59'), '16:00')).toBe(false);
    expect(businessDateOf(at('15:59'), '16:00')).toBe('2026-11-10');
  });

  it('moves to the next day from the cut-off on', () => {
    expect(isAfterCutoff(at('16:00'), '16:00')).toBe(true);
    expect(businessDateOf(at('16:00'), '16:00')).toBe('2026-11-11');
    expect(businessDateOf(at('23:59'), '16:00')).toBe('2026-11-11');
  });

  it('crosses month and year ends', () => {
    expect(businessDateOf(new Date('2026-11-30T17:00:00Z'), '16:00')).toBe('2026-12-01');
    expect(businessDateOf(new Date('2026-12-31T16:30:00Z'), '16:00')).toBe('2027-01-01');
  });
});
