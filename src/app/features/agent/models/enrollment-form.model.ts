import { NonNullableFormBuilder } from '@angular/forms';
import { EnrollmentInput, MembershipChannel, formatPhone } from '@core/domain/enrollment';

/** Photo fields of step 2, uploaded as soon as they are taken. */
export type PhotoField = 'idDocUrl' | 'photoUrl';

/** Upload progress of one photo field. */
export interface UploadState {
  busy: boolean;
  error: string | null;
}

export const UPLOAD_IDLE: UploadState = { busy: false, error: null };

/**
 * Typed registration form. Validation messages come from the shared pure rules
 * (`core/domain/enrollment.ts`, also applied by the server), checked step by step on "Continuer".
 */
export function createEnrollmentForm(fb: NonNullableFormBuilder, market: string) {
  return fb.group({
    fullName: fb.control(''),
    phone: fb.control(''),
    market: fb.control(market),
    stall: fb.control(''),
    idDocUrl: fb.control(''),
    photoUrl: fb.control(''),
    idNumber: fb.control(''),
    trade: fb.control(''),
    paymentChannel: fb.control<MembershipChannel | null>(null),
    paymentConfirmed: fb.control(false),
    paymentRef: fb.control(''),
  });
}

export type EnrollmentForm = ReturnType<typeof createEnrollmentForm>;
export type EnrollmentFormValue = ReturnType<EnrollmentForm['getRawValue']>;

/** Form value → API body: empty optional fields are left out, the phone is normalised. */
export function toEnrollmentInput(value: EnrollmentFormValue): EnrollmentInput {
  return {
    fullName: value.fullName,
    phone: formatPhone(value.phone),
    market: value.market,
    trade: value.trade,
    idNumber: value.idNumber,
    stall: value.stall || undefined,
    idDocUrl: value.idDocUrl || undefined,
    photoUrl: value.photoUrl || undefined,
    paymentChannel: value.paymentChannel ?? undefined,
    paymentConfirmed: value.paymentConfirmed,
    paymentRef: value.paymentRef || undefined,
  };
}

/** True when the agent has typed something worth confirming before leaving. */
export function hasTypedIdentity(value: EnrollmentFormValue): boolean {
  return Boolean(value.fullName.trim() || value.phone.trim());
}
