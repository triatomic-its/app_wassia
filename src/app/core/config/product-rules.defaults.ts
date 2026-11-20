import { ProductRules } from '../models';

/**
 * Registry rule `structure-2026` as read on 2026-11-20. Used only when the registry is off
 * (`environment.useRegistre === false`); otherwise the live values always win.
 */
export const PRODUCT_RULES_SNAPSHOT: ProductRules = {
  membershipCashFee: 1_000,
  openingFee: 5_000,
  openingFeeFromSavings: 4_000,
  minimumSavings: 2_000,
  cashCeiling: 2_000_000,
  cutoffTime: '16:00',
  gracePeriodDays: 5,
  latePenaltyPerDay: 400,
  minimumObservationWeeks: 8,
  loanReviewHours: 48,
};
