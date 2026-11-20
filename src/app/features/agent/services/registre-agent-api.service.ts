import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  catchError,
  forkJoin,
  from,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { ApiError } from '@core/api/error.model';
import { RegistreClient } from '@core/api/registre-client.service';
import { REGISTRE } from '@core/api/registre-endpoints';
import { RegistreFacts, predecessorOf, textOf } from '@core/api/registre-facts.service';
import { ActorService } from '@core/auth/actor.service';
import { PRODUCT_RULES_SNAPSHOT } from '@core/config/product-rules.defaults';
import { businessDateOf } from '@core/domain/cash-cutoff';
import { EnrollmentInput } from '@core/domain/enrollment';
import {
  AgentToday,
  CardAssignResult,
  CardLookup,
  CollectTarget,
  DepositInput,
  DepositResult,
  EnrollmentOptions,
  EnrollmentResult,
  Fcfa,
  Member,
  Page,
  Payment,
  PaymentType,
  PhoneCheck,
  SavingsBalance,
} from '@core/models';
import {
  Enrollement,
  Especes,
  FaitEnregistre,
  FaitIdempotent,
  Hash,
  IsoDate,
  Numerique,
  Solde,
} from '@core/models/registre.model';
import { ClockService } from '@core/services/clock.service';
import { NetworkStatus } from '@core/services/network-status.service';
import { ProductRulesService } from '@core/services/product-rules.service';
import { ReferenceService } from '@core/services/reference.service';
import type { AgentApi, MemberDetail } from './agent-api.service';
import { CachedCard } from '../models/offline.model';
import { CollectOffline } from './collect-offline.service';
import { buildCollectableCards } from './collect-cards';
import { MockAgentApi } from './mock-agent-api.service';
import { depositCashKey, membershipCashKey, personToken, toDossier } from './registre-dossier';
import { RegistreMemberFacts, buildAgentMembers, paymentTypeIdOf } from './registre-members';

const CARD_NUMBER = /^WAS-\d+$/;

/**
 * `AgentApi` on the real back end ("Registre Wassia"). Hybrid: what the registry does not expose
 * yet (agent's day, photo upload, payment types) still comes from the mock back end (A27).
 * While the registry's views answer an error, lists are rebuilt from the facts.
 */
@Injectable({ providedIn: 'root' })
export class RegistreAgentApi implements AgentApi {
  private readonly api = inject(RegistreClient);
  private readonly facts = inject(RegistreFacts);
  private readonly rules = inject(ProductRulesService);
  private readonly reference = inject(ReferenceService);
  private readonly actor = inject(ActorService);
  private readonly mock = inject(MockAgentApi);
  private readonly offline = inject(CollectOffline);
  private readonly network = inject(NetworkStatus);
  private readonly clock = inject(ClockService);

  /** Merchants registered or given a card in this session: shown at once, without re-reading. */
  private readonly recent = new Map<Hash, MemberDetail>();
  private cardNumbersCache: Observable<ReadonlyMap<Hash, string>> | null = null;

  today(): Observable<AgentToday> {
    return this.mock.today();
  }

  membershipFee(): Observable<Fcfa> {
    return this.rules.rules().pipe(map((r) => r.membershipCashFee));
  }

  cutoffTime(): Observable<string> {
    return this.rules.rules().pipe(map((r) => r.cutoffTime));
  }

  enrollmentOptions(): Observable<EnrollmentOptions> {
    return forkJoin({ ref: this.reference.data(), rules: this.rules.rules() }).pipe(
      map(({ ref, rules }) => ({
        markets: ref.markets.map((m) => ({ value: m.id, label: m.label })),
        sectors: ref.sectors.map((s) => ({ value: s.id, label: s.label })),
        minimumSavings: rules.minimumSavings,
      })),
    );
  }

  paymentTypes(): Observable<PaymentType[]> {
    return this.mock.paymentTypes();
  }

  /** The registry refuses a phone already used when the file is sent (409): no early check. */
  checkPhone(): Observable<PhoneCheck> {
    return of({ available: true });
  }

  /** No upload endpoint in the registry yet (A27): the mock stores the photo reference. */
  upload(file: File): Observable<string> {
    return this.mock.upload(file);
  }

