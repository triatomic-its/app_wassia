/** Printed card number format from the mockup: `WAS-000124` (ASSUMPTION A8). */
export const CARD_PREFIX = 'WAS-';
export const CARD_DIGITS = 6;
export const CARD_BATCH_SIZE = 1_000;

export function formatCardNumber(n: number): string {
  return `${CARD_PREFIX}${String(n).padStart(CARD_DIGITS, '0')}`;
}
