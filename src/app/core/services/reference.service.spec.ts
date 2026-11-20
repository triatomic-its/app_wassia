import { Fait, FaitResume } from '../models/registre.model';
import { buildReference } from './reference.service';

const h = (c: string) => c.repeat(64);
const resume = (fait: string, champs: Record<string, unknown>): FaitResume => ({
  fait,
  type: 'x',
  champs,
  recuLe: '2026-11-20T10:00:00Z',
});
const full = (
  fait: string,
  champs: Record<string, unknown>,
  preds: Record<string, string>,
  recuLe = '2026-11-20T10:00:00Z',
): Fait => ({
  ...resume(fait, champs),
  recuLe,
  predecesseurs: Object.entries(preds).map(([role, predecesseur]) => ({ role, predecesseur })),
});

describe('buildReference', () => {
  it('labels items, links markets to agencies and sectors to poles, latest label wins', () => {
    const data = buildReference(
      [resume(h('a'), { code: 'treichville' })],
      [resume(h('p'), { code: 'finance' })],
      {
        markets: [full(h('m'), { code: 'treichville-centre' }, { agence: h('a') })],
        sectors: [full(h('s'), { code: 'tontine' }, { pole: h('p') })],
        labels: [
          full(h('1'), { texte: 'Agence Treichville', detail: 'Avenue 21' }, { sujet: h('a') }),
          full(h('2'), { texte: 'Ancien libellé' }, { sujet: h('m') }, '2026-11-01T00:00:00Z'),
          full(h('3'), { texte: 'Treichville centre' }, { sujet: h('m') }),
        ],
      },
    );
    expect(data.agencies).toEqual([
      { id: h('a'), code: 'treichville', label: 'Agence Treichville', detail: 'Avenue 21' },
    ]);
    expect(data.markets).toEqual([
      {
        id: h('m'),
        code: 'treichville-centre',
        label: 'Treichville centre',
        agencyCode: 'treichville',
      },
    ]);
    // No label: the code is shown rather than nothing.
    expect(data.sectors[0]).toMatchObject({ label: 'tontine', poleCode: 'finance' });
    expect(data.poles[0].label).toBe('finance');
  });
});
