import type { ApiError } from './error.model';

/**
 * Turns a registry refusal (`{ message }`, 409 or 422) into a plain French error.
 * The registry's messages are written for developers ("hm_conflict: un AncrageTelephone courant
 * existe déjà (…) pour cette clé…"): known conflicts get a stable code and a simple sentence,
 * technical ones a generic sentence; only readable business messages are shown as they are.
 */
export function translateRegistreRefusal(status: 409 | 422, raw: string): ApiError {
  const known = KNOWN_REFUSALS.find((k) => k.pattern.test(raw));
  if (known) return { code: known.code, message: known.message, details: known.details };

  const message = raw.replace(/^hm(_conflict)?:\s*/i, '').trim();
  if (!message || TECHNICAL.test(message)) {
    return {
      code: status === 409 ? 'CONFLICT' : 'VALIDATION',
      message:
        status === 409
          ? 'Cette information est déjà enregistrée. Vérifiez puis réessayez.'
          : 'Une information n’est pas reconnue. Réessayez ; si cela continue, prévenez le support.',
    };
  }
  return { code: status === 409 ? 'CONFLICT' : 'VALIDATION', message: capitalize(message) };
}

const KNOWN_REFUSALS: readonly {
  pattern: RegExp;
  code: string;
  message: string;
  details?: Record<string, string[]>;
}[] = [
  {
    pattern: /AncrageTelephone/,
    code: 'PHONE_ALREADY_USED',
    message: 'Ce numéro est déjà enregistré pour un autre marchand.',
  },
  {
    pattern: /AncragePiece/,
    code: 'ID_ALREADY_USED',
    message: 'Cette pièce d’identité est déjà enregistrée pour un autre marchand.',
    details: { idNumber: ['Cette pièce d’identité est déjà enregistrée pour un autre marchand.'] },
  },
  {
    pattern: /AssociationCarte/,
    code: 'CARD_ALREADY_USED',
    message: 'Cette carte est déjà associée à un autre marchand. Prenez une carte vierge.',
  },
  {
    pattern: /introuvable pour le rôle carte/,
    code: 'CARD_UNKNOWN',
    message: 'Cette carte n’est pas une carte WASSIA. Prenez une carte vierge.',
  },
];

/** Hashes, fact roles or catalogue names: not for a merchant's or an agent's eyes. */
const TECHNICAL =
  /[0-9a-f]{16,}|hachage|prédécesseur|feuille|predecesseur|\b[A-Z][a-z]+[A-Z]\w*\.\w+/;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
