import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

type Params = HttpParams | Record<string, string | number | boolean | readonly string[]>;

/**
 * Typed access to the real back end, "Registre Wassia" (see docs/INTEGRATION_MAP.md).
 * The mock interceptor only answers `environment.apiBaseUrl`, so these calls always reach the
 * real server: features move to it one API service at a time (hybrid mode).
 */
@Injectable({ providedIn: 'root' })
export class RegistreClient {
  private readonly http = inject(HttpClient);
  private readonly base = environment.registreBaseUrl;

  url(path: string): string {
    return `${this.base}${path}`;
  }

  get<T>(path: string, params?: Params, context?: HttpContext): Observable<T> {
    return this.http.get<T>(this.url(path), { params, context });
  }

  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<T>(this.url(path), body);
  }
}
