import { Injectable, inject, signal } from '@angular/core';
import { FR } from '../i18n/fr';
import { ROLES, isRole } from '../models';
import { AuthService, LoginOptions, LoginProfile, MeLoader } from './auth.service';
import { safeSession } from './safe-session';
import { SessionStore } from './session.store';

/** Dev convenience only: remembers the chosen demo profile for this browser tab (not a credential). */
const DEMO_ROLE_KEY = 'wassia.demo.role';

/**
 * Simulated authentication for development. The "token" is `mock.<role>`, understood only by
 * the mock back end. Same interface as the OIDC implementation.
 */
@Injectable()
export class MockAuthService extends AuthService {
  readonly kind = 'mock' as const;
  private readonly token = signal<string | null>(null);
  private readonly me = inject(MeLoader);
  private readonly session = inject(SessionStore);

  accessToken(): string | null {
    return this.token();
  }

  /** One demo profile per role; its id is the role. */
  override profiles(): Promise<LoginProfile[]> {
    return Promise.resolve(
      ROLES.map((role) => ({ id: role, role, label: FR.roles[role], hint: FR.roleHints[role] })),
    );
  }

  async login(options: LoginOptions = {}): Promise<void> {
    const role = options.role ?? (isRole(options.profileId) ? options.profileId : 'dg');
    this.token.set(`mock.${role}`);
    try {
      await this.me.load();
      safeSession()?.setItem(DEMO_ROLE_KEY, role);
    } catch (error) {
      this.clear();
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.clear();
  }

  async restore(): Promise<void> {
    const saved = safeSession()?.getItem(DEMO_ROLE_KEY);
    if (!isRole(saved)) return;
    try {
      await this.login({ role: saved });
    } catch {
      // Stay logged out: the login page is shown.
    }
  }

  private clear(): void {
    this.token.set(null);
    this.session.clear();
    safeSession()?.removeItem(DEMO_ROLE_KEY);
  }
}
