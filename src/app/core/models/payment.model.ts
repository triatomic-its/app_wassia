import { Fcfa, IsoDateTime } from './common.model';

export type PaymentChannel = 'WAVE' | 'ORANGE' | 'MTN' | 'MOOV' | 'CASH';

export type PaymentStatus =
  'PENDING' | 'PENDING_CASH' | 'CONFIRMED' | 'ORPHAN' | 'DUPLICATE' | 'REVERSED';

export interface PaymentType {
  id: string;
  code: string;
  label: string;
  defaultAmount?: Fcfa;
  fixedAmount: boolean;
  active: boolean;
}

export interface Payment {
  id: string;
  memberId?: string;
  typeId: string;
  amount: Fcfa;
  channel: PaymentChannel;
  status: PaymentStatus;
  externalRef?: string;
  agentId?: string;
  cashierId?: string;
  createdAt: IsoDateTime;
}

export interface ReconciliationItem {
  id: string;
  kind: 'ORPHAN' | 'DUPLICATE';
  paymentIds: string[];
  suggestedMemberId?: string;
  resolved: boolean;
}
