import { HttpErrorResponse } from '@angular/common/http';
import { FR } from '../i18n/fr';

/** Single error format returned by the API (see docs/API_CONTRACT.md). */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).code === 'string' &&
    typeof (value as ApiError).message === 'string'
  );
}

/** Stable code for an HTTP status, used when the body only carries a message. */
function codeOfStatus(status: number): string {
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 422) return 'VALIDATION';
  if (status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN';
}

/** Body of the "Registre Wassia" errors: `{ message }` only (no code). */
function registreMessage(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const message = (body as { message?: unknown }).message;
  return typeof message === 'string' && message.trim() ? message : null;
}

/** Turns any HTTP failure into an `ApiError` with a plain French message. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    if (isApiError(error.error)) return error.error;
    // Business refusals of the registry (409, 422) carry a message meant for the user.
    const message = registreMessage(error.error);
    if (message && (error.status === 409 || error.status === 422)) {
      return { code: codeOfStatus(error.status), message };
    }
    if (error.status === 0) {
      return { code: 'NETWORK', message: 'Pas de connexion. Vérifiez internet puis réessayez.' };
    }
    if (error.status === 401)
      return { code: 'UNAUTHENTICATED', message: 'Votre session a expiré. Reconnectez-vous.' };
    if (error.status === 403)
      return { code: 'FORBIDDEN', message: "Vous n'avez pas le droit de faire cette action." };
    if (error.status === 404) return { code: 'NOT_FOUND', message: 'Élément introuvable.' };
  }
  return { code: 'UNKNOWN', message: FR.common.errorGeneric };
}