  /**
   * Sends the file, then the cash part of the opening fee, then asks for the account number.
   * Each call is idempotent (same person token, same cash key), so a retry after a failure
   * anywhere in the chain never creates anything twice.
   */
  enroll(input: EnrollmentInput, idempotencyKey: string): Observable<EnrollmentResult> {
    const agent = this.actor.current();
    return forkJoin({
      ref: this.reference.data(),
      purposes: this.facts.ofType('Finalite'),
      rules: this.rules.rules(),
      date: this.rules.cashDate(),
    }).pipe(
      switchMap(({ ref, purposes, rules, date }) => {
        const dossier = toDossier(
          input,
          personToken(idempotencyKey),
          ref.markets,
          purposes,
          rules.minimumObservationWeeks,
        );
        const fee = rules.membershipCashFee;
        return this.api.post<Enrollement>(REGISTRE.enrollments, { agent, dossier }).pipe(
          switchMap(({ compte }) =>
            this.payMembership(input, compte, agent, idempotencyKey, fee, date).pipe(
              switchMap((paymentId) =>
                this.accountNumber(compte).pipe(
                  map((accountNumber) => {
                    const market = ref.markets.find((m) => m.id === input.market)?.label ?? '';
                    return this.remember(input, {
                      compte,
                      agent,
                      paymentId,
                      accountNumber,
                      fee,
                      market,
                    });
                  }),
                ),
              ),
            ),
          ),
        );
      }),
    );
  }

  myMembers(size = 30): Observable<Page<Member>> {
    return this.ownMembers().pipe(
      map((list) =>
        toPage(
          list.map((d) => d.member),
          size,
        ),
      ),
    );
  }

  member(id: string): Observable<MemberDetail> {
    const known = this.recent.get(id);
    if (known) return of(known);
    return this.ownMembers().pipe(
      switchMap((list) => {
        const found = list.find((d) => d.member.id === id);
        return found
          ? of(found)
          : throwError(() => apiError(404, 'NOT_FOUND', 'Marchand introuvable.'));
      }),
    );
  }

  /** The QR holds the card's token only; the registry gives the card's hash for it. */
  lookupCard(qrToken: string): Observable<CardLookup> {
    return this.cardHash(qrToken).pipe(
      switchMap((card) =>
        forkJoin({
          links: this.facts.detailedOfType('AssociationCarte'),
          numbers: this.cardNumbers(),
        }).pipe(
          map(({ links, numbers }) => ({
            card: {
              id: card,
              printedNumber: numbers.get(card) ?? '',
              status: links.some((l) => predecessorOf(l, 'carte') === card)
                ? ('ASSIGNED' as const)
                : ('UNASSIGNED' as const),
            },
          })),
        ),
      ),
    );
  }

  /**
   * Associates the card. The account becomes active (and the card payable) only after the cash
   * closure visa of the 1 000 F: until then the member waits for validation.
   */
  assignCard(memberId: string, qrToken: string): Observable<CardAssignResult> {
    const agent = this.actor.current();
    return this.cardHash(qrToken).pipe(
      switchMap((carte) =>
        this.api
          .post<FaitEnregistre>(REGISTRE.cardAssociations, { carte, compte: memberId, agent })
          .pipe(
            switchMap(() =>
              forkJoin({ detail: this.member(memberId), numbers: this.cardNumbers() }),
            ),
            map(({ detail, numbers }) => {
              const at = new Date().toISOString();
              const card = {
                id: carte,
                printedNumber: numbers.get(carte) ?? '',
                qrToken: '',
                status: 'ASSIGNED' as const,
                memberId,
              };
              const member: Member = {
                ...detail.member,
                status: 'PENDING_VALIDATION',
                cardId: carte,
                updatedAt: at,
              };
              this.recent.set(memberId, { ...detail, member, card });
              return { member, card };
            }),
          ),
      ),
    );
  }

  cardsToAssign(): Observable<Page<Member>> {
    return this.ownMembers().pipe(
      map((list) =>
        toPage(
          list.filter((d) => d.member.status === 'CARD_TO_ASSIGN').map((d) => d.member),
          50,
        ),
      ),
    );
  }

