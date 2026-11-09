import { Injectable, inject, signal } from '@angular/core';
import { ROLES, Role } from '../models';
import { AuthService, LoginOptions, MeLoader } from './auth.service';
import { SessionStore } from './session.store';

/** Dev convenience only: remembers the chosen demo profile for this browser tab (not a credential). */
const DEMO_ROLE_KEY = 'wassia.demo.role';

/**
 * Simulated authentication for development. The "token" is `mock.<ROLE>`, understood only by
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

  async login(options: LoginOptions = {}): Promise<void> {
    const role = options.role ?? 'DG';
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
    if (!saved || !ROLES.includes(saved as Role)) return;
    try {
      await this.login({ role: saved as Role });
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

function safeSession(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}
