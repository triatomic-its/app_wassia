import { Fcfa, IsoDate } from './common.model';
import { Card, Member } from './member.model';
import { Payment } from './payment.model';

/** `GET /agent/today` — the agent's home screen. */
export interface AgentToday {
  businessDate: IsoDate;
  /** `HH:mm`, Africa/Abidjan. */
  cutoffTime: string;
  collected: Fcfa;
  deposits: number;
  enrolled: number;
  /** Cash collected today and not yet handed to the cashier. */
  toRemit: Fcfa;
  /** Own merchants with a late loan instalment. */
  lateMembers: number;
  /** Own merchants registered (paid) who still have no card. */
  cardsToAssign: number;
}

/** `POST /members/phone-check { phone }` */
export interface PhoneCheck {
  available: boolean;
  /** Masked name of the existing merchant when the number is already used. */
  existingName?: string;
}

/** `POST /cards/lookup { qrToken }` (or `{ number }` for back-office card management) */
export interface CardLookup {
  card: Pick<Card, 'id' | 'printedNumber' | 'status'>;
}

/** POST /members response: the merchant is registered and has paid; the card comes next. */
export interface EnrollmentResult {
  member: Member;
  payment: Payment;
}

/** POST /cards/assign response: the scanned card is associated, the member is active. */
export interface CardAssignResult {
  member: Member;
  card: Card;
}
