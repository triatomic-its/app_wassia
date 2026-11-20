import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder } from '@angular/forms';
import { Observable, Subject, catchError, exhaustMap, map, of, switchMap } from 'rxjs';
import { toApiError } from '@core/api/error.model';
import { DEFAULT_DEPOSIT_AMOUNT, QUICK_DEPOSIT_AMOUNTS } from '@core/config/collect.config';
import { DEFAULT_SETTINGS } from '@core/config/settings.defaults';
import { formatHourLabel, isAfterCutoff } from '@core/domain/cash-cutoff';
import { DepositDraft, DepositErrors, validateDeposit } from '@core/domain/deposit';
import { CollectTarget, DepositChannel, DepositResult } from '@core/models';
import { ClockService } from '@core/services/clock.service';
import { parseAmount } from '../../models/enrollment-form.model';
import { AgentApi } from '../../services/agent-api.service';

type Outcome<T> = { ok: true; value: T } | { ok: false; message: string };

function toOutcome<T>(source: Observable<T>): Observable<Outcome<T>> {
  return source.pipe(
    map((value): Outcome<T> => ({ ok: true, value })),
    catchError((e: unknown) => of<Outcome<T>>({ ok: false, message: toApiError(e).message })),
  );
}

/** What the "Versement enregistré" receipt shows. */
export interface DepositReceipt {
  target: CollectTarget;
  result: DepositResult;
}

/** `'other'` = the agent types the amount. */
export type AmountChoice = `${number}` | 'other';

/**
 * "Scanner et encaisser" (mockup): scan the merchant's card, pick the amount and the mode,
 * record the deposit, show the receipt. Provided by the page: state is dropped on leaving.
 */
@Injectable()
export class CollectStore {
  private readonly api = inject(AgentApi);
  private readonly clock = inject(ClockService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly fb = inject(NonNullableFormBuilder);

  readonly quickAmounts = QUICK_DEPOSIT_AMOUNTS;
  readonly form = this.fb.group({
    amount: this.fb.control<AmountChoice>(`${DEFAULT_DEPOSIT_AMOUNT}`),
    otherAmount: this.fb.control(''),
    channel: this.fb.control<DepositChannel>('CASH'),
    reference: this.fb.control(''),
  });

  readonly target = signal<CollectTarget | null>(null);
  readonly receipt = signal<DepositReceipt | null>(null);
  /** Looking up the card. */
  readonly looking = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly errors = signal<DepositErrors>({});

  private readonly value = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );
  readonly amountChoice = computed(() => this.value().amount);
  readonly channel = computed(() => this.value().channel);
  readonly amount = computed(() => {
    const v = this.value();
    return v.amount === 'other' ? parseAmount(v.otherAmount) : Number(v.amount);
  });

  private readonly cutoff = rxResource({ stream: () => this.api.cutoffTime() });
  private readonly cutoffTime = computed(() =>
    this.cutoff.hasValue() ? this.cutoff.value() : DEFAULT_SETTINGS.cashCutoffTime,
  );
  readonly cutoffLabel = computed(() => formatHourLabel(this.cutoffTime()));
  /** From the cut-off on, the deposit is booked on the next business day (J+1). */
  readonly afterCutoff = computed(() => isAfterCutoff(this.clock.now(), this.cutoffTime()));

  /** One key per deposit, kept across retries: the server never records it twice. */
  private idempotencyKey = crypto.randomUUID();
  private readonly lookups = new Subject<string>();
  private readonly saves = new Subject<DepositDraft & { memberId: string }>();

  constructor() {
    this.watchLookups();
    this.watchSaves();
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.errors.set({}));
  }

  /** A QR code was read. */
  scanned(qrToken: string): void {
    this.error.set(null);
    this.lookups.next(qrToken);
  }

  save(): void {
    const target = this.target();
    if (!target || this.saving()) return;
    const v = this.form.getRawValue();
    const draft: DepositDraft = {
      amount: this.amount(),
      channel: v.channel,
      reference: v.channel === 'WAVE' ? v.reference.trim() : undefined,
    };
    const errors = validateDeposit(draft);
    this.errors.set(errors);
    if (Object.values(errors).some(Boolean)) return;
    this.saves.next({ ...draft, memberId: target.member.id });
  }

  /** "Scanner une autre carte": a fresh deposit, with a new idempotency key. */
  next(): void {
    this.target.set(null);
    this.receipt.set(null);
    this.error.set(null);
    this.errors.set({});
    this.idempotencyKey = crypto.randomUUID();
    this.form.reset();
  }

  /** switchMap: scanning another card replaces the pending lookup. */
  private watchLookups(): void {
    this.lookups
      .pipe(
        switchMap((qr) => {
          this.looking.set(true);
          return toOutcome(this.api.findByCard(qr));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((outcome) => {
        this.looking.set(false);
        if (outcome.ok) {
          this.target.set(outcome.value);
          this.idempotencyKey = crypto.randomUUID();
        } else {
          this.error.set(outcome.message);
        }
      });
  }

  /** exhaustMap: a second tap on "Enregistrer" while saving is ignored. */
  private watchSaves(): void {
    this.saves
      .pipe(
        exhaustMap((draft) => {
          this.saving.set(true);
          this.error.set(null);
          return toOutcome(
            this.api.deposit(
              {
                memberId: draft.memberId,
                amount: draft.amount,
                channel: draft.channel ?? 'CASH',
                reference: draft.reference,
              },
              this.idempotencyKey,
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((outcome) => {
        this.saving.set(false);
        const target = this.target();
        if (outcome.ok && target) this.receipt.set({ target, result: outcome.value });
        else if (!outcome.ok) this.error.set(outcome.message);
      });
  }
}