  private payMembership(
    input: EnrollmentInput,
    compte: Hash,
    agent: Hash,
    idempotencyKey: string,
    fee: Fcfa,
    dateValeur: IsoDate,
  ): Observable<Hash> {
    if (input.paymentChannel === 'WAVE') {
      const body: Numerique = {
        compte,
        agent,
        operateur: 'wave',
        reference: input.paymentRef ?? '',
        nature: 'ouverture_cash',
        montantFcfa: fee,
        dateValeur,
      };
      return this.api.post<FaitEnregistre>(REGISTRE.digital, body).pipe(map((r) => r.fait));
    }
    const body: Especes = {
      compte,
      agent,
      nature: 'ouverture_cash',
      montantFcfa: fee,
      cle: membershipCashKey(idempotencyKey),
      dateValeur,
    };
    return this.api.post<FaitIdempotent>(REGISTRE.cash, body).pipe(map((r) => r.fait));
  }

  /** `WS-AAAA-NNNNNN`, given once by the server (a retry returns the same number). */
  private accountNumber(compte: Hash): Observable<string> {
    return this.api.post<FaitEnregistre>(REGISTRE.accountNumber(compte)).pipe(
      switchMap((r) => this.facts.fact(r.fait)),
      map((f) => textOf(f, 'valeur')),
    );
  }

  private remember(
    input: EnrollmentInput,
    done: {
      compte: Hash;
      agent: Hash;
      paymentId: Hash;
      accountNumber: string;
      fee: Fcfa;
      market: string;
    },
  ): EnrollmentResult {
    const at = new Date().toISOString();
    const member: Member = {
      id: done.compte,
      fullName: input.fullName,
      phone: input.phone,
      market: done.market,
      trade: input.trade,
      stall: input.stall,
      agentId: done.agent,
      status: 'CARD_TO_ASSIGN',
      idNumber: input.idNumber,
      accountNumber: done.accountNumber || undefined,
      savings: 0,
      createdAt: at,
      updatedAt: at,
    };
    const cash = input.paymentChannel !== 'WAVE';
    const payment: Payment = {
      id: done.paymentId,
      memberId: done.compte,
      typeId: paymentTypeIdOf('ouverture_cash'),
      amount: done.fee,
      channel: cash ? 'CASH' : 'WAVE',
      // Cash stays pending until the closure visa; Wave is booked at once.
      status: cash ? 'PENDING_CASH' : 'CONFIRMED',
      externalRef: input.paymentRef,
      agentId: done.agent,
      createdAt: at,
    };
    this.recent.set(done.compte, { member, card: null, payments: [payment], loans: [] });
    return { member, payment };
  }

  /**
   * The scanned card → its merchant (any agent may collect) and their savings.
   * Online, the list of associated cards is also kept on the phone; without network, the card is
   * looked up in that copy. Refused when the card is unknown or not associated yet.
   */
  findByCard(qrToken: string): Observable<CollectTarget> {
    if (!this.network.online()) return this.findOffline(qrToken);
    return this.collectableCards().pipe(
      switchMap(({ cards, tokens }) => {
        const card = cards.find((c) => c.key === qrToken);
        if (!card) {
          return throwError(() =>
            tokens.has(qrToken)
              ? apiError(
                  422,
                  'CARD_NOT_ASSIGNED',
                  'Cette carte n’est associée à aucun marchand. Associez-la d’abord.',
                )
              : apiError(
                  404,
                  'CARD_UNKNOWN',
                  'Ce code n’est pas une carte WASSIA. Vérifiez la carte du marchand.',
                ),
          );
        }
        return this.balance(card.memberId).pipe(
          tap((balance) => void this.offline.rememberBalance(card.memberId, balance)),
          map((balance) => toTarget(card, balance)),
        );
      }),
      catchError((e: unknown) =>
        isNetworkError(e) ? this.findOffline(qrToken) : throwError(() => e),
      ),
    );
  }

  /**
   * Cash stays pending until the closure visa; Wave is booked at once. Replay-safe: the cash key
   * and the Wave reference are the registry's idempotency keys. Without network, a cash deposit
   * is kept on the phone and sent later (`CollectOffline`); Wave needs the network.
   */
  deposit(input: DepositInput, idempotencyKey: string): Observable<DepositResult> {
    if (!this.network.online()) return this.queueDeposit(input, idempotencyKey);
    return this.depositOnline(input, idempotencyKey).pipe(
      // The request may have reached the server: the queued copy has the same key (A37).
      catchError((e: unknown) =>
        isNetworkError(e) ? this.queueDeposit(input, idempotencyKey) : throwError(() => e),
      ),
    );
  }

