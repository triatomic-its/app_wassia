import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { handledErrors } from '../api/http-context';
import { RegistreClient } from '../api/registre-client.service';
import { REGISTRE } from '../api/registre-endpoints';
import { ROLE_ACTIONS_SNAPSHOT } from '../config/permissions.config';
import { Role, isRole } from '../models';
import { Fait, FaitResume, Habilitation, Hash } from '../models/registre.model';

/** A staff member of the registry, with their current role. */
export interface RegistreUser {
  /** Hash of the `Utilisateur` fact: the "actor" sent to the back end. */
  id: Hash;
  login: string;
  fullName: string;
  role: Role;
}

const MAX_FACTS = 1000;

/**
 * Reads the staff and their rights from the registry.
 *
 * The registry has no `GET /utilisateurs` yet (asked to the back-end team, ASSUMPTION A26), so the
 * list is rebuilt from the `Utilisateur`, `AttributionRole` and `Identite` facts. Development only:
 * this goes away once the back end authenticates users.
 */
@Injectable({ providedIn: 'root' })
export class RegistreDirectory {
  private readonly api = inject(RegistreClient);
  /** Rights change rarely: read once per session. */
  private habilitationsCache: Promise<Habilitation[]> | null = null;

  async users(): Promise<RegistreUser[]> {
    const [users, roles, attributions, identities] = await Promise.all([
      this.factsOfType('Utilisateur'),
      this.factsOfType('RoleMetier'),
      this.factsOfType('AttributionRole'),
      this.factsOfType('Identite'),
    ]);
    const roleOfHash = new Map(roles.map((r) => [r.fait, r.champs['code']]));

    // Predecessors are only on the full fact.
    const [userFacts, attributionFacts, identityFacts] = await Promise.all([
      this.details(users),
      this.details(attributions),
      this.details(identities),
    ]);

    const currentRole = new Map<Hash, { role: Role; at: string }>();
    for (const a of attributionFacts) {
      const user = predecessor(a, 'utilisateur');
      const role = roleOfHash.get(predecessor(a, 'role') ?? '');
      if (!user || !isRole(role)) continue;
      const known = currentRole.get(user);
      if (!known || a.recuLe > known.at) currentRole.set(user, { role, at: a.recuLe });
    }

    const nameOfPerson = new Map<Hash, { name: string; at: string }>();
    for (const i of identityFacts) {
      const person = predecessor(i, 'personne');
      if (!person) continue;
      const name = [i.champs['prenoms'], i.champs['nom']].filter(Boolean).join(' ');
      const known = nameOfPerson.get(person);
      if (!known || i.recuLe > known.at) nameOfPerson.set(person, { name, at: i.recuLe });
    }

    return userFacts
      .flatMap((u): RegistreUser[] => {
        const role = currentRole.get(u.fait)?.role;
        if (!role) return [];
        const login = String(u.champs['identifiant'] ?? '');
        const person = predecessor(u, 'personne');
        const fullName = (person && nameOfPerson.get(person)?.name) || login;
        return [{ id: u.fait, login, fullName, role }];
      })
      .sort((a, b) => a.role.localeCompare(b.role) || a.fullName.localeCompare(b.fullName));
  }

  /**
   * Actions granted to a role, read live from the registry. `GET /habilitations` answers an error
   * for now (reported to the back-end team), so they are rebuilt from the `Habilitation` facts,
   * minus those withdrawn by a `Levee`. Only if the registry cannot be read at all is the copy
   * taken on 2026-11-20 used. Switch back to `REGISTRE.habilitations` once the view is fixed.
   */
  async actionsOf(role: Role): Promise<readonly string[]> {
    try {
      const all = await this.habilitations();
      return all.filter((h) => h.roleCode === role).map((h) => h.action);
    } catch {
      return ROLE_ACTIONS_SNAPSHOT[role];
    }
  }

  private habilitations(): Promise<Habilitation[]> {
    this.habilitationsCache ??= this.loadHabilitations().catch((error: unknown) => {
      this.habilitationsCache = null;
      throw error;
    });
    return this.habilitationsCache;
  }

  private async loadHabilitations(): Promise<Habilitation[]> {
    // The caller falls back to the snapshot: no error toast.
    const context = handledErrors();
    const [grants, roles, releases] = await Promise.all([
      this.factsOfType('Habilitation', context),
      this.factsOfType('RoleMetier', context),
      this.factsOfType('Levee', context),
    ]);
    const roleOfHash = new Map(roles.map((r) => [r.fait, r.champs['code']]));
    const [grantFacts, releaseFacts] = await Promise.all([
      this.details(grants, context),
      this.details(releases, context),
    ]);
    const withdrawn = new Set(releaseFacts.flatMap((l) => predecessors(l, 'prior')));

    return grantFacts.flatMap((g): Habilitation[] => {
      const roleCode = roleOfHash.get(predecessor(g, 'role') ?? '');
      const action = g.champs['action'];
      if (withdrawn.has(g.fait) || !isRole(roleCode) || typeof action !== 'string') return [];
      return [{ roleCode, action }];
    });
  }

  private factsOfType(type: string, context?: HttpContext): Promise<FaitResume[]> {
    return firstValueFrom(
      this.api.get<FaitResume[]>(REGISTRE.facts, { type, limite: MAX_FACTS }, context),
    );
  }

  private details(facts: readonly FaitResume[], context?: HttpContext): Promise<Fait[]> {
    return Promise.all(
      facts.map((f) =>
        firstValueFrom(this.api.get<Fait>(REGISTRE.fact(f.fait), undefined, context)),
      ),
    );
  }
}

function predecessor(fact: Fait, role: string): Hash | undefined {
  return fact.predecesseurs.find((p) => p.role === role)?.predecesseur;
}

function predecessors(fact: Fait, role: string): Hash[] {
  return fact.predecesseurs.filter((p) => p.role === role).map((p) => p.predecesseur);
}
