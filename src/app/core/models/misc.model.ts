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
  /** Hours without membership payment before a reminder is advised. */
  paymentReminderHours: number;
}
