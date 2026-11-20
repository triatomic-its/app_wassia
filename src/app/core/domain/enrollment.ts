/**
 * Enrollment rules shared by the screens and the (mock) server.
 *
 * Since 2026-11-20 the registry is the reference: the file sent is its `DossierSaisi`
 * (identity, ID document, sector, market, referent, savings commitment, consents), and the
 * 1 000 F cash part of the opening fee is received on the spot. The QR card is then associated
 * in a separate step, by scanning it.
 *
 * Côte d'Ivoire mobile numbers: 10 digits, starting with 01, 05 or 07 (since 2021).
 */

import { formatFcfa } from '../i18n/format/fcfa';
import { Fcfa } from '../models';

export type MembershipChannel = 'CASH' | 'WAVE';

/** Identity documents accepted by the registry ("CNI, CMU ou passeport", ASSUMPTION A34). */
export type IdType = 'CNI' | 'CMU' | 'PASSEPORT';
export const ID_TYPES: readonly IdType[] = ['CNI', 'CMU', 'PASSEPORT'];

/** How often the merchant commits to save (`Engagement.periodicite`, ASSUMPTION A34). */
export type SavingsFrequency = 'quotidienne' | 'hebdomadaire' | 'mensuelle';
export const SAVINGS_FREQUENCIES: readonly SavingsFrequency[] = [
  'quotidienne',
  'hebdomadaire',
  'mensuelle',
];

