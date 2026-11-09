import { Fcfa, IsoDateTime } from './common.model';

/**
 * Enrollment lifecycle from the client mockup (ASSUMPTION A2):
 * no manual validation, the account is created automatically.
 */
export type EnrollmentStatus =
  /** Agent is still filling in the form (required info incomplete). */
  | 'DRAFT'
  /** Account created automatically, waiting for the 1 000 F membership payment. */
  | 'PAYMENT_PENDING'
  /** Paid, the agent must associate a QR card. */
  | 'CARD_TO_ASSIGN'
  | 'ACTIVE'
  /** e.g. savings blocked after a second late loan repayment. */
  | 'SUSPENDED';

export interface Member {
  id: string;
  fullName: string;
  phone: string;
  market: string;
  trade: string;
  /** Stall location, e.g. "Allée B, étal 12". */
  stall?: string;
  agentId: string;
  status: EnrollmentStatus;
  statusReason?: string;
  cardId?: string;
  accountNumber?: string;
  /** Prepaid card balance — this IS the savings (ASSUMPTION A13). */
  savings: Fcfa;
  /** Expected daily deposit. */
  dailyTarget?: Fcfa;
  photoUrl?: string;
  idDocUrl?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type CardStatus = 'UNASSIGNED' | 'ASSIGNED' | 'ACTIVE' | 'BLOCKED' | 'REPLACED';

export interface Card {
  id: string;
  /** Printed number, e.g. `WAS-000124`. Never encoded in the QR. */
  printedNumber: string;
  /** Opaque random token — the only content of the QR code. */
  qrToken: string;
  status: CardStatus;
  memberId?: string;
}
