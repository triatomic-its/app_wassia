import { latestBy, predecessorOf, textOf } from '@core/api/registre-facts.service';
import { DEFAULT_PAYMENT_TYPES } from '@core/config/payment-types.config';
import { formatPhone } from '@core/domain/enrollment';
import { Card, EnrollmentStatus, Member, Payment, PaymentChannel } from '@core/models';
import { Fait, Hash } from '@core/models/registre.model';
import type { MemberDetail } from './agent-api.service';

/** Facts needed to show an agent's merchants (read while `/comptes` answers an error). */
export interface RegistreMemberFacts {
  accounts: readonly Fait[];
  identities: readonly Fait[];
  phones: readonly Fait[];
  idDocuments: readonly Fait[];
  numbers: readonly Fait[];
  activities: readonly Fait[];
  associations: readonly Fait[];
  cardActivations: readonly Fait[];
  cash: readonly Fait[];
  digital: readonly Fait[];
}

export interface RegistreLabels {
  markets: ReadonlyMap<Hash, string>;
  sectors: ReadonlyMap<Hash, string>;
  /** Card hash → printed number (`WAS-000001`). */
  cardNumbers: ReadonlyMap<Hash, string>;
}

/** Payment nature of the registry → payment type of the screens. */
const TYPE_OF_NATURE: Readonly<Record<string, string>> = {
  ouverture_cash: 'MEMBERSHIP',
  epargne: 'SAVINGS',
  frais_dossier_pret: 'FILE_FEE',
};

export function paymentTypeIdOf(nature: string): string {
  const code = TYPE_OF_NATURE[nature];
  return DEFAULT_PAYMENT_TYPES.find((t) => t.code === code)?.id ?? nature;
}

const CHANNEL_OF_OPERATOR: Readonly<Record<string, PaymentChannel>> = {
  wave: 'WAVE',
  orange: 'ORANGE',
  mtn: 'MTN',
  moov: 'MOOV',
};

/**
 * Pure: the merchants enrolled by `agentId`, newest first, rebuilt from registry facts.
 * Status: no card → card to associate; card associated → waiting for the cash closure visa;
 * card activated by the registry → active.
 */
export function buildAgentMembers(
  facts: RegistreMemberFacts,
  agentId: Hash,
  labels: RegistreLabels,
): MemberDetail[] {
  const superseded = new Set(facts.accounts.flatMap((a) => priorsOf(a)));
  const byPerson = (list: readonly Fait[]) => latestBy(list, (f) => predecessorOf(f, 'personne'));
  const byAccount = (list: readonly Fait[]) => latestBy(list, (f) => predecessorOf(f, 'compte'));

  const identity = byPerson(facts.identities);
  const phone = byPerson(facts.phones);
  const idDocument = byPerson(facts.idDocuments);
  const activity = byPerson(facts.activities);
  const number = byAccount(facts.numbers);
  const association = byAccount(facts.associations);
  const activated = new Set(
    facts.cardActivations.map((a) => predecessorOf(a, 'association')).filter(Boolean),
  );

  return facts.accounts
    .filter((a) => !superseded.has(a.fait) && predecessorOf(a, 'agent') === agentId)
    .map((account): MemberDetail => {
      const person = predecessorOf(account, 'personne') ?? '';
      const who = identity.get(person);
      const link = association.get(account.fait);
      const cardHash = link && predecessorOf(link, 'carte');
      const isActive = link !== undefined && activated.has(link.fait);
      const status: EnrollmentStatus = !link
        ? 'CARD_TO_ASSIGN'
        : isActive
          ? 'ACTIVE'
          : 'PENDING_VALIDATION';
      const work = activity.get(person);

      const member: Member = {
        id: account.fait,
        fullName: who
          ? [textOf(who, 'prenoms'), textOf(who, 'nom')].filter(Boolean).join(' ')
          : '—',
        phone: formatPhone(textOf(phone.get(person) ?? account, 'numero')),
        market: labels.markets.get(predecessorOf(account, 'marche') ?? '') ?? '',
        trade: labels.sectors.get((work && predecessorOf(work, 'secteur')) ?? '') ?? '',
        stall: (work && textOf(work, 'numeroEtale')) || undefined,
        agentId,
        status,
        idNumber: textOf(idDocument.get(person) ?? account, 'numeroPiece') || undefined,
        cardId: cardHash,
        accountNumber: textOf(number.get(account.fait) ?? account, 'valeur') || undefined,
        savings: 0,
        createdAt: account.recuLe,
        updatedAt: link?.recuLe ?? account.recuLe,
      };
      const card: Card | null = cardHash
        ? {
            id: cardHash,
            printedNumber: labels.cardNumbers.get(cardHash) ?? '',
            qrToken: '',
            status: isActive ? 'ACTIVE' : 'ASSIGNED',
            memberId: account.fait,
          }
        : null;
      const payments = [
        ...facts.cash
          .filter((c) => predecessorOf(c, 'compte') === account.fait)
          .map((c) => toPayment(c, account.fait, 'CASH')),
        ...facts.digital
          .filter((c) => predecessorOf(c, 'compte') === account.fait)
          .map((c) =>
            toPayment(c, account.fait, CHANNEL_OF_OPERATOR[textOf(c, 'operateur')] ?? 'WAVE'),
          ),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      return { member, card, payments, loans: [] };
    })
    .sort((a, b) => b.member.createdAt.localeCompare(a.member.createdAt));
}

function toPayment(fact: Fait, memberId: Hash, channel: PaymentChannel): Payment {
  const amount = fact.champs['montantFcfa'];
  return {
    id: fact.fait,
    memberId,
    typeId: paymentTypeIdOf(textOf(fact, 'nature')),
    amount: typeof amount === 'number' ? amount : 0,
    channel,
    // Cash stays pending until the closure visa; digital payments are booked at once.
    status: channel === 'CASH' ? 'PENDING_CASH' : 'CONFIRMED',
    externalRef: textOf(fact, 'referenceOperateur') || undefined,
    agentId: predecessorOf(fact, 'agent'),
    createdAt: fact.recuLe,
  };
}

function priorsOf(fact: Fait): Hash[] {
  return fact.predecesseurs.filter((p) => p.role === 'prior').map((p) => p.predecesseur);
}
