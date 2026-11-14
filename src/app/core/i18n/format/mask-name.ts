/**
 * Masks a full name for public pages: `Koné Diarra` → `K*** D***`.
 * Never reveals more than the first letter of each word.
 */
export function maskName(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toLocaleUpperCase('fr-FR')}***`)
    .join(' ');
}
