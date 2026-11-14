import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { SessionStore } from './session.store';

/** Requires a logged-in user; otherwise goes to the login page and comes back afterwards. */
export const authGuard: CanMatchFn = (_route, segments: UrlSegment[]) => {
  const session = inject(SessionStore);
  if (session.authenticated()) return true;
  const back = '/' + segments.map((s) => s.path).join('/');
  return inject(Router).createUrlTree(['/connexion'], { queryParams: { retour: back } });
};
