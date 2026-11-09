import { Fcfa, IsoDateTime } from './common.model';
import { Role } from './user.model';

export type LoanDuration = 6 | 12 | 18;

export type LoanStatus =
  /** Agent submitted the request (KYC photos attached). */
  | 'REQUESTED'
  | 'TO_CORRECT'
  /** Documents checked by the Gestionnaire. */
  | 'COMPLIANCE_OK'
  | 'REJECTED'
  /** All required approvals obtained. */
  | 'APPROVED'
  | 'DISBURSED'
  | 'REPAYING'
  /** One late instalment — instant reminder. */
  | 'LATE_1'
  /** Two late instalments — savings blocked. */
  | 'LATE_2'
  | 'REPAID';

export interface LoanApproval {
  role: Role;
  userId: string;
  at: IsoDateTime;
}

export interface Loan {
  id: string;
  memberId: string;
  agentId: string;
  amount: Fcfa;
  months: LoanDuration;
  fee: Fcfa;
  total: Fcfa;
  monthly: Fcfa;
  status: LoanStatus;
  statusReason?: string;
  approvals: LoanApproval[];
  repaid: Fcfa;
  createdAt: IsoDateTime;
}

export interface LoanSchedule {
  total: Fcfa;
  /** Regular monthly instalment (rounded down). */
  monthly: Fcfa;
  /** Last instalment, absorbs the rounding remainder. */
  last: Fcfa;
}
