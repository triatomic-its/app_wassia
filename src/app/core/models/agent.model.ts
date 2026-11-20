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

/** One choice of a select list: the value sent to the server, the label shown. */
export interface ChoiceOption {
  value: string;
  label: string;
}

/** Lists and rules the registration form needs (from the registry, or the mock). */
export interface EnrollmentOptions {
  markets: ChoiceOption[];
  sectors: ChoiceOption[];
  /** Minimum savings deposit the merchant can commit to. */
  minimumSavings: Fcfa;
}

/** A merchant's savings as the registry counts them. */
export interface SavingsBalance {
  /** Booked in the ledger (Wave at once, cash after the closure visa). */
  booked: Fcfa;
  /** Cash collected, waiting for the cash closure visa. */
  pending: Fcfa;
  /** booked + pending: what the merchant has handed over. */
  total: Fcfa;
}

/** The merchant found by scanning their card, ready to receive a deposit. */
export interface CollectTarget {
  member: Member;
  card: Pick<Card, 'id' | 'printedNumber' | 'status'>;
  /** Unknown when found offline and never read online before. */
  balance: SavingsBalance | null;
  /** Found in the copy kept on the phone (no network). */
  offline?: boolean;
}

export type DepositChannel = 'CASH' | 'WAVE';

export interface DepositInput {
  memberId: string;
  amount: Fcfa;
  channel: DepositChannel;
  /** Wave transaction reference (required for Wave: it is the payment's key). */
  reference?: string;
}

export interface DepositResult {
  payment: Payment;
  /** Unknown when the deposit was kept on the phone. */
  balance: SavingsBalance | null;
  /** No network: kept on the phone, sent as soon as the connection is back. */
  queued?: boolean;
}
