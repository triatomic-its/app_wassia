import { Role } from '../models';

/**
 * Permissions of the screens, **derived from the back end's habilitations** (2026-11-20: the back
 * end is the reference). The registry grants *actions* to roles (`Habilitation`); each UI
 * permission below is granted when the user's actions satisfy its rule in `PERMISSION_RULES`.
 * Guards, the `*appCan` directive and navigation read the derived set.
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
  /** 250 000 – 500 000 F */
  'loan.approve.tier1',
  /** 1 000 000 – 3 000 000 F */
  'loan.approve.tier2',
  /** 5 000 000 – 10 000 000 F, DG part of the dual approval */
  'loan.approve.tier3.dg',
  /** 5 000 000 – 10 000 000 F, accountant part of the dual approval */
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

/** Actions of the registry (`Habilitation.action`), as read on 2026-11-20. */
export const REGISTRE_ACTIONS = [
  'associer_carte',
  'bloquer_carte',
  'cloturer_caisse',
  'cloturer_pret',
  'constater_retard',
  'consulter_dashboard',
  'consulter_ecritures',
  'contre_passer',
  'decaisser',
  'decider_pret',
  'demander_correction',
  'demander_pret',
  'encaisser_especes',
  'etudier_pret',
  'gerer_utilisateurs',
  'lever_blocage',
  'lire_dossier',
  'parametrer',
  'prelever_frais',
  'rejeter_dossier',
  'remplacer_carte',
  'resoudre_conflit',
  'restituer_epargne',
  'saisir_dossier',
  'valider_cloture',
  'valider_dossier',
  'verifier_pieces',
  'viser_cloture',
  'voir_encaissements_propres',
  'voir_encaissements_tous',
] as const;

export type RegistreAction = (typeof REGISTRE_ACTIONS)[number];

/**
 * Copy of the registry's habilitations (`GET /faits?type=Habilitation`, 2026-11-20).
 * Used by the mock back end, and as a fallback while `GET /habilitations` answers an error.
 * The live list always wins when the server returns it.
 */
export const ROLE_ACTIONS_SNAPSHOT: Readonly<Record<Role, readonly RegistreAction[]>> = {
  agent: [
    'associer_carte',
    'demander_pret',
    'encaisser_especes',
    'lire_dossier',
    'saisir_dossier',
    'voir_encaissements_propres',
  ],
  secretaire: [
    'demander_correction',
    'demander_pret',
    'lire_dossier',
    'rejeter_dossier',
    'saisir_dossier',
    'verifier_pieces',
  ],
  assistant: ['etudier_pret', 'lire_dossier', 'verifier_pieces'],
  chef_agence: [
    'bloquer_carte',
    'constater_retard',
    'decider_pret',
    'demander_correction',
    'etudier_pret',
    'lever_blocage',
    'lire_dossier',
    'rejeter_dossier',
    'remplacer_carte',
    'resoudre_conflit',
    'valider_dossier',
  ],
  caissiere: [
    'cloturer_caisse',
    'decaisser',
    'encaisser_especes',
    'lire_dossier',
    'restituer_epargne',
    'voir_encaissements_tous',
  ],
  comptable: [
    'cloturer_pret',
    'constater_retard',
    'consulter_ecritures',
    'contre_passer',
    'decider_pret',
    'lever_blocage',
    'lire_dossier',
    'prelever_frais',
    'valider_cloture',
    'voir_encaissements_tous',
  ],
  dg: [
    'consulter_dashboard',
    'consulter_ecritures',
    'decider_pret',
    'gerer_utilisateurs',
    'lire_dossier',
    'parametrer',
    'rejeter_dossier',
    'resoudre_conflit',
    'viser_cloture',
    'voir_encaissements_tous',
  ],
};

/**
 * One way to obtain a UI permission: hold **every** listed action and, when `roles` is given,
 * have one of those roles (loan thresholds come from `SeuilValidation`, not from habilitations).
 */
