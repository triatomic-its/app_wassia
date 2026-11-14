import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

type Params = HttpParams | Record<string, string | number | boolean | readonly string[]>;

/**
 * Thin typed wrapper over HttpClient. Every call goes to the real `/api/v1/...` paths;
 * in development the mock interceptor answers them.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  url(path: string): string {
    return `${this.base}${path}`;
  }

  get<T>(path: string, params?: Params): Observable<T> {
    return this.http.get<T>(this.url(path), { params });
  }

  post<T>(path: string, body: unknown, headers?: Record<string, string>): Observable<T> {
    return this.http.post<T>(this.url(path), body, { headers });
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(this.url(path), body);
  }
}
