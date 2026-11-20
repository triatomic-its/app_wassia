import { validateDeposit } from './deposit';

describe('savings deposit', () => {
  it('accepts any whole amount above zero, in cash', () => {
    expect(validateDeposit({ amount: 500, channel: 'CASH' })).toEqual({});
    expect(validateDeposit({ amount: 25_000, channel: 'CASH' })).toEqual({});
  });

  it('refuses an empty, zero or decimal amount', () => {
    for (const amount of [0, -100, 1500.5, Number.NaN]) {
      expect(validateDeposit({ amount, channel: 'CASH' }).amount).toBeTruthy();
    }
  });

  it('needs the Wave reference', () => {
    expect(validateDeposit({ amount: 1000, channel: 'WAVE' }).reference).toMatch(/référence/);
    expect(validateDeposit({ amount: 1000, channel: 'WAVE', reference: 'T-ABCD' })).toEqual({});
  });

  it('needs a payment mode', () => {
    expect(validateDeposit({ amount: 1000, channel: null }).channel).toBeTruthy();
  });
});
