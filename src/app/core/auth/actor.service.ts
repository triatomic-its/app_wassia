import { Injectable, inject } from '@angular/core';
import { Hash } from '../models/registre.model';
import { SessionStore } from './session.store';

/**
 * The actor named in registry bodies (`auteur`, `agent`, `caissiere`, `comptable`, `directeur`,
 * `demandeur`): the hash of the logged-in `Utilisateur`. Only API services read it, never
 * components. Not a proof of identity (the back end does not authenticate yet, A26).
 */
@Injectable({ providedIn: 'root' })
export class ActorService {
  private readonly session = inject(SessionStore);

  /** Throws when nobody is logged in: a write without an actor is a programming error. */
  current(): Hash {
    const id = this.session.user()?.id;
    if (!id) throw new Error('NO_ACTOR');
    return id;
  }
}
