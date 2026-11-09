import { Permission } from './permissions.config';

export interface NavItem {
  /** Absolute router path. */
  path: string;
  /** French label — always shown next to the icon. */
  label: string;
  /** `@ng-icons/lucide` icon name, registered in the shell. */
  icon: string;
  permission: Permission;
}

/** Back-office side menu (mockup order). Max 7 entries per role. */
export const BACKOFFICE_NAV: readonly NavItem[] = [
  {
    path: '/app/supervision',
    label: 'Supervision',
    icon: 'lucideLayoutDashboard',
    permission: 'supervision.view',
  },
  {
    path: '/app/enrolements',
    label: 'Suivi des enrôlements',
    icon: 'lucideUserPlus',
    permission: 'enrollment.monitor',
  },
  {
    path: '/app/credits',
    label: 'Dossiers de crédit',
    icon: 'lucideBanknote',
    permission: 'loan.view',
  },
  {
    path: '/app/caisse',
    label: 'Caisse et clôture',
    icon: 'lucideLandmark',
    permission: 'cash.view',
  },
  { path: '/app/marchands', label: 'Marchands', icon: 'lucideUsers', permission: 'merchants.view' },
  {
    path: '/app/rapports',
    label: 'Rapports',
    icon: 'lucideChartColumn',
    permission: 'reports.view',
  },
  {
    path: '/app/admin',
    label: 'Administration',
    icon: 'lucideSettings',
    permission: 'admin.manage',
  },
];

/** Agent bottom tab bar (mockup). `primary` is the raised central button. */
export const AGENT_NAV: readonly (NavItem & { primary?: boolean })[] = [
  { path: '/agent/accueil', label: 'Accueil', icon: 'lucideHouse', permission: 'collect.field' },
  { path: '/agent/collecte', label: 'Collecte', icon: 'lucideRoute', permission: 'collect.field' },
  {
    path: '/agent/scanner',
    label: 'Scanner',
    icon: 'lucideScanLine',
    permission: 'collect.field',
    primary: true,
  },
  {
    path: '/agent/inscrire',
    label: 'Inscrire',
    icon: 'lucideUserPlus',
    permission: 'member.enroll',
  },
  { path: '/agent/credit', label: 'Crédit', icon: 'lucideHandCoins', permission: 'loan.request' },
];
