/**
 * Enrollment rules shared by the screens and the (mock) server.
 *
 * Client rule (2026-11-10): the agent registers a merchant only once the 1 000 F membership fee
 * has been received on the spot (cash, or Wave confirmed by the agent). The QR card is then
 * associated in a separate step, by scanning it (see POST /cards/assign).
 *
 * Côte d'Ivoire mobile numbers: 10 digits, starting with 01, 05 or 07 (since 2021).
 */

export type MembershipChannel = 'CASH' | 'WAVE';

export interface EnrollmentInput {
  fullName: string;
  phone: string;
  market: string;
  trade: string;
  idNumber: string;
  stall?: string;
  /** Uploaded photo of the identity document (CNI). */
  idDocUrl?: string;
  /** Uploaded photo of the stall / business. */
  photoUrl?: string;
  /** How the 1 000 F were paid. */
  paymentChannel?: MembershipChannel;
  /** The agent confirms having received the cash or seen the Wave confirmation. */
  paymentConfirmed?: boolean;
  /** Optional Wave transaction reference, for reconciliation. */
  paymentRef?: string;
}

export type EnrollmentField = keyof EnrollmentInput;
export type EnrollmentErrors = Partial<Record<EnrollmentField, string>>;

/** Keeps digits only: `07 00 00 00 00` → `0700000000`. */
export function phoneDigits(value: string): string {
  return (value ?? '').replace(/\D/g, '').replace(/^225(?=\d{10}$)/, '');
}

export function isValidCiPhone(value: string): boolean {
  return /^0[157]\d{8}$/.test(phoneDigits(value));
}

/** `0700000000` → `07 00 00 00 00`. */
export function formatPhone(value: string): string {
  const d = phoneDigits(value);
  return d.length === 10 ? d.replace(/(\d{2})(?=\d)/g, '$1 ').trim() : value.trim();
}

/** Step 1 — identity. */
export function validateIdentity(input: Partial<EnrollmentInput>): EnrollmentErrors {
  const errors: EnrollmentErrors = {};
  const name = (input.fullName ?? '').trim();
  if (name.length < 3) errors.fullName = 'Écrivez le nom et les prénoms.';
  if (!input.phone?.trim()) errors.phone = 'Écrivez le numéro de téléphone.';
  else if (!isValidCiPhone(input.phone))
    errors.phone = 'Le numéro doit avoir 10 chiffres et commencer par 01, 05 ou 07.';
  if (!input.market?.trim()) errors.market = 'Choisissez le marché.';
  return errors;
}

/** Step 2 — documents and business. */
export function validateDocuments(input: Partial<EnrollmentInput>): EnrollmentErrors {
  const errors: EnrollmentErrors = {};
  if (!input.idDocUrl) errors.idDocUrl = 'Prenez la photo de la pièce d’identité.';
  if (!input.photoUrl) errors.photoUrl = 'Prenez la photo de l’étalage ou du commerce.';
  if ((input.idNumber ?? '').trim().length < 5) errors.idNumber = 'Écrivez le numéro de la pièce.';
  if ((input.trade ?? '').trim().length < 3) errors.trade = 'Écrivez l’activité du marchand.';
  return errors;
}

/** Step 3 — the 1 000 F membership fee, received on the spot. */
export function validatePayment(input: Partial<EnrollmentInput>): EnrollmentErrors {
  const errors: EnrollmentErrors = {};
  if (input.paymentChannel !== 'CASH' && input.paymentChannel !== 'WAVE') {
    errors.paymentChannel = 'Choisissez : espèces ou Wave.';
  } else if (input.paymentConfirmed !== true) {
    errors.paymentConfirmed =
      input.paymentChannel === 'CASH'
        ? 'Confirmez que vous avez reçu les 1 000 F.'
        : 'Confirmez que vous avez vu la confirmation du paiement Wave.';
  }
  return errors;
}

/** Everything required to register the member (the card is associated afterwards). */
export function validateEnrollment(input: Partial<EnrollmentInput>): EnrollmentErrors {
  return {
    ...validateIdentity(input),
    ...validateDocuments(input),
    ...validatePayment(input),
  };
}

export function hasErrors(errors: EnrollmentErrors): boolean {
  return Object.values(errors).some(Boolean);
}
