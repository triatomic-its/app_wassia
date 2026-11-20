import { Injectable, inject, signal } from '@angular/core';
import { derivePermissions } from '../config/permissions.config';
import { FR } from '../i18n/fr';
import { AuthService, LoginOptions, LoginProfile } from './auth.service';
import { RegistreDirectory, RegistreUser } from './registre-directory.service';
import { safeSession } from './safe-session';
import { SessionStore } from './session.store';

/** Dev convenience only: the chosen registry user for this tab. Not a credential (A26). */
const REGISTRE_USER_KEY = 'wassia.registre.user';

/**
 * Login against the real back end, which does not authenticate yet (ASSUMPTION A26): the user
 * picks a staff member of the registry. Their role comes from `AttributionRole`, their
 * permissions from the registry's habilitations (`derivePermissions`). The `Utilisateur` hash is
 * the actor sent to the back end (`ActorService`). Replaced by Keycloak later.
 */
@Injectable()
export class RegistreAuthService extends AuthService {
  readonly kind = 'registre' as const;
  private readonly directory = inject(RegistreDirectory);
  private readonly session = inject(SessionStore);
  private readonly staff = signal<RegistreUser[] | null>(null);

  accessToken(): string | null {
    return null;
  }

  override async profiles(): Promise<LoginProfile[]> {
    const users = await this.loadStaff(true);
    return users.map((u) => ({
      id: u.id,
      role: u.role,
      label: u.fullName,
      hint: `${FR.roles[u.role]} · ${u.login}`,
    }));
  }

  async login(options: LoginOptions = {}): Promise<void> {
    const users = await this.loadStaff(false);
    const user = options.profileId
      ? users.find((u) => u.id === options.profileId)
      : users.find((u) => u.role === (options.role ?? 'dg'));
    if (!user) throw new Error('REGISTRE_USER_NOT_FOUND');

    const actions = await this.directory.actionsOf(user.role);
    this.session.setSession(
      { id: user.id, fullName: user.fullName, phone: '', role: user.role, active: true },
      derivePermissions(user.role, actions),
    );
    safeSession()?.setItem(REGISTRE_USER_KEY, user.id);
  }

  async logout(): Promise<void> {
    this.session.clear();
    safeSession()?.removeItem(REGISTRE_USER_KEY);
  }

  async restore(): Promise<void> {
    const saved = safeSession()?.getItem(REGISTRE_USER_KEY);
    if (!saved) return;
    try {
      await this.login({ profileId: saved });
    } catch {
      safeSession()?.removeItem(REGISTRE_USER_KEY);
    }
  }

  private async loadStaff(refresh: boolean): Promise<RegistreUser[]> {
    const cached = this.staff();
    if (cached && !refresh) return cached;
    const users = await this.directory.users();
    this.staff.set(users);
    return users;
  }
}