export interface EnrollmentInput {
  lastName: string;
  firstNames: string;
  /** First names + last name: display, and the mock back end. */
  fullName: string;
  phone: string;
  /** Market id (registry hash, or market name on the mock back end). */
  market: string;
  /** Stall number (`numeroEtale`). */
  stall?: string;
  idType: IdType;
  idNumber: string;
  /** Uploaded photo of the identity document. */
  idDocUrl?: string;
  /** Uploaded photo of the stall / business. */
  photoUrl?: string;
  /** Sector id (registry hash, or code on the mock back end). */
  sector: string;
  /** Label of the sector: display, and the mock back end. */
  trade: string;
  /** Trusted person declared on the file (`Referent`). */
  referentName: string;
  referentLink: string;
  referentPhone: string;
  /** The referent knows they are named. */
  referentInformed: boolean;
  /** Savings commitment (`Engagement`). */
  savingsAmount: Fcfa;
  savingsFrequency: SavingsFrequency;
  /** What the savings are for (`Engagement.motif`). */
  savingsGoal: string;
  commitmentAccepted: boolean;
  /** How the 1 000 F were paid. */
  paymentChannel?: MembershipChannel;
  /** The agent confirms having received the cash or seen the Wave confirmation. */
  paymentConfirmed?: boolean;
  /** Wave transaction reference: required, it is the payment's key in the registry. */
  paymentRef?: string;
  /** The merchant accepts the use of their identity and of the QR card (required consents). */
  consentAccepted: boolean;
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

const PHONE_FORMAT = 'Le numéro doit avoir 10 chiffres et commencer par 01, 05 ou 07.';

/** Step 1 — identity. */
export function validateIdentity(input: Partial<EnrollmentInput>): EnrollmentErrors {
  const errors: EnrollmentErrors = {};
  if ((input.lastName ?? '').trim().length < 2) errors.lastName = 'Écrivez le nom.';
  if ((input.firstNames ?? '').trim().length < 2) errors.firstNames = 'Écrivez les prénoms.';
  if (!input.phone?.trim()) errors.phone = 'Écrivez le numéro de téléphone.';
  else if (!isValidCiPhone(input.phone)) errors.phone = PHONE_FORMAT;
  if (!input.market?.trim()) errors.market = 'Choisissez le marché.';
  return errors;
}

/** Step 2 — identity document and business. */
export function validateDocuments(input: Partial<EnrollmentInput>): EnrollmentErrors {
  const errors: EnrollmentErrors = {};
  if (!input.idDocUrl) errors.idDocUrl = 'Prenez la photo de la pièce d’identité.';
  if (!input.photoUrl) errors.photoUrl = 'Prenez la photo de l’étalage ou du commerce.';
  if (!input.idType || !ID_TYPES.includes(input.idType)) errors.idType = 'Choisissez la pièce.';
  if ((input.idNumber ?? '').trim().length < 5) errors.idNumber = 'Écrivez le numéro de la pièce.';
  if (!input.sector?.trim()) errors.sector = 'Choisissez le secteur d’activité.';
  return errors;
}

/** Step 3 — referent and savings commitment. */
export function validateCommitment(
  input: Partial<EnrollmentInput>,
  minimumSavings: Fcfa,
): EnrollmentErrors {
  const errors: EnrollmentErrors = {};
  if ((input.referentName ?? '').trim().length < 3) {
    errors.referentName = 'Écrivez le nom de la personne de confiance.';
  }
  if (!input.referentLink?.trim()) errors.referentLink = 'Écrivez le lien avec le marchand.';
  if (!input.referentPhone?.trim()) {
    errors.referentPhone = 'Écrivez son numéro de téléphone.';
  } else if (!isValidCiPhone(input.referentPhone)) {
    errors.referentPhone = PHONE_FORMAT;
  } else if (input.phone && phoneDigits(input.phone) === phoneDigits(input.referentPhone)) {
    errors.referentPhone = 'Mettez le numéro d’une autre personne que le marchand.';
  }
  if (input.referentInformed !== true) {
    errors.referentInformed = 'La personne de confiance doit être prévenue.';
  }
  const amount = input.savingsAmount ?? 0;
  if (!Number.isInteger(amount) || amount < minimumSavings) {
    errors.savingsAmount = `Le versement doit être d’au moins ${formatFcfa(minimumSavings)}.`;
  }
  if (!input.savingsFrequency || !SAVINGS_FREQUENCIES.includes(input.savingsFrequency)) {
    errors.savingsFrequency = 'Choisissez quand il épargne.';
  }
  if ((input.savingsGoal ?? '').trim().length < 3) {
    errors.savingsGoal = 'Écrivez à quoi servira l’épargne.';
  }
  if (input.commitmentAccepted !== true) {
    errors.commitmentAccepted = 'Le marchand doit accepter son engagement d’épargne.';
  }
  return errors;
}

/** Step 4 — the cash part of the opening fee (1 000 F), received on the spot, and the consents. */
export function validatePayment(input: Partial<EnrollmentInput>, fee: Fcfa): EnrollmentErrors {
  const errors: EnrollmentErrors = {};
  if (input.paymentChannel !== 'CASH' && input.paymentChannel !== 'WAVE') {
    errors.paymentChannel = 'Choisissez : espèces ou Wave.';
  } else {
    if (input.paymentChannel === 'WAVE' && (input.paymentRef ?? '').trim().length < 4) {
      errors.paymentRef = 'Écrivez la référence du paiement Wave.';
    }
    if (input.paymentConfirmed !== true) {
      errors.paymentConfirmed =
        input.paymentChannel === 'CASH'
          ? `Confirmez que vous avez reçu les ${formatFcfa(fee)}.`
          : 'Confirmez que vous avez vu la confirmation du paiement Wave.';
    }
  }
  if (input.consentAccepted !== true) {
    errors.consentAccepted = 'Le marchand doit donner son accord.';
  }
  return errors;
}

/** Everything required to register the member (the card is associated afterwards). */
export function validateEnrollment(
  input: Partial<EnrollmentInput>,
  fee: Fcfa,
  minimumSavings: Fcfa,
): EnrollmentErrors {
  return {
    ...validateIdentity(input),
    ...validateDocuments(input),
    ...validateCommitment(input, minimumSavings),
    ...validatePayment(input, fee),
  };
}

export function hasErrors(errors: EnrollmentErrors): boolean {
  return Object.values(errors).some(Boolean);
}
