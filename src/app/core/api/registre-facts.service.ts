import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { Fait, FaitEnregistre, FaitResume, Hash } from '../models/registre.model';
import { RegistreClient } from './registre-client.service';
import { REGISTRE } from './registre-endpoints';

const MAX_FACTS = 1000;

/**
 * Generic reads of the registry facts. Used while the registry's views (`/comptes`, `/cartes`,
 * `/identites`…) answer an error: screens rebuild what they need from the facts themselves.
 * Development stopgap — replace by the views once the back end fixes them.
 */
@Injectable({ providedIn: 'root' })
export class RegistreFacts {
  private readonly api = inject(RegistreClient);

  ofType(type: string, context?: HttpContext): Observable<FaitResume[]> {
    return this.api.get<FaitResume[]>(REGISTRE.facts, { type, limite: MAX_FACTS }, context);
  }

  /** Every fact of the type, with its predecessors (one read per fact). */
  detailedOfType(type: string, context?: HttpContext): Observable<Fait[]> {
    return this.ofType(type, context).pipe(switchMap((facts) => this.details(facts, context)));
  }

  details(facts: readonly FaitResume[], context?: HttpContext): Observable<Fait[]> {
    if (!facts.length) return of([]);
    return forkJoin(facts.map((f) => this.fact(f.fait, context)));
  }

  fact(hash: Hash, context?: HttpContext): Observable<Fait> {
    return this.api.get<Fait>(REGISTRE.fact(hash), undefined, context);
  }

  /** Hash a fact with these fields would get. Nothing is written. */
  preview(type: string, champs: Record<string, unknown>): Observable<Hash> {
    return this.api
      .post<FaitEnregistre>(REGISTRE.factPreview, { type, champs })
      .pipe(map((r) => r.fait));
  }
}

/** First predecessor of a fact for a role. */
export function predecessorOf(fact: Fait, role: string): Hash | undefined {
  return fact.predecesseurs.find((p) => p.role === role)?.predecesseur;
}

/** A text field of a fact ('' when absent or not a string). */
export function textOf(fact: FaitResume, field: string): string {
  const value = fact.champs[field];
  return typeof value === 'string' ? value : '';
}

/** Latest fact (by reception time) for each key. */
export function latestBy<K>(facts: readonly Fait[], key: (f: Fait) => K | undefined): Map<K, Fait> {
  const latest = new Map<K, Fait>();
  for (const f of facts) {
    const k = key(f);
    if (k === undefined) continue;
    const known = latest.get(k);
    if (!known || f.recuLe > known.recuLe) latest.set(k, f);
  }
  return latest;
}
