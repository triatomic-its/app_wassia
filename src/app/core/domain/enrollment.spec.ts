import {
  formatPhone,
  hasErrors,
  isValidCiPhone,
  phoneDigits,
  validateDocuments,
  validateEnrollment,
  validateIdentity,
  validatePayment,
} from './enrollment';

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
  const complete = {
    fullName: 'Mariam Traoré',
    phone: '0700000001',
    market: 'Adjamé',
    trade: 'Vente de pagnes',
    idNumber: 'CI 1234 5678',
    idDocUrl: 'mock-upload://a',
    photoUrl: 'mock-upload://b',
    paymentChannel: 'CASH' as const,
    paymentConfirmed: true,
  };

  it('accepts a complete file', () => {
    expect(hasErrors(validateEnrollment(complete, 1000))).toBe(false);
  });

  it('explains each missing identity field in plain French', () => {
    const errors = validateIdentity({ fullName: 'M', phone: '123', market: '' });
    expect(errors.fullName).toMatch(/nom/);
    expect(errors.phone).toMatch(/10 chiffres/);
    expect(errors.market).toMatch(/marché/);
  });

  it('requires both photos, the ID number and the activity', () => {
    const errors = validateDocuments({ idNumber: '', trade: '' });
    expect(Object.keys(errors).sort()).toEqual(['idDocUrl', 'idNumber', 'photoUrl', 'trade']);
  });
});

describe('membership payment', () => {
  it('requires a channel, then the agent’s confirmation', () => {
    expect(validatePayment({}, 1000).paymentChannel).toBeTruthy();
    expect(validatePayment({ paymentChannel: 'CASH' }, 1000).paymentConfirmed).toMatch(/reçu/);
    expect(validatePayment({ paymentChannel: 'WAVE' }, 1000).paymentConfirmed).toMatch(/Wave/);
    expect(validatePayment({ paymentChannel: 'WAVE', paymentConfirmed: true }, 1000)).toEqual({});
  });

  it('quotes the fee set by the administration', () => {
    expect(validatePayment({ paymentChannel: 'CASH' }, 1500).paymentConfirmed).toBe(
      'Confirmez que vous avez reçu les 1\u00a0500\u00a0F.',
    );
  });
});
