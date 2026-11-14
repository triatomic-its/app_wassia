import { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';
import { homeRedirect, permissionGuard } from '@core/auth/permission.guard';

/** Set by the Angular CLI; replaced by `false` in production builds so dead code is removed. */
declare const ngDevMode: unknown;

/**
 * Dev-only routes: not even bundled in production.
 * Keep the check inline — moving it to a variable stops esbuild from removing the chunk.
 */
const devRoutes: Routes =
  typeof ngDevMode !== 'undefined' && !ngDevMode
    ? []
    : [
        {
          path: 'dev/styleguide',
          canMatch: [authGuard],
          title: 'Guide de style — WASSIA',
          loadComponent: () =>
            import('@layout/backoffice-shell/backoffice-shell.component').then(
              (m) => m.BackofficeShell,
            ),
          children: [
            {
              path: '',
              loadComponent: () =>
                import('@features/dev/pages/styleguide/styleguide.component').then(
                  (m) => m.Styleguide,
                ),
            },
          ],
        },
      ];

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: homeRedirect },
  { path: 'connexion', loadChildren: () => import('@features/auth/auth.routes') },
  // Public QR page — no login, member name masked.
  { path: 'pay', loadChildren: () => import('@features/public-pay/public-pay.routes') },
  {
    path: 'agent',
    canMatch: [authGuard, permissionGuard('collect.field')],
    loadComponent: () =>
      import('@layout/agent-shell/agent-shell.component').then((m) => m.AgentShell),
    loadChildren: () => import('@features/agent/agent.routes'),
  },
  {
    path: 'app',
    canMatch: [authGuard],
    loadComponent: () =>
      import('@layout/backoffice-shell/backoffice-shell.component').then((m) => m.BackofficeShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: homeRedirect },
      {
        path: 'supervision',
        canMatch: [permissionGuard('supervision.view')],
        loadChildren: () => import('@features/supervision/supervision.routes'),
      },
      {
        path: 'enrolements',
        canMatch: [permissionGuard('enrollment.monitor')],
        loadChildren: () => import('@features/enrollments/enrollments.routes'),
      },
      {
        path: 'credits',
        canMatch: [permissionGuard('loan.view')],
        loadChildren: () => import('@features/loans/loans.routes'),
      },
      {
        path: 'caisse',
        canMatch: [permissionGuard('cash.view')],
        loadChildren: () => import('@features/cash/cash.routes'),
      },
      {
        path: 'marchands',
        canMatch: [permissionGuard('merchants.view')],
        loadChildren: () => import('@features/merchants/merchants.routes'),
      },
      {
        path: 'rapports',
        canMatch: [permissionGuard('reports.view')],
        loadChildren: () => import('@features/reports/reports.routes'),
      },
      {
        path: 'admin',
        canMatch: [permissionGuard('admin.manage')],
        loadChildren: () => import('@features/admin/admin.routes'),
      },
    ],
  },
  ...devRoutes,
  { path: '**', redirectTo: '' },
];
