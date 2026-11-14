import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { MockAuthService } from '@core/auth/auth.mock';
import { AuthService } from '@core/auth/auth.service';
import { SessionStore } from '@core/auth/session.store';
import { Member, Page } from '@core/models';
import { provideRouter } from '@angular/router';
import { MockControl } from './control';
import { DB_KEY, MockDb } from './db';
import { matchRoute, paginate } from './http';
import { MOCK_ROUTES } from './handlers';
import { mockBackendInterceptor } from './mock-backend.interceptor';
import { HttpParams } from '@angular/common/http';

function setup() {
  localStorage.clear();
  sessionStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor, mockBackendInterceptor])),
      MockDb,
      MockControl,
      { provide: AuthService, useClass: MockAuthService },
    ],
  });
  TestBed.inject(MockControl).update({ latencyMin: 0, latencyMax: 0, fault: 'none' });
  return {
    http: TestBed.inject(HttpClient),
    auth: TestBed.inject(AuthService),
    session: TestBed.inject(SessionStore),
    control: TestBed.inject(MockControl),
    db: TestBed.inject(MockDb),
  };
}

async function errorOf(promise: Promise<unknown>): Promise<HttpErrorResponse> {
  try {
    await promise;
  } catch (e) {
    return e as HttpErrorResponse;
  }
  throw new Error('expected an error');
}

describe('mock router helpers', () => {
  it('matches path parameters', () => {
    const m = matchRoute(MOCK_ROUTES, 'GET', '/members/m-001');
    expect(m?.params).toEqual({ id: 'm-001' });
    expect(matchRoute(MOCK_ROUTES, 'DELETE', '/members/m-001')).toBeNull();
  });

  it('paginates and sorts', () => {
    const items = [{ createdAt: 'b' }, { createdAt: 'a' }, { createdAt: 'c' }];
    const page = paginate(
      items,
      new HttpParams({ fromObject: { page: 1, size: 2, sort: 'createdAt,asc' } }),
    );
    expect(page).toEqual({
      items: [{ createdAt: 'a' }, { createdAt: 'b' }],
      page: 1,
      size: 2,
      total: 3,
    });
  });
});

describe('mock back end', () => {
  it('rejects /me without a session (401, standard error body)', async () => {
    const { http } = setup();
    const err = await errorOf(firstValueFrom(http.get('/api/v1/me')));
    expect(err.status).toBe(401);
    expect(err.error).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('logs in a demo profile and fills the session from /me', async () => {
    const { auth, session } = setup();
    await auth.login({ role: 'CASHIER' });
    expect(session.user()?.role).toBe('CASHIER');
    expect(session.can('cash.closure.count')).toBe(true);
    expect(session.can('cash.closure.close')).toBe(false);
    expect(sessionStorage.getItem('wassia.demo.role')).toBe('CASHIER');
  });

  it('restores the demo profile after a reload', async () => {
    const first = setup();
    await first.auth.login({ role: 'DG' });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor, mockBackendInterceptor])),
        MockDb,
        MockControl,
        { provide: AuthService, useClass: MockAuthService },
      ],
    });
    TestBed.inject(MockControl).update({ latencyMin: 0, latencyMax: 0 });
    await TestBed.inject(AuthService).restore();
    expect(TestBed.inject(SessionStore).role()).toBe('DG');
  });

  it('paginates members and scopes agents to their own merchants', async () => {
    const { http, auth } = setup();
    await auth.login({ role: 'MANAGER' });
    const all = await firstValueFrom(
      http.get<Page<Member>>('/api/v1/members', { params: { size: 10 } }),
    );
    expect(all.total).toBe(120);
    expect(all.items).toHaveLength(10);

    await auth.login({ role: 'AGENT' });
    const mine = await firstValueFrom(
      http.get<Page<Member>>('/api/v1/members', { params: { size: 100 } }),
    );
    expect(mine.total).toBe(20);
    expect(new Set(mine.items.map((m) => m.agentId))).toEqual(new Set(['u-ag1']));
  });

  it('filters members by status and searches by name', async () => {
    const { http, auth, db } = setup();
    await auth.login({ role: 'DG' });
    const pending = await firstValueFrom(
      http.get<Page<Member>>('/api/v1/members', { params: { status: 'SUSPENDED' } }),
    );
    expect(pending.total).toBe(1);
    const name = db.snapshot.members[30].fullName;
    const found = await firstValueFrom(
      http.get<Page<Member>>('/api/v1/members', { params: { q: name.toUpperCase() } }),
    );
    expect(found.items.some((m) => m.fullName === name)).toBe(true);
  });

  it('refuses data the role may not see (403)', async () => {
    const { http, auth } = setup();
    await auth.login({ role: 'CASHIER' });
    const err = await errorOf(firstValueFrom(http.get('/api/v1/cards')));
    expect(err.status).toBe(403);
    expect(err.error.message).toMatch(/pas le droit/);
  });

  it('returns 404 for unknown routes and members', async () => {
    const { http, auth } = setup();
    await auth.login({ role: 'DG' });
    expect((await errorOf(firstValueFrom(http.get('/api/v1/nope')))).status).toBe(404);
    expect((await errorOf(firstValueFrom(http.get('/api/v1/members/zzz')))).error.code).toBe(
      'MEMBER_NOT_FOUND',
    );
  });

  it('injects a fault once, then answers normally', async () => {
    const { http, auth, control } = setup();
    await auth.login({ role: 'DG' });
    control.update({ fault: '500', faultOnce: true });
    expect((await errorOf(firstValueFrom(http.get('/api/v1/settings')))).status).toBe(500);
    await expect(firstValueFrom(http.get('/api/v1/settings'))).resolves.toMatchObject({
      cashCutoffTime: '16:00',
    });
  });

  it('simulates a network cut (status 0)', async () => {
    const { http, auth, control } = setup();
    await auth.login({ role: 'DG' });
    control.update({ fault: 'network', faultOnce: true });
    expect((await errorOf(firstValueFrom(http.get('/api/v1/settings')))).status).toBe(0);
  });

  it('returns copies so callers cannot mutate the database', async () => {
    const { http, auth, db } = setup();
    await auth.login({ role: 'DG' });
    const settings = await firstValueFrom(http.get<{ cashCeiling: number }>('/api/v1/settings'));
    settings.cashCeiling = 1;
    expect(db.snapshot.settings.cashCeiling).toBe(2_000_000);
  });

  it('persists the database and re-seeds on reset', () => {
    const { db } = setup();
    db.write((d) => (d.settings.cashCeiling = 1_500_000));
    expect(JSON.parse(localStorage.getItem(DB_KEY)!).settings.cashCeiling).toBe(1_500_000);
    db.reset();
    expect(db.snapshot.settings.cashCeiling).toBe(2_000_000);
  });
});
