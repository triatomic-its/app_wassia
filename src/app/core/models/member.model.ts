import { Fcfa, IsoDateTime } from './common.model';

/**
 * Member status. Client rule (2026-11-10): the merchant is registered once the 1 000 F are paid on
 * the spot, then the agent associates a card by scanning its QR code.
 */
export type EnrollmentStatus =
  /** Paid and registered; the agent still has to scan a blank card. */
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
  /** Identity document number (CNI). */
  idNumber?: string;
  cardId?: string;
  accountNumber?: string;
  /** Prepaid card balance — this IS the savings (ASSUMPTION A13). */
  savings: Fcfa;
  /** Expected daily deposit. */
  dailyTarget?: Fcfa;
  /** Photo of the stall / business. */
  photoUrl?: string;
  /** Photo of the identity document. */
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
