import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Marks a request whose failure the caller handles itself (e.g. a fallback): the global error
 * interceptor then shows no toast.
 */
export const HANDLED_ERRORS = new HttpContextToken<boolean>(() => false);

export const handledErrors = (): HttpContext => new HttpContext().set(HANDLED_ERRORS, true);
