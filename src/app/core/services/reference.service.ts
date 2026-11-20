import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';
import { RegistreClient } from '../api/registre-client.service';
import { REGISTRE } from '../api/registre-endpoints';
import { Fait, FaitResume, Hash } from '../models/registre.model';

/** An item of the reference data: its hash (sent to the back end), stable code and label. */
export interface ReferenceItem {
  id: Hash;
  code: string;
  label: string;
  detail?: string;
}

export interface Market extends ReferenceItem {
  /** Hash of the agency the market belongs to (sent with the enrollment file). */
  agencyId: Hash;
  agencyCode: string;
}

export interface Sector extends ReferenceItem {
  poleCode: string;
}

export interface ReferenceData {
  agencies: ReferenceItem[];
  markets: Market[];
  poles: ReferenceItem[];
  sectors: Sector[];
}

const MAX_FACTS = 1000;
/** Printed card numbers are `Descriptif` facts too; they are not reference labels. */
const CARD_NUMBER = /^WAS-\d+$/;

/**
 * Agencies, markets, poles and sectors of the registry, with their French labels (`Descriptif`).
 * Read once per session. The registry has no reference view yet, so it is rebuilt from facts
 * (ASSUMPTION A33).
 */
@Injectable({ providedIn: 'root' })
export class ReferenceService {
  private readonly api = inject(RegistreClient);
  private cached: Observable<ReferenceData> | null = null;

  data(): Observable<ReferenceData> {
    // shareReplay resets on error: a failed read is tried again by the next subscriber.
    this.cached ??= this.load().pipe(shareReplay(1));
    return this.cached;
  }

  private load(): Observable<ReferenceData> {
    return forkJoin({
      agencies: this.factsOfType('Agence'),
      markets: this.factsOfType('Marche'),
      poles: this.factsOfType('Pole'),
      sectors: this.factsOfType('Secteur'),
      labels: this.factsOfType('Descriptif'),
    }).pipe(
      switchMap((facts) =>
        forkJoin({
          markets: this.details(facts.markets),
          sectors: this.details(facts.sectors),
          labels: this.details(facts.labels.filter((d) => !CARD_NUMBER.test(text(d, 'texte')))),
        }).pipe(map((full) => buildReference(facts.agencies, facts.poles, full))),
      ),
    );
  }

  private factsOfType(type: string): Observable<FaitResume[]> {
    return this.api.get<FaitResume[]>(REGISTRE.facts, { type, limite: MAX_FACTS });
  }

  /** Predecessors (parent agency, pole, label subject) are only on the full fact. */
  private details(facts: readonly FaitResume[]): Observable<Fait[]> {
    if (!facts.length) return of([]);
    return forkJoin(facts.map((f) => this.api.get<Fait>(REGISTRE.fact(f.fait))));
  }
}

/** Pure: builds the reference data from registry facts (latest label wins). */
export function buildReference(
  agencies: readonly FaitResume[],
  poles: readonly FaitResume[],
  full: { markets: readonly Fait[]; sectors: readonly Fait[]; labels: readonly Fait[] },
): ReferenceData {
  const labels = new Map<Hash, { texte: string; detail?: string; at: string }>();
  for (const d of full.labels) {
    const subject = d.predecesseurs.find((p) => p.role === 'sujet')?.predecesseur;
    if (!subject) continue;
    const known = labels.get(subject);
    if (known && known.at >= d.recuLe) continue;
    const detail = text(d, 'detail') || undefined;
    labels.set(subject, { texte: text(d, 'texte'), detail, at: d.recuLe });
  }

  const codeOf = new Map<Hash, string>(
    [...agencies, ...poles].map((f) => [f.fait, text(f, 'code')]),
  );
  const item = (f: FaitResume): ReferenceItem => {
    const code = text(f, 'code');
    const label = labels.get(f.fait);
    return {
      id: f.fait,
      code,
      label: label?.texte || code,
      ...(label?.detail ? { detail: label.detail } : {}),
    };
  };
  const byLabel = (a: ReferenceItem, b: ReferenceItem) => a.label.localeCompare(b.label, 'fr');
  const parentId = (f: Fait, role: string) =>
    f.predecesseurs.find((p) => p.role === role)?.predecesseur ?? '';
  const parentCode = (f: Fait, role: string) => codeOf.get(parentId(f, role)) ?? '';

  return {
    agencies: agencies.map(item).sort(byLabel),
    poles: poles.map(item).sort(byLabel),
    markets: full.markets
      .map((m) => ({
        ...item(m),
        agencyId: parentId(m, 'agence'),
        agencyCode: parentCode(m, 'agence'),
      }))
      .sort(byLabel),
    sectors: full.sectors
      .map((s) => ({ ...item(s), poleCode: parentCode(s, 'pole') }))
      .sort(byLabel),
  };
}

function text(fact: FaitResume, field: string): string {
  const value = fact.champs[field];
  return typeof value === 'string' ? value : '';
}
