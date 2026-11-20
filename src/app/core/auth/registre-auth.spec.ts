import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { Fait, FaitResume } from '../models/registre.model';
import { RegistreAuthService } from './auth.registre';
import { AuthService } from './auth.service';
import { RegistreDirectory } from './registre-directory.service';
import { SessionStore } from './session.store';

const h = (c: string) => c.repeat(64);
const at = (minute: number) => `2026-11-20T10:${String(minute).padStart(2, '0')}:00Z`;

function fact(
  fait: string,
  type: string,
  champs: Record<string, unknown>,
  preds: Record<string, string>,
  minute = 0,
): Fait {
  return {
    fait,
    type,
    champs,
    recuLe: at(minute),
    predecesseurs: Object.entries(preds).map(([role, predecesseur]) => ({ role, predecesseur })),
  };
}

// A tiny registry: one agent (role changed from caissiere to agent), one user without role.
const FACTS: Fait[] = [
  fact(h('r'), 'RoleMetier', { code: 'agent' }, {}),
  fact(h('s'), 'RoleMetier', { code: 'caissiere' }, {}),
  fact(h('u'), 'Utilisateur', { identifiant: 'agent.kone' }, { personne: h('p') }),
  fact(h('v'), 'Utilisateur', { identifiant: 'sans.role' }, { personne: h('q') }),
  fact(h('a'), 'AttributionRole', {}, { utilisateur: h('u'), role: h('s') }, 1),
  fact(h('b'), 'AttributionRole', {}, { utilisateur: h('u'), role: h('r'), prior: h('a') }, 2),
  fact(h('i'), 'Identite', { nom: 'Koné', prenoms: 'Ibrahim' }, { personne: h('p') }),
  // Rights: the agent may associate cards; a second right was withdrawn by a Levee.
  fact(h('c'), 'Habilitation', { action: 'associer_carte' }, { role: h('r') }),
  fact(h('d'), 'Habilitation', { action: 'saisir_dossier' }, { role: h('r') }),
  fact(h('e'), 'Habilitation', { action: 'cloturer_caisse' }, { role: h('s') }),
  fact(h('l'), 'Levee', { motif: 'retrait' }, { prior: h('d') }),
];

/** Fake HttpClient answering the registry reads used by the directory. */
class FakeHttp {
  /** Simulates a registry that cannot be read for this fact type. */
  failingType: string | null = null;
  readonly paths: string[] = [];

  get(url: string, options?: { params?: Record<string, string | number> }): Observable<unknown> {
    const path = url.slice(environment.registreBaseUrl.length);
    this.paths.push(path);
    if (path === '/faits') {
      const type = options?.params?.['type'];
      if (type === this.failingType) {
        return throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }));
      }
      const list: FaitResume[] = FACTS.filter((f) => f.type === type);
      return of(list);
    }
    if (path.startsWith('/faits/')) return of(FACTS.find((f) => f.fait === path.slice(7)));
    return throwError(() => new Error(`unexpected ${url}`));
  }
}

describe('registry login', () => {
  let http: FakeHttp;

  beforeEach(() => {
    sessionStorage.clear();
    http = new FakeHttp();
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: http },
        { provide: AuthService, useClass: RegistreAuthService },
      ],
    });
  });

  it('lists users with their latest role and their name; skips users without a role', async () => {
    const users = await TestBed.inject(RegistreDirectory).users();
    expect(users).toEqual([
      { id: h('u'), login: 'agent.kone', fullName: 'Ibrahim Koné', role: 'agent' },
    ]);
  });

  it('logs in with the user hash as id and permissions from the live habilitation facts', async () => {
    await TestBed.inject(AuthService).login({ profileId: h('u') });
    const session = TestBed.inject(SessionStore);
    expect(session.user()?.id).toBe(h('u'));
    expect(session.role()).toBe('agent');
    // saisir_dossier was withdrawn (Levee), cloturer_caisse belongs to another role.
    expect([...session.permissions()]).toEqual(['card.assign']);
  });

  it('never calls the broken GET /habilitations view', async () => {
    await TestBed.inject(AuthService).login({ profileId: h('u') });
    expect(http.paths).not.toContain('/habilitations');
  });

  it('falls back to the 2026-11-20 snapshot when the registry cannot be read', async () => {
    http.failingType = 'Habilitation';
    await TestBed.inject(AuthService).login({ role: 'agent' });
    const session = TestBed.inject(SessionStore);
    expect(session.can('member.enroll')).toBe(true);
    expect(session.can('collect.field')).toBe(true);
  });

  it('restores the chosen user after a reload, and forgets it on logout', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.login({ profileId: h('u') });
    TestBed.inject(SessionStore).clear();
    await auth.restore();
    expect(TestBed.inject(SessionStore).user()?.id).toBe(h('u'));
    await auth.logout();
    expect(TestBed.inject(SessionStore).authenticated()).toBe(false);
    await auth.restore();
    expect(TestBed.inject(SessionStore).authenticated()).toBe(false);
  });

  it('refuses an unknown user', async () => {
    await expect(TestBed.inject(AuthService).login({ profileId: h('z') })).rejects.toThrow(
      'REGISTRE_USER_NOT_FOUND',
    );
  });
});
