/**
 * Dev only: QR token of a demo card created by `npm run seed:registre`. The seed derives each
 * token from the printed number (`sha256("wassia-demo:carte:WAS-000001")`, first 32 hex
 * characters), so the Démo panel can "scan" a registry card without a camera.
 * Must stay in step with `scripts/seed-registre.mjs`.
 */
export async function registreDemoCardToken(printedNumber: string): Promise<string> {
  const bytes = new TextEncoder().encode(`wassia-demo:carte:${printedNumber}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

/** `3` or `WAS-3` → `WAS-000003`; anything else → null. */
export function toPrintedNumber(value: string): string | null {
  const digits = value
    .trim()
    .toUpperCase()
    .replace(/^WAS-?/, '');
  if (!/^\d{1,6}$/.test(digits) || Number(digits) < 1) return null;
  return `WAS-${digits.padStart(6, '0')}`;
}