  private depositOnline(input: DepositInput, idempotencyKey: string): Observable<DepositResult> {
    const agent = this.actor.current();
    return this.rules.cashDate().pipe(
      switchMap((dateValeur) => {
        if (input.channel === 'WAVE') {
          const body: Numerique = {
            compte: input.memberId,
            agent,
            operateur: 'wave',
            reference: input.reference ?? '',
            nature: 'epargne',
            montantFcfa: input.amount,
            dateValeur,
          };
          return this.api.post<FaitEnregistre>(REGISTRE.digital, body).pipe(map((r) => r.fait));
        }
        const body: Especes = {
          compte: input.memberId,
          agent,
          nature: 'epargne',
          montantFcfa: input.amount,
          cle: depositCashKey(idempotencyKey),
          dateValeur,
        };
        return this.api.post<FaitIdempotent>(REGISTRE.cash, body).pipe(map((r) => r.fait));
      }),
      switchMap((paymentId) =>
        this.balance(input.memberId).pipe(
          tap((balance) => void this.offline.rememberBalance(input.memberId, balance)),
          map((balance): DepositResult => ({
            balance,
            payment: toPayment(input, paymentId, agent),
          })),
        ),
      ),
    );
  }

  private queueDeposit(input: DepositInput, idempotencyKey: string): Observable<DepositResult> {
    if (input.channel === 'WAVE') {
      return throwError(() =>
        apiError(
          0,
          'OFFLINE_WAVE',
          'Pas de réseau : le paiement Wave demande une connexion. Encaissez en espèces ou réessayez plus tard.',
        ),
      );
    }
    const agent = this.actor.current();
    return forkJoin({
      // Offline the rules may not load: the cut-off of the last copy is used.
      rules: this.rules.rules().pipe(catchError(() => of(PRODUCT_RULES_SNAPSHOT))),
      card: from(this.offline.cardOf(input.memberId)),
    }).pipe(
      switchMap(({ rules, card }) => {
        const createdAt = new Date().toISOString();
        return from(
          this.offline.enqueue({
            key: idempotencyKey,
            memberId: input.memberId,
            agentId: agent,
            amount: input.amount,
            dateValeur: businessDateOf(this.clock.now(), rules.cutoffTime),
            createdAt,
            fullName: card?.fullName ?? '',
            printedNumber: card?.printedNumber ?? '',
            state: 'pending',
          }),
        ).pipe(
          map((): DepositResult => ({
            queued: true,
            balance: null,
            payment: { ...toPayment(input, idempotencyKey, agent), createdAt },
          })),
        );
      }),
    );
  }

  private findOffline(qrToken: string): Observable<CollectTarget> {
    return from(this.offline.findCard(qrToken)).pipe(
      switchMap((card) =>
        card
          ? of({ ...toTarget(card, card.balance), offline: true })
          : throwError(() =>
              apiError(
                0,
                'OFFLINE_UNKNOWN_CARD',
                'Pas de réseau, et cette carte n’est pas encore connue du téléphone. Réessayez quand le réseau revient.',
              ),
            ),
      ),
    );
  }

  /** Associated cards (kept on the phone as well) and every known QR token. */
  private collectableCards(): Observable<{ cards: CachedCard[]; tokens: Set<string> }> {
    return forkJoin({
      qr: this.facts.ofType('CarteQr'),
      links: this.facts.detailedOfType('AssociationCarte'),
      members: this.membersFromFacts(null),
    }).pipe(
      map(({ qr, links, members }) => ({
        cards: buildCollectableCards(qr, links, members),
        tokens: new Set(qr.map((c) => textOf(c, 'jeton'))),
      })),
      tap(({ cards }) => void this.offline.cacheCards(cards)),
    );
  }

  private balance(account: Hash): Observable<SavingsBalance> {
    return this.api
      .get<Solde>(REGISTRE.accountBalance(account))
      .pipe(map((s) => ({ booked: s.comptabilise, pending: s.enAttente, total: s.annonce })));
  }

