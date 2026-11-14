import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Permission } from '../config/permissions.config';
import { SessionStore } from './session.store';

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
