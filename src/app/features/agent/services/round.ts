import { DEFAULT_PAYMENT_TYPES } from '@core/config/payment-types.config';
import { IsoDate } from '@core/models/registre.model';
import { QueuedDeposit } from '../models/offline.model';
import { RoundEntry, RoundFilter } from '../models/round.model';
import type { MemberDetail } from './agent-api.service';

const SAVINGS_TYPE_ID = DEFAULT_PAYMENT_TYPES.find((t) => t.code === 'SAVINGS')?.id;

/**
 * Pure: the agent's round for a business day — every merchant who has a card, what they paid
 * today (recorded, or still on the phone), merchants still to visit first, then by name.
 */
export function buildRound(
  members: readonly MemberDetail[],
  businessDate: IsoDate,
  queued: readonly QueuedDeposit[],
): RoundEntry[] {
  return members
    .filter((d) => d.card !== null && d.member.status !== 'CARD_TO_ASSIGN')
    .map((d): RoundEntry => {
      const paidToday = d.payments
        .filter((p) => p.typeId === SAVINGS_TYPE_ID && p.businessDate === businessDate)
        .reduce((sum, p) => sum + p.amount, 0);
      const waitingSync = queued
        .filter((q) => q.memberId === d.member.id && q.state === 'pending')
        .reduce((sum, q) => sum + q.amount, 0);
      return {
        member: d.member,
        printedNumber: d.card?.printedNumber ?? '',
        paidToday,
        waitingSync,
        state: paidToday + waitingSync > 0 ? 'paid' : 'todo',
      };
    })
    .sort(
      (a, b) =>
        (a.state === 'todo' ? 0 : 1) - (b.state === 'todo' ? 0 : 1) ||
        a.member.fullName.localeCompare(b.member.fullName, 'fr'),
    );
}

/** Pure: entries kept by the filter and the search (name, stall or card number). */
export function filterRound(
  entries: readonly RoundEntry[],
  filter: RoundFilter,
  search: string,
): RoundEntry[] {
  const words = normalise(search).split(/\s+/).filter(Boolean);
  return entries.filter((e) => {
    if (filter !== 'all' && e.state !== filter) return false;
    const haystack = normalise(`${e.member.fullName} ${e.member.stall ?? ''} ${e.printedNumber}`);
    return words.every((w) => haystack.includes(w));
  });
}

/** Lower case, without accents: "Koné" matches "kone". */
function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
