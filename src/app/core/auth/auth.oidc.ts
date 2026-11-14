import { Injectable, inject, signal } from '@angular/core';
import { environment } from '@env/environment';
import { AuthService } from './auth.service';
import { SessionStore } from './session.store';

/**
 * Keycloak (authorization code + PKCE) implementation.
 * The redirect/callback flow is wired when the Keycloak realm and client are supplied
 * (ASSUMPTION A18). Until then, login reports that the configuration is missing.
 */
@Injectable()
export class OidcAuthService extends AuthService {
  readonly kind = 'oidc' as const;
  private readonly token = signal<string | null>(null);
  private readonly session = inject(SessionStore);

  accessToken(): string | null {
    return this.token();
  }

  async login(): Promise<void> {
    if (!environment.oidc.authority) {
      throw new Error('OIDC_NOT_CONFIGURED');
    }
    throw new Error('OIDC_NOT_IMPLEMENTED');
  }

  async logout(): Promise<void> {
    this.token.set(null);
    this.session.clear();
  }

  async restore(): Promise<void> {
    // Nothing to restore: the token is kept in memory only.
  }
}
