import { Fcfa, Member } from '@core/models';
import { IsoDate } from '@core/models/registre.model';

/** One merchant of the agent's round, for the day. */
export interface RoundEntry {
  member: Member;
  printedNumber: string;
  /** Savings deposits recorded today (business day). */
  paidToday: Fcfa;
  /** Cash deposits taken today without network, not sent yet. */
  waitingSync: Fcfa;
  state: 'paid' | 'todo';
}

export interface RoundDay {
  businessDate: IsoDate;
  entries: RoundEntry[];
}

export type RoundFilter = 'all' | 'todo' | 'paid';
