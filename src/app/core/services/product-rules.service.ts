import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, shareReplay } from 'rxjs';
import { environment } from '@env/environment';
import { RegistreClient } from '../api/registre-client.service';
import { REGISTRE } from '../api/registre-endpoints';
import { PRODUCT_RULES_SNAPSHOT } from '../config/product-rules.defaults';
import { businessDateOf } from '../domain/cash-cutoff';
import { ProductRules } from '../models';
import { DateCaisse, IsoDate } from '../models/registre.model';
import { ClockService } from './clock.service';

/** Registry field behind each rule. */
const RULE_FIELDS: Readonly<Record<keyof ProductRules, string>> = {
  membershipCashFee: 'partCashEnrolementFcfa',
  openingFee: 'fraisOuvertureFcfa',
  openingFeeFromSavings: 'soldePreleveSurEpargneFcfa',
  minimumSavings: 'epargneMinimumFcfa',
  cashCeiling: 'plafondCaisseFcfa',
  cutoffTime: 'heureCoupureCaisse',
  gracePeriodDays: 'joursDeGrace',
  latePenaltyPerDay: 'penaliteRetardParJourFcfa',
  minimumObservationWeeks: 'semainesObservationMin',
  loanReviewHours: 'delaiAnalysePretHeures',
};

/**
 * Product rules and the cash business date, from the registry (the back end is the reference).
 * Rules change rarely: read once, shared by every screen.
 */
@Injectable({ providedIn: 'root' })
export class ProductRulesService {
  private readonly api = inject(RegistreClient);
  private readonly clock = inject(ClockService);
  private cached: Observable<ProductRules> | null = null;

  rules(): Observable<ProductRules> {
    if (!environment.useRegistre) return of(PRODUCT_RULES_SNAPSHOT);
    // shareReplay resets on error: a failed read is tried again by the next subscriber.
    this.cached ??= this.load().pipe(shareReplay(1));
    return this.cached;
  }

  /**
   * Business date for a cash entry made now. The server applies the 16:00 cut-off (an entry made
   * after it belongs to the next day), so its answer is the reference.
   */
  cashDate(): Observable<IsoDate> {
    if (!environment.useRegistre) {
      return of(businessDateOf(this.clock.now(), PRODUCT_RULES_SNAPSHOT.cutoffTime));
    }
    return this.api.get<DateCaisse>(REGISTRE.cashDate).pipe(map((d) => d.dateValeur));
  }

  private load(): Observable<ProductRules> {
    const keys = Object.keys(RULE_FIELDS) as (keyof ProductRules)[];
    const reads = keys.map((key) => this.api.get<unknown>(REGISTRE.rule(RULE_FIELDS[key])));
    return forkJoin(reads).pipe(map((values) => toRules(keys, values)));
  }
}

/** Checks the types sent by the server: a wrong type is a contract break, not a default. */
export function toRules(
  keys: readonly (keyof ProductRules)[],
  values: readonly unknown[],
): ProductRules {
  const rules = { ...PRODUCT_RULES_SNAPSHOT };
  keys.forEach((key, i) => {
    const value = values[i];
    if (key === 'cutoffTime') {
      if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) throw badRule(key, value);
      rules.cutoffTime = value;
    } else {
      if (typeof value !== 'number' || !Number.isInteger(value)) throw badRule(key, value);
      rules[key] = value;
    }
  });
  return rules;
}

function badRule(key: string, value: unknown): Error {
  return new Error(`REGISTRE_RULE_INVALID: ${key}=${JSON.stringify(value)}`);
}
