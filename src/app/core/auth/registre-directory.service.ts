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
   * Actions granted to a role. `GET /habilitations` is the source; while it answers an error
   * (reported to the back-end team), the copy taken on 2026-11-20 is used.
   */
  async actionsOf(role: Role): Promise<readonly string[]> {
    try {
      const all = await firstValueFrom(
        this.api.get<Habilitation[]>(REGISTRE.habilitations, undefined, handledErrors()),
      );
      return all.filter((h) => h.roleCode === role).map((h) => h.action);
    } catch {
      return ROLE_ACTIONS_SNAPSHOT[role];
    }
  }

  private factsOfType(type: string): Promise<FaitResume[]> {
    return firstValueFrom(this.api.get<FaitResume[]>(REGISTRE.facts, { type, limite: MAX_FACTS }));
  }

  private details(facts: readonly FaitResume[]): Promise<Fait[]> {
    return Promise.all(facts.map((f) => firstValueFrom(this.api.get<Fait>(REGISTRE.fact(f.fait)))));
  }
}

function predecessor(fact: Fait, role: string): Hash | undefined {
  return fact.predecesseurs.find((p) => p.role === role)?.predecesseur;
}
