import {
  HttpErrorResponse,
  HttpEvent,
  HttpHeaders,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, mergeMap, of, throwError, timer } from 'rxjs';
import { environment } from '@env/environment';
import { Permission, permissionsOf } from '@core/config/permissions.config';
import { ROLES, Role, User } from '@core/models';
import { ClockService } from '@core/services/clock.service';
import { FaultKind, MockControl } from './control';
import { MockDb } from './db';
import { MOCK_ROUTES } from './handlers';
import { MockHttpError, fail, matchRoute } from './http';

const FAULT_ERRORS: Record<Exclude<FaultKind, 'none' | 'network'>, MockHttpError> = {
  '401': fail(401, 'UNAUTHENTICATED', 'Votre session a expiré. Reconnectez-vous.'),
  '403': fail(403, 'FORBIDDEN', "Vous n'avez pas le droit de faire cette action."),
  '404': fail(404, 'NOT_FOUND', 'Élément introuvable.'),
  '409': fail(409, 'CONFLICT', 'Cette action a déjà été faite par quelqu’un d’autre.'),
  '422': fail(422, 'VALIDATION', 'Certaines informations sont incorrectes.', {
    amount: ['Le montant doit être un nombre entier.'],
  }),
  '500': fail(500, 'SERVER_ERROR', "Quelque chose n'a pas marché. Réessayez dans un instant."),
};

/** `Bearer mock.<ROLE>` → the first seeded user with that role. */
function resolveUser(req: HttpRequest<unknown>, users: readonly User[]): User | null {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/, '') ?? '';
  const role = token.startsWith('mock.') ? (token.slice(5) as Role) : null;
  if (!role || !ROLES.includes(role)) return null;
  return users.find((u) => u.role === role && u.active) ?? null;
}

function errorResponse(req: HttpRequest<unknown>, error: MockHttpError): HttpErrorResponse {
  return new HttpErrorResponse({
    status: error.status,
    statusText: error.body.code,
    error: error.body,
    url: req.url,
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  });
}

/**
 * Fake back end: answers the real `/api/v1/...` paths from the in-memory database.
 * Applies simulated latency and injected faults from the dev panel.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  const base = environment.apiBaseUrl;
  if (!req.url.startsWith(base)) return next(req);

  const db = inject(MockDb);
  const control = inject(MockControl);
  const clock = inject(ClockService);
  const latency = control.latency();
  const fault = control.takeFault();

  const respond = (): Observable<HttpEvent<unknown>> => {
    if (fault === 'network') {
      return throwError(
        () => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error', url: req.url }),
      );
    }
    if (fault !== 'none') return throwError(() => errorResponse(req, FAULT_ERRORS[fault]));

    const path = req.url.slice(base.length).split('?')[0] || '/';
    const match = matchRoute(MOCK_ROUTES, req.method, path);
    if (!match) {
      return throwError(() =>
        errorResponse(req, fail(404, 'NO_ROUTE', `Service inconnu : ${req.method} ${path}`)),
      );
    }

    const user = resolveUser(req, db.snapshot.users);
    const permissions: ReadonlySet<Permission> = user ? permissionsOf(user.role) : new Set();
    const { access } = match.route;
    if (access !== 'public' && !user) {
      return throwError(() =>
        errorResponse(
          req,
          fail(401, 'UNAUTHENTICATED', 'Votre session a expiré. Reconnectez-vous.'),
        ),
      );
    }
    if (Array.isArray(access) && !access.some((p) => permissions.has(p))) {
      return throwError(() =>
        errorResponse(
          req,
          fail(403, 'FORBIDDEN', "Vous n'avez pas le droit de voir ces informations."),
        ),
      );
    }

    try {
      const body = match.route.handler({
        method: req.method,
        path,
        params: match.params,
        query: req.params,
        headers: req.headers,
        body: req.body,
        user,
        permissions,
        db,
        now: clock.current(),
      });
      // Deep copy so callers can never mutate the database by accident.
      const copy = body === undefined ? null : structuredClone(body);
      return of(new HttpResponse({ status: match.route.status ?? 200, body: copy, url: req.url }));
    } catch (error) {
      if (error instanceof MockHttpError) return throwError(() => errorResponse(req, error));
      return throwError(() =>
        errorResponse(req, fail(500, 'SERVER_ERROR', "Quelque chose n'a pas marché.")),
      );
    }
  };

  if (latency <= 0) return respond();
  return timer(latency).pipe(mergeMap(respond));
};
