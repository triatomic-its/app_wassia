import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../../shared/ui/toast';
import { API } from './endpoints';
import { toApiError } from './error.model';

const isApi = (url: string) => url.startsWith(environment.apiBaseUrl);

/** Adds the in-memory access token to API calls. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApi(req.url)) return next(req);
  const token = inject(AuthService).accessToken();
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};

/**
 * Global error handling: expired session → login page; network or server failure → plain
 * French toast. The error is re-thrown so screens can still show their own error state.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && isApi(req.url)) {
        const isMe = req.url.endsWith(API.me);
        if (error.status === 401 && !isMe) {
          void auth.logout().then(() => router.navigate(['/connexion']));
          toast.error(toApiError(error).message);
        } else if (error.status === 0 || error.status >= 500) {
          toast.error(toApiError(error).message);
        }
      }
      return throwError(() => error);
    }),
  );
};
