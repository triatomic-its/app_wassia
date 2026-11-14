import {
  EnrollmentErrors,
  EnrollmentField,
  EnrollmentInput,
  validateDocuments,
  validateIdentity,
  validatePayment,
} from '@core/domain/enrollment';
import { Fcfa } from '@core/models';

/** The three short steps of "Inscrire un marchand" (mockup). */
export const ENROLLMENT_STEPS = [
  'Identité du marchand',
  'Pièces et commerce',
  'Paiement de l’adhésion',
] as const;

export const LAST_ENROLLMENT_STEP = ENROLLMENT_STEPS.length - 1;

/** On which step each field is typed — used to bring the agent back to a server error. */
const STEP_OF_FIELD: Record<EnrollmentField, number> = {
  fullName: 0,
  phone: 0,
  market: 0,
  stall: 0,
  idDocUrl: 1,
  photoUrl: 1,
  idNumber: 1,
  trade: 1,
  paymentChannel: 2,
  paymentConfirmed: 2,
  paymentRef: 2,
};

export function isEnrollmentField(key: string): key is EnrollmentField {
  return key in STEP_OF_FIELD;
}

/** Errors of the given step only ("Continuer" checks one step at a time). */
export function validateStep(step: number, input: EnrollmentInput, fee: Fcfa): EnrollmentErrors {
  switch (step) {
    case 0:
      return validateIdentity(input);
    case 1:
      return validateDocuments(input);
    default:
      return validatePayment(input, fee);
  }
}

/** Earliest step holding one of the errors (last step when none is known). */
export function firstStepWithError(errors: EnrollmentErrors): number {
  const steps = Object.entries(errors)
    .filter(([, message]) => Boolean(message))
    .map(([field]) => (isEnrollmentField(field) ? STEP_OF_FIELD[field] : LAST_ENROLLMENT_STEP));
  return steps.length > 0 ? Math.min(...steps) : LAST_ENROLLMENT_STEP;
}
