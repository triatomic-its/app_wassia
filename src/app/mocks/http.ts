import { HttpParams } from '@angular/common/http';
import { ApiError } from '../core/api/error.model';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../core/api/pagination';
import { Permission } from '../core/config/permissions.config';
import { Page, User } from '../core/models';
import { MockDb } from './db';

/** Error thrown by a handler; turned into an HTTP error response with the standard body. */
export class MockHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError,
  ) {
    super(body.message);
  }
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: Record<string, string[]>,
): MockHttpError {
  return new MockHttpError(status, { code, message, ...(details ? { details } : {}) });
}

export interface MockContext {
  method: string;
  path: string;
  params: Record<string, string>;
  query: HttpParams;
  body: unknown;
  user: User | null;
  permissions: ReadonlySet<Permission>;
  db: MockDb;
  now: Date;
}

export interface MockRoute {
  method: 'GET' | 'POST' | 'PATCH';
  /** e.g. `/members/:id` */
  pattern: string;
  /** `public` = no login; otherwise a logged-in user, optionally with one of the permissions. */
  access: 'public' | 'user' | readonly Permission[];
  handler: (ctx: MockContext) => unknown;
  /** HTTP status on success (default 200). */
  status?: number;
}

export function matchRoute(
  routes: readonly MockRoute[],
  method: string,
  path: string,
): { route: MockRoute; params: Record<string, string> } | null {
  const parts = path.split('/').filter(Boolean);
  for (const route of routes) {
    if (route.method !== method) continue;
    const pattern = route.pattern.split('/').filter(Boolean);
    if (pattern.length !== parts.length) continue;
    const params: Record<string, string> = {};
    const ok = pattern.every((seg, i) => {
      if (seg.startsWith(':')) {
        params[seg.slice(1)] = decodeURIComponent(parts[i]);
        return true;
      }
      return seg === parts[i];
    });
    if (ok) return { route, params };
  }
  return null;
}

/** Server-side pagination contract: `?page=1&size=20&sort=createdAt,desc` → `{ items, page, size, total }`. */
export function paginate<T>(items: readonly T[], query: HttpParams): Page<T> {
  const page = Math.max(1, Number(query.get('page') ?? 1) || 1);
  const size = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(query.get('size') ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE),
  );
  const [field, dir] = (query.get('sort') ?? 'createdAt,desc').split(',');
  const sorted = [...items].sort((a, b) => {
    const va = (a as Record<string, unknown>)[field];
    const vb = (b as Record<string, unknown>)[field];
    if (va === vb) return 0;
    if (va === undefined) return 1;
    if (vb === undefined) return -1;
    const cmp = va! < vb! ? -1 : 1;
    return dir === 'asc' ? cmp : -cmp;
  });
  return { items: sorted.slice((page - 1) * size, page * size), page, size, total: items.length };
}

/** Case- and accent-insensitive text search. */
export function matchesText(haystack: (string | undefined)[], needle: string | null): boolean {
  if (!needle) return true;
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
  const n = norm(needle.trim());
  return haystack.some((h) => h !== undefined && norm(h).includes(n));
}
