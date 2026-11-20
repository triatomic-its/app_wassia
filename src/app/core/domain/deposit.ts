/**
 * Savings deposit rules shared by the screens. The registry is the reference (2026-11-20): it
 * accepts any whole amount above zero; Wave needs the operator reference (its idempotency key).
 */

import { DepositChannel, Fcfa } from '../models';

export interface DepositDraft {
  amount: Fcfa;
  channel: DepositChannel | null;
  reference?: string;
}

export type DepositErrors = Partial<Record<keyof DepositDraft, string>>;

export function validateDeposit(draft: DepositDraft): DepositErrors {
  const errors: DepositErrors = {};
  if (!Number.isInteger(draft.amount) || draft.amount <= 0) {
    errors.amount = 'Écrivez un montant en francs, sans virgule.';
  }
  if (draft.channel !== 'CASH' && draft.channel !== 'WAVE') {
    errors.channel = 'Choisissez : espèces ou Wave.';
  } else if (draft.channel === 'WAVE' && (draft.reference ?? '').trim().length < 4) {
    errors.reference = 'Écrivez la référence du paiement Wave.';
  }
  return errors;
}
