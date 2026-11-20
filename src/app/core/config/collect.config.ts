import { Fcfa } from '../models';

/**
 * Quick amounts of "Scanner et encaisser" (mockup). Any other whole amount can be typed: the
 * registry accepts any positive integer (checked 2026-11-20, A36).
 */
export const QUICK_DEPOSIT_AMOUNTS: readonly Fcfa[] = [500, 1_000, 2_000];

/** Amount selected when a card has just been scanned. */
export const DEFAULT_DEPOSIT_AMOUNT: Fcfa = 1_000;
