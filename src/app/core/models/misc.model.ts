import { Fcfa, IsoDateTime } from './common.model';

export interface AppNotification {
  id: string;
  templateCode: string;
  to: string;
  body: string;
  sentAt?: IsoDateTime;
  status: 'QUEUED' | 'SENT' | 'FAILED';
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  at: IsoDateTime;
}

export interface Settings {
  cashCeiling: Fcfa;
  /** `HH:mm` in Africa/Abidjan. */
  cashCutoffTime: string;
  /** `HH:mm` — expected counting time. */
  cashCountTime: string;
}

/** SMS template; variables are written `[Nom]`, `[Montant]`… in `body`. */
export interface SmsTemplate {
  id: string;
  code: 'DEPOSIT' | 'ENROLLMENT' | 'DUE_REMINDER' | 'LATE_REMINDER';
  label: string;
  body: string;
  variables: string[];
}
