import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';
import { ApiError } from '@core/api/error.model';
import { RegistreClient } from '@core/api/registre-client.service';
import { REGISTRE } from '@core/api/registre-endpoints';
import { RegistreFacts, predecessorOf, textOf } from '@core/api/registre-facts.service';
import { ActorService } from '@core/auth/actor.service';
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
import { ProductRulesService } from '@core/services/product-rules.service';
import { ReferenceService } from '@core/services/reference.service';
import type { AgentApi, MemberDetail } from './agent-api.service';
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
   * Refused when the card is unknown or not associated yet.
   */
  findByCard(qrToken: string): Observable<CollectTarget> {
    return this.cardHash(qrToken).pipe(
      switchMap((card) =>
        this.facts.detailedOfType('AssociationCarte').pipe(
          map(
            (links) =>
              links
                .filter((l) => predecessorOf(l, 'carte') === card)
                .sort((a, b) => b.recuLe.localeCompare(a.recuLe))[0],
          ),
          switchMap((link) => {
            const account = link && predecessorOf(link, 'compte');
            if (!account) {
              return throwError(() =>
                apiError(
                  422,
                  'CARD_NOT_ASSIGNED',
                  'Cette carte n’est associée à aucun marchand. Associez-la d’abord.',
                ),
              );
            }
            return forkJoin({
              members: this.membersFromFacts(null),
              balance: this.balance(account),
            }).pipe(
              switchMap(({ members, balance }) => {
                const found = members.find((d) => d.member.id === account);
                if (!found?.card) {
                  return throwError(() => apiError(404, 'NOT_FOUND', 'Marchand introuvable.'));
                }
                const { id, printedNumber, status } = found.card;
                return of({ member: found.member, card: { id, printedNumber, status }, balance });
              }),
            );
          }),
        ),
      ),
    );
  }

  /**
   * Cash stays pending until the closure visa; Wave is booked at once. Replay-safe: the cash key
   * and the Wave reference are the registry's idempotency keys.
   */
  deposit(input: DepositInput, idempotencyKey: string): Observable<DepositResult> {
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
          map((balance): DepositResult => {
            const cash = input.channel === 'CASH';
            return {
              balance,
              payment: {
                id: paymentId,
                memberId: input.memberId,
                typeId: paymentTypeIdOf('epargne'),
                amount: input.amount,
                channel: input.channel,
                status: cash ? 'PENDING_CASH' : 'CONFIRMED',
                externalRef: input.reference,
                agentId: agent,
                createdAt: new Date().toISOString(),
              },
            };
          }),
        ),
      ),
    );
  }

  private balance(account: Hash): Observable<CollectTarget['balance']> {
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

function toPage<T>(items: readonly T[], size: number): Page<T> {
  return { items: items.slice(0, size), page: 1, size, total: items.length };
}

/** An error in the app's own format, as if the server had sent it. */
function apiError(status: number, code: string, message: string): HttpErrorResponse {
  const error: ApiError = { code, message };
  return new HttpErrorResponse({ status, error });
}
