import { IdType, MembershipChannel, SavingsFrequency } from '../domain/enrollment';

/** Markets covered by the field agents (seed data; to confirm with the client). */
export const MARKETS = ['Adjamé', 'Marcory', 'Yopougon'] as const;

/** Start of the collection day, used for the countdown bar before the 16:00 cut-off (ASSUMPTION A20). */
export const COLLECTION_DAY_START = '07:00';

/** How the membership fee can be paid on the spot (icons from `@ng-icons/lucide`). */
export const MEMBERSHIP_CHANNEL_OPTIONS = [
  { value: 'CASH', label: 'Espèces', icon: 'lucideBanknote' },
  { value: 'WAVE', label: 'Wave', icon: 'lucideSmartphone' },
] as const satisfies readonly { value: MembershipChannel; label: string; icon: string }[];

/** Identity documents (`DossierSaisi.typePiece`). Labels in plain French. */
export const ID_TYPE_OPTIONS = [
  { value: 'CNI', label: 'Carte d’identité (CNI)' },
  { value: 'CMU', label: 'Carte CMU' },
  { value: 'PASSEPORT', label: 'Passeport' },
] as const satisfies readonly { value: IdType; label: string }[];

/** Savings frequency (`Engagement.periodicite`). */
export const SAVINGS_FREQUENCY_OPTIONS = [
  { value: 'quotidienne', label: 'Chaque jour' },
  { value: 'hebdomadaire', label: 'Chaque semaine' },
  { value: 'mensuelle', label: 'Chaque mois' },
] as const satisfies readonly { value: SavingsFrequency; label: string }[];

/**
 * Consents the registry requires at enrollment (`Finalite` codes): use of the identity and
 * contact details, and of the QR card. One checkbox covers both (ASSUMPTION A34).
 */
export const REQUIRED_CONSENTS = ['identite-contact', 'carte-qr'] as const;

/** Version of the terms the merchant accepts (`Consentement.versionDocument`, ASSUMPTION A34). */
export const CONSENT_DOCUMENT_VERSION = 'cgu-2026-11';

/** Sectors offered when the registry is off (mock back end only). */
export const MOCK_SECTORS = [
  { value: 'commerce', label: 'Import-export et commerce général' },
  { value: 'agrobusiness', label: 'Agrobusiness et élevage' },
  { value: 'transformation', label: 'Transformation agro-industrielle' },
] as const;
