import { COMPLETE_ENROLLMENT } from '@core/domain/enrollment.fixture';
import { FaitResume } from '@core/models/registre.model';
import { Market } from '@core/services/reference.service';
import { membershipCashKey, personToken, toDossier } from './registre-dossier';
import { parseAmount } from '../models/enrollment-form.model';

const h = (c: string) => c.repeat(64);
const MARKETS: Market[] = [
  { id: h('m'), code: 'adjame', label: 'Marché d’Adjamé', agencyId: h('a'), agencyCode: 'x' },
];
const purpose = (fait: string, code: string): FaitResume => ({
  fait,
  type: 'Finalite',
  champs: { code },
  recuLe: '2026-11-20T10:00:00Z',
});
const PURPOSES = [purpose(h('1'), 'identite-contact'), purpose(h('2'), 'carte-qr')];
const INPUT = { ...COMPLETE_ENROLLMENT, market: h('m'), sector: h('s') };

describe('registry enrollment file', () => {
  it('sends hashes for market, agency, sector and consents, digits for phones', () => {
    const dossier = toDossier(INPUT, 'tok', MARKETS, PURPOSES, 8);
    expect(dossier).toMatchObject({
      jeton: 'tok',
      nom: 'TRAORÉ',
      prenoms: 'Mariam',
      telephone: '0700000001',
      typePiece: 'CNI',
      marche: h('m'),
      agence: h('a'),
      secteur: h('s'),
      referent: { telephone: '0500000001', informe: true },
      engagement: { montantMinFcfa: 2000, semainesMin: 8, periodicite: 'quotidienne' },
    });
    expect(dossier.consentements.map((c) => c.finalite)).toEqual([h('1'), h('2')]);
  });

  it('refuses to send a file the registry would reject', () => {
    expect(() => toDossier({ ...INPUT, market: 'Adjamé' }, 't', MARKETS, PURPOSES, 8)).toThrow(
      'REGISTRE_MARKET_UNKNOWN',
    );
    expect(() => toDossier(INPUT, 't', MARKETS, PURPOSES.slice(0, 1), 8)).toThrow('carte-qr');
  });

  it('derives stable keys from the idempotency key, so a retry creates nothing twice', () => {
    const key = '0f8a3c1e-1b2c-4d5e-8f90-a1b2c3d4e5f6';
    expect(personToken(key)).toBe('0f8a3c1e1b2c4d5e8f90a1b2c3d4e5f6');
    expect(membershipCashKey(key)).toBe(membershipCashKey(key));
    expect(membershipCashKey(key).length).toBeGreaterThanOrEqual(8);
  });

  it('reads typed amounts, formatted or not, and refuses anything else', () => {
    expect(parseAmount('2000')).toBe(2000);
    expect(parseAmount('2 000')).toBe(2000);
    expect(parseAmount('2 000')).toBe(2000);
    expect(parseAmount('')).toBeNaN();
    expect(parseAmount('2000,5')).toBeNaN();
  });
});
