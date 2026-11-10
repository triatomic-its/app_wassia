import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/permission.guard';
import { comingSoonRoute } from '../../shared/ui/page';

export default [
  { path: '', pathMatch: 'full', redirectTo: 'accueil' },
  {
    path: 'accueil',
    title: 'Accueil du jour — WASSIA',
    loadComponent: () => import('./home/agent-home').then((m) => m.AgentHome),
  },
  {
    path: 'inscrire',
    title: 'Inscrire un marchand — WASSIA',
    canMatch: [permissionGuard('member.enroll')],
    loadComponent: () => import('./enroll/enroll-wizard').then((m) => m.EnrollWizard),
  },
  {
    path: 'inscriptions',
    title: 'Mes inscriptions — WASSIA',
    canMatch: [permissionGuard('member.enroll')],
    loadComponent: () => import('./enroll/my-enrollments').then((m) => m.MyEnrollments),
  },
  {
    path: 'inscriptions/:id/cree',
    title: 'Compte créé — WASSIA',
    canMatch: [permissionGuard('member.enroll')],
    loadComponent: () => import('./enroll/enroll-done').then((m) => m.EnrollDone),
  },
  comingSoonRoute('collecte', 'Tournée de collecte', 'Phase 4'),
  comingSoonRoute('scanner', 'Scanner et encaisser', 'Phase 4'),
  comingSoonRoute('credit', 'Demande de crédit', 'Phase 7'),
] satisfies Routes;
