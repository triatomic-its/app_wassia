import { ClosureStatus, EnrollmentStatus, LoanStatus, PaymentStatus } from '../models';
import { Permission } from './permissions.config';

/** `SYSTEM` transitions are triggered by the back end (payment received, 16:00 lock…), never by a button. */
export type Actor = Permission | 'SYSTEM';

export interface Transition<S extends string> {
  from: S;
  to: S;
  actor: Actor;
  /** A written reason is mandatory for this transition. */
  reasonRequired: boolean;
  /** French label of the action button. */
  label: string;
}

export type TransitionTable<S extends string> = readonly Transition<S>[];

/** Enrollment from the mockup — no manual validation (ASSUMPTION A2). */
export const ENROLLMENT_WORKFLOW: TransitionTable<EnrollmentStatus> = [
  {
    from: 'DRAFT',
    to: 'PAYMENT_PENDING',
    actor: 'SYSTEM',
    reasonRequired: false,
    label: 'Créer le compte',
  },
  {
    from: 'PAYMENT_PENDING',
    to: 'CARD_TO_ASSIGN',
    actor: 'SYSTEM',
    reasonRequired: false,
    label: 'Paiement reçu',
  },
  {
    from: 'CARD_TO_ASSIGN',
    to: 'ACTIVE',
    actor: 'card.assign',
    reasonRequired: false,
    label: 'Associer la carte',
  },
  { from: 'ACTIVE', to: 'SUSPENDED', actor: 'SYSTEM', reasonRequired: true, label: 'Bloquer' },
  { from: 'SUSPENDED', to: 'ACTIVE', actor: 'SYSTEM', reasonRequired: false, label: 'Débloquer' },
];

/** Daily cash closure in three levels: cashier → accountant → DG. */
export const CLOSURE_WORKFLOW: TransitionTable<ClosureStatus> = [
  {
    from: 'OPEN',
    to: 'LOCKED',
    actor: 'SYSTEM',
    reasonRequired: false,
    label: 'Verrouiller à 16 h 00',
  },
  {
    from: 'LOCKED',
    to: 'COUNTED',
    actor: 'cash.closure.count',
    reasonRequired: false,
    label: 'Envoyer au comptable',
  },
  {
    from: 'COUNTED',
    to: 'CHECKED',
    actor: 'cash.closure.check',
    reasonRequired: false,
    label: 'Envoyer au DG',
  },
  {
    from: 'COUNTED',
    to: 'DISPUTED',
    actor: 'cash.closure.check',
    reasonRequired: true,
    label: 'Signaler un problème',
  },
  {
    from: 'DISPUTED',
    to: 'COUNTED',
    actor: 'cash.closure.count',
    reasonRequired: false,
    label: 'Recompter et renvoyer',
  },
  {
    from: 'CHECKED',
    to: 'CLOSED',
    actor: 'cash.closure.close',
    reasonRequired: false,
    label: 'Clôturer la journée',
  },
  {
    from: 'CHECKED',
    to: 'DISPUTED',
    actor: 'cash.closure.close',
    reasonRequired: true,
    label: 'Refuser la clôture',
  },
];

/** Payments are never deleted: cancellation is REVERSED plus a reversal entry. */
export const PAYMENT_WORKFLOW: TransitionTable<PaymentStatus> = [
  { from: 'PENDING', to: 'CONFIRMED', actor: 'SYSTEM', reasonRequired: false, label: 'Confirmer' },
  {
    from: 'PENDING_CASH',
    to: 'CONFIRMED',
    actor: 'collect.counter',
    reasonRequired: false,
    label: 'Encaisser',
  },
  {
    from: 'ORPHAN',
    to: 'CONFIRMED',
    actor: 'reconciliation',
    reasonRequired: true,
    label: 'Rattacher à un marchand',
  },
  {
    from: 'DUPLICATE',
    to: 'REVERSED',
    actor: 'reconciliation',
    reasonRequired: true,
    label: 'Annuler le doublon',
  },
  {
    from: 'CONFIRMED',
    to: 'REVERSED',
    actor: 'ledger.write',
    reasonRequired: true,
    label: 'Contre-passer',
  },
];

/** Loan workflow (cahier définitif v2.0 + mockup). Approval tiers are checked in `loan.config.ts`. */
export const LOAN_WORKFLOW: TransitionTable<LoanStatus> = [
  {
    from: 'REQUESTED',
    to: 'COMPLIANCE_OK',
    actor: 'loan.compliance',
    reasonRequired: false,
    label: 'Dossier conforme',
  },
  {
    from: 'REQUESTED',
    to: 'TO_CORRECT',
    actor: 'loan.compliance',
    reasonRequired: true,
    label: 'À corriger',
  },
  {
    from: 'REQUESTED',
    to: 'REJECTED',
    actor: 'loan.compliance',
    reasonRequired: true,
    label: 'Refuser',
  },
  {
    from: 'TO_CORRECT',
    to: 'REQUESTED',
    actor: 'loan.request',
    reasonRequired: false,
    label: 'Renvoyer le dossier',
  },
  {
    from: 'COMPLIANCE_OK',
    to: 'APPROVED',
    actor: 'SYSTEM',
    reasonRequired: false,
    label: 'Approuvé',
  },
  { from: 'COMPLIANCE_OK', to: 'REJECTED', actor: 'SYSTEM', reasonRequired: true, label: 'Refusé' },
  {
    from: 'APPROVED',
    to: 'DISBURSED',
    actor: 'loan.disburse',
    reasonRequired: false,
    label: 'Décaisser',
  },
  {
    from: 'DISBURSED',
    to: 'REPAYING',
    actor: 'SYSTEM',
    reasonRequired: false,
    label: 'Premier remboursement',
  },
  { from: 'REPAYING', to: 'LATE_1', actor: 'SYSTEM', reasonRequired: false, label: 'Retard 1' },
  { from: 'LATE_1', to: 'LATE_2', actor: 'SYSTEM', reasonRequired: false, label: 'Retard 2' },
  {
    from: 'LATE_1',
    to: 'REPAYING',
    actor: 'SYSTEM',
    reasonRequired: false,
    label: 'Retard régularisé',
  },
  {
    from: 'LATE_2',
    to: 'REPAYING',
    actor: 'SYSTEM',
    reasonRequired: false,
    label: 'Retard régularisé',
  },
  { from: 'REPAYING', to: 'REPAID', actor: 'SYSTEM', reasonRequired: false, label: 'Remboursé' },
];

/** Transitions a user can trigger by hand from `from`, given their permissions. */
export function availableTransitions<S extends string>(
  table: TransitionTable<S>,
  from: S,
  permissions: ReadonlySet<Permission>,
): Transition<S>[] {
  return table.filter((t) => t.from === from && t.actor !== 'SYSTEM' && permissions.has(t.actor));
}

export function findTransition<S extends string>(
  table: TransitionTable<S>,
  from: S,
  to: S,
): Transition<S> | undefined {
  return table.find((t) => t.from === from && t.to === to);
}

export function canTransition<S extends string>(
  table: TransitionTable<S>,
  from: S,
  to: S,
  actor: Actor | ReadonlySet<Permission>,
): boolean {
  const t = findTransition(table, from, to);
  if (!t) return false;
  if (typeof actor === 'string') return t.actor === actor;
  return t.actor !== 'SYSTEM' && actor.has(t.actor);
}
