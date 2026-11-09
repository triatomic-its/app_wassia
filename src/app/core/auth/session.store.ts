import { Injectable, computed, signal } from '@angular/core';
import { Permission, permissionsOf, READ_ONLY_ROLES } from '../config/permissions.config';
import { Role, User } from '../models';

/**
 * Holds the current user in memory only (never in localStorage).
 * Phase 0: seeded with a placeholder user so the shells can render.
 * Phase 1: filled by `AuthService` from `GET /me` (role and permissions are never read from the token).
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly _user = signal<User | null>({
    id: 'u-dev',
    fullName: 'Utilisateur de démonstration',
    phone: '',
    role: 'DG',
    active: true,
  });

  readonly user = this._user.asReadonly();
  readonly role = computed<Role | null>(() => this._user()?.role ?? null);
  readonly permissions = computed<ReadonlySet<Permission>>(() => {
    const role = this.role();
    return role ? permissionsOf(role) : new Set<Permission>();
  });
  readonly readOnly = computed(() => {
    const role = this.role();
    return role !== null && READ_ONLY_ROLES.includes(role);
  });

  can(permission: Permission): boolean {
    return this.permissions().has(permission);
  }

  setUser(user: User | null): void {
    this._user.set(user);
  }

  /** Dev only (styleguide / dev panel): preview another role. */
  switchRole(role: Role): void {
    const current = this._user();
    if (current) this._user.set({ ...current, role });
  }
}