  /** The logged-in agent's merchants, rebuilt from the facts (A35). */
  private ownMembers(): Observable<MemberDetail[]> {
    return this.membersFromFacts(this.actor.current());
  }

  /** Merchants of one agent, or of everyone (`null`), rebuilt from the facts. */
  private membersFromFacts(agent: Hash | null): Observable<MemberDetail[]> {
    const facts: Observable<RegistreMemberFacts> = forkJoin({
      accounts: this.facts.detailedOfType('CompteEpargne'),
      identities: this.facts.detailedOfType('Identite'),
      phones: this.facts.detailedOfType('AncrageTelephone'),
      idDocuments: this.facts.detailedOfType('AncragePiece'),
      numbers: this.facts.detailedOfType('NumeroCompte'),
      activities: this.facts.detailedOfType('Activite'),
      associations: this.facts.detailedOfType('AssociationCarte'),
      cardActivations: this.facts.detailedOfType('ActivationCarte'),
      cash: this.facts.detailedOfType('EncaissementEspeces'),
      digital: this.facts.detailedOfType('EncaissementNumerique'),
    });
    return forkJoin({ facts, ref: this.reference.data(), numbers: this.cardNumbers() }).pipe(
      map(({ facts: f, ref, numbers }) =>
        buildAgentMembers(f, agent, {
          markets: new Map(ref.markets.map((m) => [m.id, m.label])),
          sectors: new Map(ref.sectors.map((s) => [s.id, s.label])),
          cardNumbers: numbers,
        }),
      ),
    );
  }

  /** Hash of the scanned card; refused when the registry does not know it. */
  private cardHash(qrToken: string): Observable<Hash> {
    return this.facts.preview('CarteQr', { jeton: qrToken }).pipe(
      switchMap((hash) =>
        this.facts.fact(hash).pipe(
          map(() => hash),
          catchError((e: unknown) =>
            e instanceof HttpErrorResponse && e.status === 404
              ? throwError(() =>
                  apiError(
                    404,
                    'CARD_UNKNOWN',
                    'Ce code n’est pas une carte WASSIA. Prenez une carte vierge.',
                  ),
                )
              : throwError(() => e),
          ),
        ),
      ),
    );
  }

  /** Printed numbers (`WAS-000001`) are `Descriptif` facts of the cards. Read once. */
  private cardNumbers(): Observable<ReadonlyMap<Hash, string>> {
    this.cardNumbersCache ??= this.facts.ofType('Descriptif').pipe(
      switchMap((all) =>
        this.facts.details(all.filter((d) => CARD_NUMBER.test(textOf(d, 'texte')))),
      ),
      map(
        (labels) =>
          new Map(
            labels.flatMap((d) => {
              const card = predecessorOf(d, 'sujet');
              return card ? [[card, textOf(d, 'texte')] as const] : [];
            }),
          ),
      ),
      shareReplay(1),
    );
    return this.cardNumbersCache;
  }
}

function toTarget(card: CachedCard, balance: SavingsBalance | null): CollectTarget {
  return {
    member: {
      id: card.memberId,
      fullName: card.fullName,
      phone: '',
      market: '',
      trade: '',
      agentId: '',
      status: card.status,
      savings: balance?.total ?? 0,
      createdAt: '',
      updatedAt: '',
    },
    card: { id: card.cardId, printedNumber: card.printedNumber, status: 'ASSIGNED' },
    balance,
  };
}

function toPayment(input: DepositInput, id: string, agent: Hash): Payment {
  const cash = input.channel === 'CASH';
  return {
    id,
    memberId: input.memberId,
    typeId: paymentTypeIdOf('epargne'),
    amount: input.amount,
    channel: input.channel,
    status: cash ? 'PENDING_CASH' : 'CONFIRMED',
    externalRef: input.reference,
    agentId: agent,
    createdAt: new Date().toISOString(),
  };
}

function isNetworkError(e: unknown): boolean {
  return e instanceof HttpErrorResponse && e.status === 0;
}

function toPage<T>(items: readonly T[], size: number): Page<T> {
  return { items: items.slice(0, size), page: 1, size, total: items.length };
}

/** An error in the app's own format, as if the server had sent it. */
function apiError(status: number, code: string, message: string): HttpErrorResponse {
  const error: ApiError = { code, message };
  return new HttpErrorResponse({ status, error });
}
