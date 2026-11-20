import { Routes } from '@angular/router';
import { permissionGuard } from '@core/auth/permission.guard';
import { comingSoonRoute } from '@shared/components/coming-soon/coming-soon.component';

export default [
  { path: '', pathMatch: 'full', redirectTo: 'accueil' },
  {
    path: 'accueil',
    title: 'Accueil du jour — WASSIA',
    loadComponent: () =>
      import('./pages/agent-home/agent-home.component').then((m) => m.AgentHomePage),
  },
  {
    path: 'inscrire',
    title: 'Inscrire un marchand — WASSIA',
    canMatch: [permissionGuard('member.enroll')],
    loadComponent: () => import('./pages/enroll/enroll.component').then((m) => m.EnrollPage),
  },
  {
    path: 'inscriptions',
    title: 'Mes inscriptions — WASSIA',
    canMatch: [permissionGuard('member.enroll')],
    loadComponent: () =>
      import('./pages/my-enrollments/my-enrollments.component').then((m) => m.MyEnrollmentsPage),
  },
  {
    path: 'inscriptions/:id/carte',
    title: 'Associer la carte — WASSIA',
    canMatch: [permissionGuard('card.assign')],
    loadComponent: () =>
      import('./pages/assign-card/assign-card.component').then((m) => m.AssignCardPage),
  },
  {
    path: 'collecte',
    title: 'Tournée du jour — WASSIA',
    canMatch: [permissionGuard('collect.field')],
    loadComponent: () => import('./pages/round/round.component').then((m) => m.RoundPage),
  },
  {
    path: 'scanner',
    title: 'Scanner et encaisser — WASSIA',
    canMatch: [permissionGuard('collect.field')],
    loadComponent: () => import('./pages/collect/collect.component').then((m) => m.CollectPage),
  },
  comingSoonRoute('credit', 'Demande de crédit', 'Phase 7'),
] satisfies Routes;
