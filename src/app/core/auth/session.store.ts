import { Injectable, computed, signal } from '@angular/core';
import { Permission, READ_ONLY_ROLES } from '../config/permissions.config';
import { Role, User } from '../models';

/**
 * Current user and permissions, in memory only (never in localStorage).
 * Filled by `AuthService` from `GET /me`: role and permissions are never read from the token.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly _user = signal<User | null>(null);
  private readonly _permissions = signal<ReadonlySet<Permission>>(new Set());

  readonly user = this._user.asReadonly();
  readonly permissions = this._permissions.asReadonly();
  readonly authenticated = computed(() => this._user() !== null);
  readonly role = computed<Role | null>(() => this._user()?.role ?? null);
  readonly readOnly = computed(() => {
    const role = this.role();
    return role !== null && READ_ONLY_ROLES.includes(role);
  });

  can(permission: Permission): boolean {
    return this._permissions().has(permission);
  }

  setSession(user: User, permissions: readonly Permission[]): void {
    this._user.set(user);
    this._permissions.set(new Set(permissions));
  }

  clear(): void {
    this._user.set(null);
    this._permissions.set(new Set());
  }
}
