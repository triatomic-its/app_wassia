import { textOf } from '@core/api/registre-facts.service';
import { CONSENT_DOCUMENT_VERSION, REQUIRED_CONSENTS } from '@core/config/enrollment.config';
import { EnrollmentInput, phoneDigits } from '@core/domain/enrollment';
import { DossierSaisi, FaitResume } from '@core/models/registre.model';
import { Market } from '@core/services/reference.service';

/**
 * Opaque token of the person (`DossierSaisi.jeton`, ASSUMPTION A28), derived from the
 * registration's idempotency key: a retry sends the same token, so the registry returns the same
 * person and account instead of creating them twice.
 */
export function personToken(idempotencyKey: string): string {
  return idempotencyKey.replace(/-/g, '').toLowerCase();
}

/** Idempotency key of the cash part of the opening fee (≥ 8 characters, set on the device). */
export function membershipCashKey(idempotencyKey: string): string {
  return `adhesion-${personToken(idempotencyKey)}`;
}

/**
 * Pure: the registration form → the registry's `DossierSaisi`. Market, agency, sector and
 * consents are sent as registry hashes (the registry refuses codes).
 */
export function toDossier(
  input: EnrollmentInput,
  jeton: string,
  markets: readonly Market[],
  purposes: readonly FaitResume[],
  /** Minimum weeks of savings before a loan (registry rule `semainesObservationMin`). */
  observationWeeks: number,
): DossierSaisi {
  const market = markets.find((m) => m.id === input.market);
  if (!market) throw new Error('REGISTRE_MARKET_UNKNOWN');
  const purposeIds = REQUIRED_CONSENTS.map((code) => {
    const purpose = purposes.find((p) => textOf(p, 'code') === code);
    if (!purpose) throw new Error(`REGISTRE_PURPOSE_MISSING: ${code}`);
    return purpose.fait;
  });

  return {
    jeton,
    nom: input.lastName,
    prenoms: input.firstNames,
    telephone: phoneDigits(input.phone),
    typePiece: input.idType,
    numeroPiece: input.idNumber,
    secteur: input.sector,
    agence: market.agencyId,
    marche: market.id,
    numeroEtale: input.stall ?? null,
    photoRef: input.photoUrl ?? null,
    referent: {
      nom: input.referentName,
      lien: input.referentLink,
      telephone: phoneDigits(input.referentPhone),
      informe: input.referentInformed,
    },
    engagement: {
      periodicite: input.savingsFrequency,
      montantMinFcfa: input.savingsAmount,
      semainesMin: observationWeeks,
      motif: input.savingsGoal,
      accepte: input.commitmentAccepted,
    },
    consentements: purposeIds.map((finalite) => ({
      finalite,
      versionDocument: CONSENT_DOCUMENT_VERSION,
      accepte: input.consentAccepted,
    })),
  };
}
