import {
  formatPhone,
  hasErrors,
  isValidCiPhone,
  phoneDigits,
  validateCommitment,
  validateDocuments,
  validateEnrollment,
  validateIdentity,
  validatePayment,
} from './enrollment';
import { COMPLETE_ENROLLMENT } from './enrollment.fixture';

describe('Ivorian phone numbers', () => {
  it('accepts 10-digit numbers starting with 01, 05 or 07', () => {
    expect(isValidCiPhone('07 00 00 00 00')).toBe(true);
    expect(isValidCiPhone('0102030405')).toBe(true);
    expect(isValidCiPhone('05-11-22-33-44')).toBe(true);
    expect(isValidCiPhone('+225 07 00 00 00 00')).toBe(true);
  });

  it('rejects other numbers', () => {
    expect(isValidCiPhone('0800000000')).toBe(false);
    expect(isValidCiPhone('07000000')).toBe(false);
    expect(isValidCiPhone('')).toBe(false);
  });

  it('normalises and formats', () => {
    expect(phoneDigits('+225 07 00 00 00 01')).toBe('0700000001');
    expect(formatPhone('0700000001')).toBe('07 00 00 00 01');
  });
});

describe('enrollment validation', () => {
  it('accepts a complete file', () => {
    expect(hasErrors(validateEnrollment(COMPLETE_ENROLLMENT, 1000, 2000))).toBe(false);
  });

  it('explains each missing identity field in plain French', () => {
    const errors = validateIdentity({ lastName: 'M', firstNames: '', phone: '123', market: '' });
    expect(errors.lastName).toMatch(/nom/);
    expect(errors.firstNames).toMatch(/prénoms/);
    expect(errors.phone).toMatch(/10 chiffres/);
    expect(errors.market).toMatch(/marché/);
  });

  it('requires both photos, the ID number and the sector', () => {
    const errors = validateDocuments({ idType: 'CNI', idNumber: '', sector: '' });
    expect(Object.keys(errors).sort()).toEqual(['idDocUrl', 'idNumber', 'photoUrl', 'sector']);
  });
});

describe('referent and savings commitment', () => {
  it('accepts the complete commitment', () => {
    expect(validateCommitment(COMPLETE_ENROLLMENT, 2000)).toEqual({});
  });

  it('refuses a deposit under the registry minimum, quoting it', () => {
    const errors = validateCommitment({ ...COMPLETE_ENROLLMENT, savingsAmount: 1500 }, 2000);
    expect(errors.savingsAmount).toBe('Le versement doit être d’au moins 2 000 F.');
    expect(validateCommitment({ ...COMPLETE_ENROLLMENT, savingsAmount: NaN }, 2000)).toHaveProperty(
      'savingsAmount',
    );
  });

  it('wants another person than the merchant, who knows they are named', () => {
    const errors = validateCommitment(
      { ...COMPLETE_ENROLLMENT, referentPhone: COMPLETE_ENROLLMENT.phone, referentInformed: false },
      2000,
    );
    expect(errors.referentPhone).toMatch(/autre personne/);
    expect(errors.referentInformed).toBeTruthy();
  });
});

describe('membership payment and consent', () => {
  const consent = { consentAccepted: true };

  it('requires a channel, then the agent’s confirmation', () => {
    expect(validatePayment(consent, 1000).paymentChannel).toBeTruthy();
    expect(validatePayment({ ...consent, paymentChannel: 'CASH' }, 1000).paymentConfirmed).toMatch(
      /reçu/,
    );
    expect(
      validatePayment({ ...consent, paymentChannel: 'CASH', paymentConfirmed: true }, 1000),
    ).toEqual({});
  });

  it('requires the Wave reference: it is the payment’s key in the registry', () => {
    const wave = { ...consent, paymentChannel: 'WAVE' as const, paymentConfirmed: true };
    expect(validatePayment(wave, 1000).paymentRef).toMatch(/référence/);
    expect(validatePayment({ ...wave, paymentRef: 'T-ABC123' }, 1000)).toEqual({});
  });

  it('requires the merchant’s consent', () => {
    expect(validatePayment({}, 1000).consentAccepted).toBeTruthy();
  });

  it('quotes the fee in force', () => {
    expect(validatePayment({ ...consent, paymentChannel: 'CASH' }, 1500).paymentConfirmed).toBe(
      'Confirmez que vous avez reçu les 1 500 F.',
    );
  });
});
