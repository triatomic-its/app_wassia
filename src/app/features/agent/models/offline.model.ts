import { EnrollmentStatus, Fcfa, SavingsBalance } from '@core/models';
import { Hash, IsoDate } from '@core/models/registre.model';

/** A cash deposit kept on the phone until it reaches the registry. */
export interface QueuedDeposit {
  /** The deposit's idempotency key (also the store key). */
  key: string;
  memberId: Hash;
  agentId: Hash;
  amount: Fcfa;
  /** Business date computed on the phone when the deposit was taken. */
  dateValeur: IsoDate;
  createdAt: string;
  fullName: string;
  printedNumber: string;
  state: 'pending' | 'failed';
  /** Why the registry refused it (plain French). */
  error?: string;
}

/** A card the agent can collect on without network (copy taken while online). */
export interface CachedCard {
  /** The QR token read on the card (also the store key). */
  key: string;
  cardId: Hash;
  memberId: Hash;
  fullName: string;
  printedNumber: string;
  status: EnrollmentStatus;
  balance: SavingsBalance | null;
  /** When the balance was read. */
  balanceAt?: string;
}
