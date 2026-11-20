import { Fcfa } from './common.model';

/**
 * Savings and cash rules in force, read from the registry (`RegleProduit`, `GET /regles/{champ}`).
 * The back end is the reference (2026-11-20).
 */
export interface ProductRules {
  /** Cash paid on the spot at enrollment (`partCashEnrolementFcfa`). */
  membershipCashFee: Fcfa;
  /** Total opening fee (`fraisOuvertureFcfa`) = cash part + part taken later from savings. */
  openingFee: Fcfa;
  /** Part of the opening fee taken from savings later (`soldePreleveSurEpargneFcfa`). */
  openingFeeFromSavings: Fcfa;
  /** Minimum savings deposit (`epargneMinimumFcfa`). */
  minimumSavings: Fcfa;
  /** Cash ceiling of a cash desk (`plafondCaisseFcfa`). */
  cashCeiling: Fcfa;
  /** `HH:mm`, Africa/Abidjan (`heureCoupureCaisse`). */
  cutoffTime: string;
  /** Days before a repayment counts as late (`joursDeGrace`). */
  gracePeriodDays: number;
  /** Late penalty per day (`penaliteRetardParJourFcfa`). */
  latePenaltyPerDay: Fcfa;
  /** Minimum weeks of savings before a loan (`semainesObservationMin`). */
  minimumObservationWeeks: number;
  /** Target time to review a loan request (`delaiAnalysePretHeures`). */
  loanReviewHours: number;
}
