export type Role =
  | 'DG'
  /** Directeur adjoint — read-only (ASSUMPTION A15). */
  | 'DEPUTY_DG'
  /** Chef d'agence — approves loans up to 500 000 F. */
  | 'BRANCH_MANAGER'
  /** Gestionnaire — monitors enrollments. */
  | 'MANAGER'
  | 'ACCOUNTANT'
  | 'CASHIER'
  | 'AGENT';

export const ROLES: readonly Role[] = [
  'DG',
  'DEPUTY_DG',
  'BRANCH_MANAGER',
  'MANAGER',
  'ACCOUNTANT',
  'CASHIER',
  'AGENT',
];

export interface User {
  id: string;
  fullName: string;
  phone: string;
  role: Role;
  active: boolean;
  /** Market / zone for agents. */
  zone?: string;
}
