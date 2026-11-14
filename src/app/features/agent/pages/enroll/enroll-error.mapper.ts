import { toApiError } from '@core/api/error.model';
import { EnrollmentErrors } from '@core/domain/enrollment';
import { firstStepWithError, isEnrollmentField } from './enroll-steps';

/** What the registration screen shows when the server refuses a registration. */
export type EnrollmentFailure =
  { kind: 'fields'; errors: EnrollmentErrors; step: number } | { kind: 'message'; message: string };

const OFFLINE_MESSAGE =
  'Pas de connexion : le marchand n’est pas encore enregistré. Réessayez quand le réseau revient.';

/** Field errors → back to the right step; anything else → one plain message. */
export function mapEnrollmentFailure(error: unknown): EnrollmentFailure {
  const apiError = toApiError(error);
  if (apiError.code === 'PHONE_ALREADY_USED') {
    return { kind: 'fields', errors: { phone: apiError.message }, step: 0 };
  }
  const errors = fieldErrorsFrom(apiError.details ?? {});
  if (Object.keys(errors).length > 0) {
    return { kind: 'fields', errors, step: firstStepWithError(errors) };
  }
  const message = apiError.code === 'NETWORK' ? OFFLINE_MESSAGE : apiError.message;
  return { kind: 'message', message };
}

function fieldErrorsFrom(details: Record<string, string[]>): EnrollmentErrors {
  const errors: EnrollmentErrors = {};
  for (const [field, messages] of Object.entries(details)) {
    if (isEnrollmentField(field) && messages[0]) errors[field] = messages[0];
  }
  return errors;
}
