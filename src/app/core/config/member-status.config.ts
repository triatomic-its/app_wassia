import { EnrollmentStatus, Tone } from '../models';

/** How a member status is shown everywhere (chip = colour + text, never colour alone). */
export const MEMBER_STATUS_DISPLAY: Readonly<
  Record<EnrollmentStatus, { label: string; tone: Tone }>
> = {
  CARD_TO_ASSIGN: { label: 'Carte à associer', tone: 'info' },
  PENDING_VALIDATION: { label: 'En attente de validation', tone: 'warning' },
  ACTIVE: { label: 'Actif', tone: 'success' },
  SUSPENDED: { label: 'Épargne bloquée', tone: 'danger' },
};
