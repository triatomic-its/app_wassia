import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@env/environment';
import { SessionStore } from '@core/auth/session.store';

/**
 * Hybrid mode: the user is logged in against the registry, but some screens still call the mock
 * back end. The mock identifies callers by `Bearer mock.<role>`, so this passes the registry
 * user's role along. Disappears with the mocks.
 */
export const registreBridgeInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) return next(req);
  const role = inject(SessionStore).role();
  return next(role ? req.clone({ setHeaders: { Authorization: `Bearer mock.${role}` } }) : req);
};
