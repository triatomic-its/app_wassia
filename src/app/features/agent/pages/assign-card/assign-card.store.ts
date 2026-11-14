import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject, catchError, exhaustMap, map, of, switchMap } from 'rxjs';
import { toApiError } from '@core/api/error.model';
import { findMembershipPayment, findMembershipType } from '@core/domain/membership';
import { CardAssignResult, CardLookup } from '@core/models';
import { AgentApi } from '../../services/agent-api.service';

type Outcome<T> = { ok: true; value: T } | { ok: false; message: string };

function toOutcome<T>(source: Observable<T>): Observable<Outcome<T>> {
  return source.pipe(
    map((value): Outcome<T> => ({ ok: true, value })),
    catchError((e: unknown) => of<Outcome<T>>({ ok: false, message: toApiError(e).message })),
  );
}

/**
 * "Associer la carte" (client rule, 2026-11-10): the agent scans the QR code of a blank card,
 * checks it, then associates it — the member becomes active. Reads `:id` from the route.
 */
@Injectable()
export class AssignCardStore {
  private readonly api = inject(AgentApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly memberId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id') ?? '')),
    { initialValue: '' },
  );
  readonly detail = rxResource({
    params: () => this.memberId() || undefined,
    stream: ({ params }) => this.api.member(params),
  });
  private readonly paymentTypes = rxResource({ stream: () => this.api.paymentTypes() });

  readonly membership = computed(() =>
    findMembershipPayment(
      this.detail.value()?.payments ?? [],
      findMembershipType(this.paymentTypes.value() ?? [])?.id,
    ),
  );
  readonly card = signal<CardLookup | null>(null);
  readonly cardReady = computed(() => this.card()?.card.status === 'UNASSIGNED');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal<CardAssignResult | null>(null);

  private readonly qrToken = signal<string | null>(null);
  private readonly lookups = new Subject<string>();
  private readonly assigns = new Subject<{ memberId: string; qrToken: string }>();

  constructor() {
    this.watchLookups();
    this.watchAssigns();
  }

  /** A QR code was read: is it a blank WASSIA card? */
  checkCard(qrToken: string): void {
    this.error.set(null);
    this.card.set(null);
    this.qrToken.set(qrToken);
    this.lookups.next(qrToken);
  }

  assign(): void {
    const qrToken = this.qrToken();
    if (!qrToken || !this.cardReady()) return;
    this.assigns.next({ memberId: this.memberId(), qrToken });
  }

  /** switchMap: scanning another card replaces the pending check. */
  private watchLookups(): void {
    this.lookups
      .pipe(
        switchMap((qr) => {
          this.busy.set(true);
          return toOutcome(this.api.lookupCard(qr));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((outcome) => {
        this.busy.set(false);
        if (outcome.ok) this.card.set(outcome.value);
        else this.error.set(outcome.message);
      });
  }

  /** exhaustMap: a second tap while associating is ignored. */
  private watchAssigns(): void {
    this.assigns
      .pipe(
        exhaustMap(({ memberId, qrToken }) => {
          this.busy.set(true);
          this.error.set(null);
          return toOutcome(this.api.assignCard(memberId, qrToken));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((outcome) => {
        this.busy.set(false);
        if (outcome.ok) {
          this.done.set(outcome.value);
          return;
        }
        this.card.set(null);
        this.error.set(outcome.message);
      });
  }
}
