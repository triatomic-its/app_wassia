import { NonNullableFormBuilder } from '@angular/forms';
import {
  EnrollmentInput,
  IdType,
  MembershipChannel,
  SavingsFrequency,
  formatPhone,
} from '@core/domain/enrollment';
import { ChoiceOption } from '@core/models';

/** Photo fields of step 2, uploaded as soon as they are taken. */
export type PhotoField = 'idDocUrl' | 'photoUrl';

/** Upload progress of one photo field. */
export interface UploadState {
  busy: boolean;
  error: string | null;
}

export const UPLOAD_IDLE: UploadState = { busy: false, error: null };

/**
 * Typed registration form, shaped like the registry's `DossierSaisi`. Validation messages come
 * from the shared pure rules (`core/domain/enrollment.ts`), checked step by step on "Continuer".
 */
export function createEnrollmentForm(fb: NonNullableFormBuilder) {
  return fb.group({
    lastName: fb.control(''),
    firstNames: fb.control(''),
    phone: fb.control(''),
    market: fb.control(''),
    stall: fb.control(''),
    idType: fb.control<IdType>('CNI'),
    idNumber: fb.control(''),
    idDocUrl: fb.control(''),
    photoUrl: fb.control(''),
    sector: fb.control(''),
    referentName: fb.control(''),
    referentLink: fb.control(''),
    referentPhone: fb.control(''),
    referentInformed: fb.control(false),
    /** Typed as text: an empty field must not become 0 F. */
    savingsAmount: fb.control(''),
    savingsFrequency: fb.control<SavingsFrequency>('quotidienne'),
    savingsGoal: fb.control(''),
    commitmentAccepted: fb.control(false),
    paymentChannel: fb.control<MembershipChannel | null>(null),
    paymentConfirmed: fb.control(false),
    paymentRef: fb.control(''),
    consentAccepted: fb.control(false),
  });
}

export type EnrollmentForm = ReturnType<typeof createEnrollmentForm>;
export type EnrollmentFormValue = ReturnType<EnrollmentForm['getRawValue']>;

/** `"2 000"` → 2000; anything that is not a whole number → NaN (refused by the rules). */
export function parseAmount(text: string): number {
  // \s also matches the non-breaking spaces of formatted amounts (U+00A0, U+202F).
  const digits = text.replace(/\s/g, '');
  return /^\d+$/.test(digits) ? Number(digits) : Number.NaN;
}

/** Form value → domain input: empty optional fields left out, phones normalised. */
export function toEnrollmentInput(
  value: EnrollmentFormValue,
  sectors: readonly ChoiceOption[] = [],
): EnrollmentInput {
  const lastName = value.lastName.trim();
  const firstNames = value.firstNames.trim();
  return {
    lastName,
    firstNames,
    fullName: [firstNames, lastName].filter(Boolean).join(' '),
    phone: formatPhone(value.phone),
    market: value.market,
    stall: value.stall.trim() || undefined,
    idType: value.idType,
    idNumber: value.idNumber.trim(),
    idDocUrl: value.idDocUrl || undefined,
    photoUrl: value.photoUrl || undefined,
    sector: value.sector,
    trade: sectors.find((s) => s.value === value.sector)?.label ?? '',
    referentName: value.referentName.trim(),
    referentLink: value.referentLink.trim(),
    referentPhone: formatPhone(value.referentPhone),
    referentInformed: value.referentInformed,
    savingsAmount: parseAmount(value.savingsAmount),
    savingsFrequency: value.savingsFrequency,
    savingsGoal: value.savingsGoal.trim(),
    commitmentAccepted: value.commitmentAccepted,
    paymentChannel: value.paymentChannel ?? undefined,
    paymentConfirmed: value.paymentConfirmed,
    paymentRef: value.paymentRef.trim() || undefined,
    consentAccepted: value.consentAccepted,
  };
}

/** True when the agent has typed something worth confirming before leaving. */
export function hasTypedIdentity(value: EnrollmentFormValue): boolean {
  return Boolean(value.lastName.trim() || value.firstNames.trim() || value.phone.trim());
}
