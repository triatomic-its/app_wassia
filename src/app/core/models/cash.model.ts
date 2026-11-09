import { Fcfa, IsoDate, IsoDateTime } from './common.model';

/**
 * Three-level daily closure from the mockup:
 * cashier counts → accountant checks → DG closes.
 */
export type ClosureStatus = 'OPEN' | 'LOCKED' | 'COUNTED' | 'CHECKED' | 'CLOSED' | 'DISPUTED';

export const DENOMINATIONS = [
  '10000',
  '5000',
  '2000',
  '1000',
  '500',
  '250',
  '200',
  '100',
  '50',
  '25',
  '10',
  '5',
] as const;

export type Denomination = (typeof DENOMINATIONS)[number];

/** Count of notes/coins per denomination. */
export type Billettage = Record<Denomination, number>;

export interface CashClosure {
  id: string;
  businessDate: IsoDate;
  status: ClosureStatus;
  expected: Fcfa;
  counted: Fcfa;
  variance: Fcfa;
  varianceReason?: string;
  billettage: Billettage;
  countedBy?: string;
  countedAt?: IsoDateTime;
  checkedBy?: string;
  checkedAt?: IsoDateTime;
  closedBy?: string;
  closedAt?: IsoDateTime;
}

export type RemittanceStatus = 'RECEIVED' | 'PENDING' | 'MISSING';

/** Cash handed over by an agent to the cashier. */
export interface Remittance {
  id: string;
  closureId: string;
  amount: Fcfa;
  fromUserId: string;
  toUserId: string;
  status: RemittanceStatus;
  at?: IsoDateTime;
}

export interface LedgerLine {
  account: string;
  debit: Fcfa;
  credit: Fcfa;
}

/** Append-only double-entry ledger entry. Corrections are reversal entries only. */
export interface LedgerEntry {
  id: string;
  date: IsoDateTime;
  journal: string;
  label: string;
  lines: LedgerLine[];
  reversesEntryId?: string;
  reversedByEntryId?: string;
  reason?: string;
  createdBy: string;
  sourcePaymentId?: string;
}
