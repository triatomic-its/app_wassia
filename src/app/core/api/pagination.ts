import { HttpParams } from '@angular/common/http';
import { PageQuery } from '../models';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Builds `?page=1&size=20&sort=createdAt,desc` plus optional filters. */
export function toPageParams(
  query: PageQuery = {},
  filters: Record<string, string | number | boolean | undefined> = {},
): HttpParams {
  let params = new HttpParams()
    .set('page', query.page ?? 1)
    .set('size', Math.min(query.size ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE));
  if (query.sort) params = params.set('sort', query.sort);
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params = params.set(key, String(value));
  }
  return params;
}
