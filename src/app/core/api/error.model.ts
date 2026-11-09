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

/** Turns any HTTP failure into an `ApiError` with a plain French message. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    if (isApiError(error.error)) return error.error;
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
