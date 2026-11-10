import { Fcfa, IsoDateTime } from './common.model';

/**
 * Member status. Client rule (2026-11-09): a merchant is registered only after paying the
 * 1 000 F on the spot and receiving a QR card, so there is no pending or draft state.
 */
export type EnrollmentStatus =
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
