/**
 * Out-of-contract features. `false` ⇒ no route, no menu entry, no bundle loaded.
 * The loan module is now in scope (decision of 2026-11-09, ASSUMPTION A6) and has no flag.
 */
export const FEATURE_FLAGS = {
  exceptionalApprovals: false,
  rentPayments: false,
  bankReconciliation: false,
  bluetoothPrinting: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
