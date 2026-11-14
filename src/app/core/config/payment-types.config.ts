import { Fcfa, PaymentChannel, PaymentType } from '../models';

/** Membership fee paid on the spot at enrollment, unless the administration changes it (A4). */
export const DEFAULT_MEMBERSHIP_FEE: Fcfa = 1_000;

/** Default payment types, editable in admin (ASSUMPTION A4). */
export const DEFAULT_PAYMENT_TYPES: readonly PaymentType[] = [
  {
    id: 'pt-membership',
    code: 'MEMBERSHIP',
    label: 'Adhésion',
    defaultAmount: DEFAULT_MEMBERSHIP_FEE,
    fixedAmount: true,
    active: true,
  },
  {
    id: 'pt-savings',
    code: 'SAVINGS',
    label: 'Épargne',
    defaultAmount: 2_000,
    fixedAmount: false,
    active: true,
  },
  {
    id: 'pt-file-fee',
    code: 'FILE_FEE',
    label: 'Frais de dossier',
    defaultAmount: 5_000,
    fixedAmount: true,
    active: true,
  },
  {
    id: 'pt-repayment',
    code: 'LOAN_REPAYMENT',
    label: 'Remboursement de crédit',
    fixedAmount: false,
    active: true,
  },
];

/** Quick amounts on the public QR page (mockup). */
export const QUICK_AMOUNTS = [500, 1_000, 2_000] as const;

/** Payment channels (ASSUMPTION A7). Only Wave is simulated end to end. */
export const PAYMENT_CHANNELS: readonly { channel: PaymentChannel; label: string }[] = [
  { channel: 'WAVE', label: 'Wave' },
  { channel: 'ORANGE', label: 'Orange Money' },
  { channel: 'MTN', label: 'MTN MoMo' },
  { channel: 'MOOV', label: 'Moov Money' },
  { channel: 'CASH', label: 'Espèces' },
];
