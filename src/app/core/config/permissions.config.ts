import { Role } from '../models';

/**
 * Single source of truth for Role → permissions (ASSUMPTION A1, from the client mockup).
 * Guards, the `*appCan` directive and navigation read this matrix.
 * Never write `if (role === ...)` in a component.
 */
export const PERMISSIONS = [
  'supervision.view',
  'enrollment.monitor',
  'enrollment.remind',
  'member.enroll',
  'card.assign',
  'cards.manage',
  'collect.field',
  'collect.counter',
  'loan.view',
  'loan.request',
  'loan.compliance',
  /** ≤ 500 000 F */
  'loan.approve.tier1',
  /** ]500 000 ; 3 000 000] F — ASSUMPTION A11 */
  'loan.approve.tier2',
  /** > 3 000 000 F, DG part of the dual approval */
  'loan.approve.tier3.dg',
  /** > 3 000 000 F, accountant part of the dual approval */
  'loan.approve.tier3.accounting',
  'loan.disburse',
  'cash.view',
  'cash.closure.count',
  'cash.closure.check',
  'cash.closure.close',
  'ledger.view',
  'ledger.write',
  'reconciliation',
  'merchants.view',
  'reports.view',
  'admin.manage',
  'audit.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  DG: [
    'supervision.view',
    'enrollment.monitor',
    'enrollment.remind',
    'loan.view',
    'loan.approve.tier2',
    'loan.approve.tier3.dg',
    'cash.view',
    'cash.closure.close',
    'ledger.view',
    'merchants.view',
    'reports.view',
    'admin.manage',
    'audit.view',
  ],
  DEPUTY_DG: [
    'supervision.view',
    'enrollment.monitor',
    'loan.view',
    'cash.view',
    'ledger.view',
    'merchants.view',
    'reports.view',
    'audit.view',
  ],
  BRANCH_MANAGER: [
    'supervision.view',
    'enrollment.monitor',
    'enrollment.remind',
    'loan.view',
    'loan.approve.tier1',
    'merchants.view',
    'reports.view',
  ],
  MANAGER: [
    'enrollment.monitor',
    'enrollment.remind',
    'cards.manage',
    'loan.view',
    'loan.compliance',
  ],
  ACCOUNTANT: [
    'loan.view',
    'loan.approve.tier3.accounting',
    'cash.view',
    'cash.closure.check',
    'ledger.view',
    'ledger.write',
    'reconciliation',
    'merchants.view',
    'reports.view',
    'audit.view',
  ],
  CASHIER: ['collect.counter', 'loan.view', 'loan.disburse', 'cash.view', 'cash.closure.count'],
  AGENT: ['member.enroll', 'card.assign', 'collect.field', 'loan.request'],
};

export function permissionsOf(role: Role): ReadonlySet<Permission> {
  return new Set(ROLE_PERMISSIONS[role]);
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Roles that only consult data and never act (rendered with a "lecture seule" badge). */
export const READ_ONLY_ROLES: readonly Role[] = ['DEPUTY_DG'];
