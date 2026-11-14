import { formatTimeAgo } from './format/time-ago';
import { plural } from './plural';

describe('formatTimeAgo', () => {
  const now = new Date('2026-11-10T12:00:00Z');

  it('says "à l’instant" under one hour', () => {
    expect(formatTimeAgo('2026-11-10T11:30:00Z', now)).toBe("à l'instant");
  });

  it('counts hours within the day', () => {
    expect(formatTimeAgo('2026-11-10T09:00:00Z', now)).toBe('il y a 3 h');
  });

  it('says "hier", then counts days', () => {
    expect(formatTimeAgo('2026-11-09T10:00:00Z', now)).toBe('hier');
    expect(formatTimeAgo('2026-11-06T10:00:00Z', now)).toBe('il y a 4 jours');
  });
});

describe('plural', () => {
  it('uses the singular for 0 and 1, the plural above', () => {
    expect(plural(1, 'carte', 'cartes')).toBe('1 carte');
    expect(plural(0, 'carte', 'cartes')).toBe('0 carte');
    expect(plural(3, 'carte', 'cartes')).toBe('3 cartes');
  });
});
