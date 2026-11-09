import { Billettage, DENOMINATIONS, Fcfa } from '../models';

export function emptyBillettage(): Billettage {
  return Object.fromEntries(DENOMINATIONS.map((d) => [d, 0])) as Billettage;
}

/** Total counted from a billettage (notes and coins), in FCFA. */
export function billettageTotal(billettage: Billettage): Fcfa {
  return DENOMINATIONS.reduce((sum, d) => sum + Number(d) * (billettage[d] ?? 0), 0);
}

/** Counted minus expected: negative = missing cash, positive = surplus. */
export function cashVariance(counted: Fcfa, expected: Fcfa): Fcfa {
  return counted - expected;
}
