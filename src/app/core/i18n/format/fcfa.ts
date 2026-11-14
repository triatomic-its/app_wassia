const NBSP = '\u00a0';
const NNBSP = '\u202f';

/**
 * Formats an integer FCFA amount: `1000` → `1 000 F` (non-breaking spaces).
 * Options: `signed` adds `+` / `−` (true minus sign) like the mockup ledger.
 */
export function formatFcfa(value: number | null | undefined, signed = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const abs = Math.abs(Math.trunc(value));
  const digits = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(abs)
    .replace(new RegExp(`[\\s${NNBSP}]`, 'g'), NBSP);
  const sign = value < 0 ? `−${NBSP}` : signed && value > 0 ? `+${NBSP}` : '';
  return `${sign}${digits}${NBSP}F`;
}
