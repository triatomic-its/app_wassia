/**
 * Business roles, exactly the codes of the back end (`RoleMetier.code` in the registry).
 * Since 2026-11-20 the back end is the reference: no deputy director, no "gestionnaire".
 */
export type Role =
  | 'agent'
  /** Secrétaire — enters and checks enrollment files, requests loans. */
  | 'secretaire'
  /** Assistant — checks documents, studies loan requests. */
  | 'assistant'
  /** Chef d'agence — validates files, approves loans of 250 000 – 500 000 F. */
  | 'chef_agence'
  | 'caissiere'
  | 'comptable'
  | 'dg';

export const ROLES: readonly Role[] = [
  'dg',
  'chef_agence',
  'secretaire',
  'assistant',
  'comptable',
  'caissiere',
  'agent',
];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export interface User {
  /** In the registry: the hash of the `Utilisateur` fact. */
  id: string;
  fullName: string;
  phone: string;
  role: Role;
  active: boolean;
  /** Market / zone for agents. */
  zone?: string;
}
