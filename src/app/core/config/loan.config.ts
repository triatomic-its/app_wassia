import { Fcfa, LoanDuration, LoanSchedule } from '../models';
import { Permission } from './permissions.config';

/**
 * Official Innov Finance grid (cahier définitif v2.0).
 * Rates are FIXED on the borrowed amount, not annualised (ASSUMPTION A12: to be checked legally).
 * File fees are paid in cash at disbursement.
 */
export const LOAN_AMOUNTS: readonly { amount: Fcfa; fee: Fcfa }[] = [
  { amount: 250_000, fee: 10_000 },
  { amount: 500_000, fee: 15_000 },
  { amount: 1_000_000, fee: 25_000 },
  { amount: 3_000_000, fee: 50_000 },
  { amount: 5_000_000, fee: 75_000 },
  { amount: 10_000_000, fee: 100_000 },
];

/** Rate in whole percent per duration. Kept as integers to avoid float maths on money. */
export const LOAN_RATE_PERCENT: Readonly<Record<LoanDuration, number>> = {
  6: 8,
  12: 18,
  18: 28,
};

export const LOAN_DURATIONS: readonly LoanDuration[] = [6, 12, 18];

/** No prior savings = no loan. */
export const LOAN_REQUIRES_SAVINGS = true;

/** Late instalments: 1 = instant reminder, 2 = savings blocked. */
export const LOAN_LATE_REMINDER_AT = 1;
export const LOAN_LATE_BLOCK_AT = 2;

/**
 * total = amount × (1 + rate); monthly = floor(total / months); the remainder goes to the last instalment.
 */
export function computeLoanSchedule(amount: Fcfa, months: LoanDuration): LoanSchedule {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new RangeError('Loan amount must be a positive integer (FCFA).');
  }
  const total = (amount * (100 + LOAN_RATE_PERCENT[months])) / 100;
  const roundedTotal = Math.round(total);
  const monthly = Math.floor(roundedTotal / months);
  const last = roundedTotal - monthly * (months - 1);
  return { total: roundedTotal, monthly, last };
}

export function loanFee(amount: Fcfa): Fcfa | undefined {
  return LOAN_AMOUNTS.find((row) => row.amount === amount)?.fee;
}

/**
 * Approval thresholds (cahier v2.0):
 * 250k–500k → Chef d'agence; 1M–3M → DG alone (48 h); 5M–10M → DG + Comptable.
 * Gaps ]500k ; 1M[ and ]3M ; 5M[ are not specified (ASSUMPTION A11):
 * ]500k ; 3M] → DG alone, > 3M → DG + Comptable.
 * Every listed permission must be granted (by distinct users).
 */
export const LOAN_APPROVAL_TIERS: readonly { upTo: Fcfa; required: readonly Permission[] }[] = [
  { upTo: 500_000, required: ['loan.approve.tier1'] },
  { upTo: 3_000_000, required: ['loan.approve.tier2'] },
  {
    upTo: Number.MAX_SAFE_INTEGER,
    required: ['loan.approve.tier3.dg', 'loan.approve.tier3.accounting'],
  },
];

export function requiredApprovals(amount: Fcfa): readonly Permission[] {
  const tier = LOAN_APPROVAL_TIERS.find((t) => amount <= t.upTo);
  return tier ? tier.required : [];
}

/** DG decision target, in hours. */
export const LOAN_DG_DECISION_HOURS = 48;
