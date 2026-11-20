import { HttpErrorResponse } from '@angular/common/http';
import { mapEnrollmentFailure } from './enroll-error.mapper';
import { firstStepWithError } from './enroll-steps';

const httpError = (status: number, error?: unknown) => new HttpErrorResponse({ status, error });

describe('mapEnrollmentFailure', () => {
  it('sends a duplicate phone back to step 1', () => {
    const failure = mapEnrollmentFailure(
      httpError(409, { code: 'PHONE_ALREADY_USED', message: 'Numéro déjà utilisé.' }),
    );
    expect(failure).toEqual({ kind: 'fields', errors: { phone: 'Numéro déjà utilisé.' }, step: 0 });
  });

  it('opens the earliest step holding a field error', () => {
    const failure = mapEnrollmentFailure(
      httpError(422, {
        code: 'ENROLLMENT_INCOMPLETE',
        message: 'Certaines informations manquent.',
        details: { paymentConfirmed: ['Confirmez'], trade: ['Écrivez l’activité'] },
      }),
    );
    expect(failure).toEqual({
      kind: 'fields',
      errors: { paymentConfirmed: 'Confirmez', trade: 'Écrivez l’activité' },
      step: 1,
    });
  });

  it('ignores unknown fields and falls back to the message', () => {
    const failure = mapEnrollmentFailure(
      httpError(422, { code: 'VALIDATION', message: 'Incorrect.', details: { amount: ['x'] } }),
    );
    expect(failure).toEqual({ kind: 'message', message: 'Incorrect.' });
  });

  it('says plainly that nothing was saved when offline', () => {
    const failure = mapEnrollmentFailure(httpError(0));
    expect(failure.kind === 'message' && failure.message).toMatch(/pas encore enregistré/);
  });
});

describe('firstStepWithError', () => {
  it('defaults to the last step when no error is known', () => {
    expect(firstStepWithError({})).toBe(3);
  });
});
