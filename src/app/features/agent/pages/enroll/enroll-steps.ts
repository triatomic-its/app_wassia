import {
  EnrollmentErrors,
  EnrollmentField,
  EnrollmentInput,
  validateCommitment,
  validateDocuments,
  validateIdentity,
  validatePayment,
} from '@core/domain/enrollment';
import { Fcfa } from '@core/models';

/** The four short steps of "Inscrire un marchand" (registry file, 2026-11-20). */
export const ENROLLMENT_STEPS = [
  'Identité du marchand',
  'Pièce et commerce',
  'Personne de confiance et épargne',
  'Paiement et accord',
] as const;

export const LAST_ENROLLMENT_STEP = ENROLLMENT_STEPS.length - 1;

/** On which step each field is typed — used to bring the agent back to a server error. */
const STEP_OF_FIELD: Record<EnrollmentField, number> = {
  lastName: 0,
  firstNames: 0,
  fullName: 0,
  phone: 0,
  market: 0,
  stall: 0,
  idType: 1,
  idNumber: 1,
  idDocUrl: 1,
  photoUrl: 1,
  sector: 1,
  trade: 1,
  referentName: 2,
  referentLink: 2,
  referentPhone: 2,
  referentInformed: 2,
  savingsAmount: 2,
  savingsFrequency: 2,
  savingsGoal: 2,
  commitmentAccepted: 2,
  paymentChannel: 3,
  paymentConfirmed: 3,
  paymentRef: 3,
  consentAccepted: 3,
};

export function isEnrollmentField(key: string): key is EnrollmentField {
  return key in STEP_OF_FIELD;
}

/** Rules a step needs from the server. */
export interface StepRules {
  fee: Fcfa;
  minimumSavings: Fcfa;
}

/** Errors of the given step only ("Continuer" checks one step at a time). */
export function validateStep(
  step: number,
  input: EnrollmentInput,
  rules: StepRules,
): EnrollmentErrors {
  switch (step) {
    case 0:
      return validateIdentity(input);
    case 1:
      return validateDocuments(input);
    case 2:
      return validateCommitment(input, rules.minimumSavings);
    default:
      return validatePayment(input, rules.fee);
  }
}

/** Earliest step holding one of the errors (last step when none is known). */
export function firstStepWithError(errors: EnrollmentErrors): number {
  const steps = Object.entries(errors)
    .filter(([, message]) => Boolean(message))
    .map(([field]) => (isEnrollmentField(field) ? STEP_OF_FIELD[field] : LAST_ENROLLMENT_STEP));
  return steps.length > 0 ? Math.min(...steps) : LAST_ENROLLMENT_STEP;
}
