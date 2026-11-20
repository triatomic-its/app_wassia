import { predecessorOf, textOf } from '@core/api/registre-facts.service';
import { Fait, FaitResume } from '@core/models/registre.model';
import { CachedCard } from '../models/offline.model';
import type { MemberDetail } from './agent-api.service';

/**
 * Pure: every card associated with a merchant, keyed by the token printed in its QR code
 * (`CarteQr.jeton`), with what the collection screen shows. Latest association wins.
 */
export function buildCollectableCards(
  qrCards: readonly FaitResume[],
  links: readonly Fait[],
  members: readonly MemberDetail[],
): CachedCard[] {
  const latest = new Map<string, Fait>();
  for (const link of links) {
    const card = predecessorOf(link, 'carte');
    if (!card) continue;
    const known = latest.get(card);
    if (!known || link.recuLe > known.recuLe) latest.set(card, link);
  }
  const byAccount = new Map(members.map((d) => [d.member.id, d]));

  return qrCards.flatMap((qr): CachedCard[] => {
    const link = latest.get(qr.fait);
    const account = link && predecessorOf(link, 'compte');
    const detail = account ? byAccount.get(account) : undefined;
    const token = textOf(qr, 'jeton');
    if (!detail || !token) return [];
    return [
      {
        key: token,
        cardId: qr.fait,
        memberId: detail.member.id,
        fullName: detail.member.fullName,
        printedNumber: detail.card?.printedNumber ?? '',
        status: detail.member.status,
        balance: null,
      },
    ];
  });
}