export interface PermissionRule {
  actions: readonly RegistreAction[];
  roles?: readonly Role[];
}

const anyOf = (...actions: RegistreAction[]): PermissionRule[] =>
  actions.map((action) => ({ actions: [action] }));

/** A UI permission is granted when one of its rules is satisfied. */
export const PERMISSION_RULES: Readonly<Record<Permission, readonly PermissionRule[]>> = {
  'supervision.view': anyOf('consulter_dashboard'),
  'enrollment.monitor': anyOf('verifier_pieces', 'valider_dossier', 'rejeter_dossier'),
  'enrollment.remind': anyOf('demander_correction'),
  'member.enroll': anyOf('saisir_dossier'),
  'card.assign': anyOf('associer_carte'),
  'cards.manage': anyOf('bloquer_carte', 'remplacer_carte'),
  // Field collection sees its own collections only; the counter sees them all.
  'collect.field': [{ actions: ['encaisser_especes', 'voir_encaissements_propres'] }],
  'collect.counter': [{ actions: ['encaisser_especes', 'voir_encaissements_tous'] }],
  'loan.view': anyOf('decider_pret', 'etudier_pret', 'decaisser'),
  'loan.request': anyOf('demander_pret'),
  'loan.compliance': anyOf('etudier_pret'),
  // SeuilValidation (registry): 250k–500k chef_agence; 1M–3M dg; 5M–10M dg + comptable.
  'loan.approve.tier1': [{ actions: ['decider_pret'], roles: ['chef_agence'] }],
  'loan.approve.tier2': [{ actions: ['decider_pret'], roles: ['dg'] }],
  'loan.approve.tier3.dg': [{ actions: ['decider_pret'], roles: ['dg'] }],
  'loan.approve.tier3.accounting': [{ actions: ['decider_pret'], roles: ['comptable'] }],
  'loan.disburse': anyOf('decaisser'),
  'cash.view': anyOf('cloturer_caisse', 'valider_cloture', 'viser_cloture'),
  'cash.closure.count': anyOf('cloturer_caisse'),
  'cash.closure.check': anyOf('valider_cloture'),
  'cash.closure.close': anyOf('viser_cloture'),
  'ledger.view': anyOf('consulter_ecritures'),
  'ledger.write': anyOf('contre_passer'),
  reconciliation: anyOf('resoudre_conflit'),
  'merchants.view': anyOf('consulter_dashboard', 'consulter_ecritures', 'valider_dossier'),
  'reports.view': anyOf('consulter_dashboard', 'consulter_ecritures', 'valider_dossier'),
  'admin.manage': anyOf('gerer_utilisateurs', 'parametrer'),
  'audit.view': anyOf('consulter_ecritures'),
};

/** UI permissions of a user with this role and these registry actions. */
export function derivePermissions(role: Role, actions: Iterable<string>): Permission[] {
  const held = new Set(actions);
  return PERMISSIONS.filter((permission) =>
    PERMISSION_RULES[permission].some(
      (rule) =>
        rule.actions.every((action) => held.has(action)) &&
        (!rule.roles || rule.roles.includes(role)),
    ),
  );
}

/** Role → permissions from the snapshot (mock back end, and fallback). */
const fromSnapshot = (role: Role) => derivePermissions(role, ROLE_ACTIONS_SNAPSHOT[role]);
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  agent: fromSnapshot('agent'),
  secretaire: fromSnapshot('secretaire'),
  assistant: fromSnapshot('assistant'),
  chef_agence: fromSnapshot('chef_agence'),
  caissiere: fromSnapshot('caissiere'),
  comptable: fromSnapshot('comptable'),
  dg: fromSnapshot('dg'),
};

export function permissionsOf(role: Role): ReadonlySet<Permission> {
  return new Set(ROLE_PERMISSIONS[role]);
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Roles that only consult data. None in the registry (no deputy director role). */
export const READ_ONLY_ROLES: readonly Role[] = [];
