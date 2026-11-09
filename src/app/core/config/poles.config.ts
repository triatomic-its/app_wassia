/**
 * Holding business units (ASSUMPTION A3 — the list differs between the spec, the brand
 * guidelines and the website mockup; to confirm with the PDG).
 * `color` is a design-token name, never a hex value.
 */
export const POLES = [
  { code: 'FINANCE', label: 'Innov Finance', color: 'emerald' },
  { code: 'REAL_ESTATE', label: 'Immobilier', color: 'sapin' },
  { code: 'TRANSPORT', label: 'Transport', color: 'primary' },
  { code: 'TRAVEL', label: 'Voyage', color: 'accent' },
  { code: 'TRADE', label: 'Commerce', color: 'primary-deep' },
] as const;
