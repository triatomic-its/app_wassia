/** Markets covered by the field agents (seed data; to confirm with the client). */
export const MARKETS = ['Adjamé', 'Marcory', 'Yopougon'] as const;

/** Suggestions for the "Activité" field — free text is allowed. */
export const TRADE_SUGGESTIONS = [
  'Vente de pagnes',
  'Vente de poisson fumé',
  'Vente de légumes',
  'Vente de condiments',
  'Vente de vivriers',
  "Vente d'attiéké",
  'Vente de riz',
  'Vente de friperie',
  'Couture',
  'Coiffure',
] as const;

/** Start of the collection day, used for the countdown bar before the 16:00 cut-off (ASSUMPTION A20). */
export const COLLECTION_DAY_START = '07:00';
