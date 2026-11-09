import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { Permission } from '../config/permissions.config';
import { SessionStore } from './session.store';

/** Requires a logged-in user; otherwise goes to the login page and comes back afterwards. */
export const authGuard: CanMatchFn = (_route, segments: UrlSegment[]) => {
  const session = inject(SessionStore);
  if (session.authenticated()) return true;
  const back = '/' + segments.map((s) => s.path).join('/');
  return inject(Router).createUrlTree(['/connexion'], { queryParams: { retour: back } });
};

/** Route guard reading the permission matrix. Usage: `canMatch: [permissionGuard('cash.view')]`. */
export function permissionGuard(permission: Permission): CanMatchFn {
  return () => {
    const session = inject(SessionStore);
    return session.can(permission) || inject(Router).createUrlTree(['/']);
  };
}

/** Sends each user to their home: agents to the field app, everybody else to the back office. */
export const homeRedirect = (): string => {
  const session = inject(SessionStore);
  if (!session.authenticated()) return '/connexion';
  if (session.can('collect.field')) return '/agent/accueil';
  if (session.can('supervision.view')) return '/app/supervision';
  if (session.can('enrollment.monitor')) return '/app/enrolements';
  if (session.can('cash.view')) return '/app/caisse';
  return '/app/credits';
};
