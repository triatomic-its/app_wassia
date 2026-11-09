import { Fcfa, IsoDate } from './common.model';
import { Card, Member } from './member.model';

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
  paymentPending: number;
  cardsToAssign: number;
}

/** `GET /members/phone-check?phone=` */
export interface PhoneCheck {
  available: boolean;
  /** Masked name of the existing merchant when the number is already used. */
  existingName?: string;
}

/** `GET /cards/lookup?qr=` or `?number=` */
export interface CardLookup {
  card: Pick<Card, 'id' | 'printedNumber' | 'status'>;
}

/** `POST /cards/assign` response. */
export interface CardAssignResult {
  member: Member;
  card: Card;
}
