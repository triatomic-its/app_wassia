import { HttpErrorResponse } from '@angular/common/http';
import { toApiError } from './error.model';

const httpError = (status: number, error: unknown) =>
  new HttpErrorResponse({ status, error, url: '/registre/enrolements' });

describe('toApiError', () => {
  it('keeps an error that already has the mock format', () => {
    const body = { code: 'PHONE_TAKEN', message: 'Ce numéro est déjà inscrit.' };
    expect(toApiError(httpError(409, body))).toEqual(body);
  });

  it('turns a registry 422 { message } into a VALIDATION error with its message', () => {
    expect(toApiError(httpError(422, { message: 'Téléphone déjà ancré' }))).toEqual({
      code: 'VALIDATION',
      message: 'Téléphone déjà ancré',
    });
  });

  it('turns a registry 409 { message } into a CONFLICT error', () => {
    expect(toApiError(httpError(409, { message: 'Conflit de rôle' })).code).toBe('CONFLICT');
  });

  it('never shows a technical server message to the user', () => {
    const error = toApiError(httpError(500, { message: 'erreur du registre' }));
    expect(error.code).toBe('UNKNOWN');
    expect(error.message).not.toContain('registre');
  });

  it('reports a network failure', () => {
    expect(toApiError(httpError(0, null)).code).toBe('NETWORK');
  });
});
