import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../api/api-client.service';
import { API } from '../api/endpoints';
import { Permission } from '../config/permissions.config';
import { Role, User } from '../models';
import { SessionStore } from './session.store';

/** `GET /me` — role and permissions always come from the server, never from the token. */
export interface MeResponse {
  user: User;
  permissions: Permission[];
}

export interface LoginOptions {
  /** Mock only: which demo profile to open. */
  role?: Role;
}

/**
 * Authentication contract. Two implementations:
 * - `MockAuthService` (development, demo profiles),
 * - `OidcAuthService` (Keycloak, authorization code + PKCE).
 * The access token lives in memory only.
 */
export abstract class AuthService {
  abstract readonly kind: 'mock' | 'oidc';
  abstract login(options?: LoginOptions): Promise<void>;
  abstract logout(): Promise<void>;
  abstract accessToken(): string | null;
  /** Called once at start-up: restores the session if possible. Never throws. */
  abstract restore(): Promise<void>;
}

/** Loads the current user into the session store. Shared by both implementations. */
@Injectable({ providedIn: 'root' })
export class MeLoader {
  private readonly api = inject(ApiClient);
  private readonly session = inject(SessionStore);

  async load(): Promise<MeResponse> {
    const me = await firstValueFrom(this.api.get<MeResponse>(API.me));
    this.session.setSession(me.user, me.permissions);
    return me;
  }
}
