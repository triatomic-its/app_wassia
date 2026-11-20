import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API } from '../api/endpoints';
import { HANDLED_ERRORS } from '../api/http-context';
import { toApiError } from '../api/error.model';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../services/toast.service';
import { isApiUrl } from './api-url';

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
      if (
        error instanceof HttpErrorResponse &&
        isApiUrl(req.url) &&
        !req.context.get(HANDLED_ERRORS)
      ) {
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
