import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  exhaustMap,
  filter,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { toApiError } from '@core/api/error.model';
import { SessionStore } from '@core/auth/session.store';
import { MARKETS } from '@core/config/enrollment.config';
import {
  EnrollmentErrors,
  EnrollmentInput,
  hasErrors,
  isValidCiPhone,
} from '@core/domain/enrollment';
import { DEFAULT_SETTINGS } from '@core/config/settings.defaults';
import { formatHourLabel, isAfterCutoff } from '@core/domain/cash-cutoff';
import { ClockService } from '@core/services/clock.service';
import { ConfirmService } from '@shared/services/confirm.service';
import { EnrollmentFailure, mapEnrollmentFailure } from './enroll-error.mapper';
import { LAST_ENROLLMENT_STEP, isEnrollmentField, validateStep } from './enroll-steps';
import {
  PHONE_CHECK_IDLE,
  PHONE_CHECK_PENDING,
  PHONE_TAKEN_MESSAGE,
  PhoneCheckState,
  toPhoneCheckState,
} from '../../models/phone-check.model';
import {
  PhotoField,
  UPLOAD_IDLE,
  UploadState,
  createEnrollmentForm,
  hasTypedIdentity,
  toEnrollmentInput,
} from '../../models/enrollment-form.model';
import { AgentApi } from '../../services/agent-api.service';

const HOME = '/agent/accueil';

type SubmitOutcome = { ok: true; memberId: string } | { ok: false; failure: EnrollmentFailure };

/**
 * "Inscrire un marchand" (client rule, 2026-11-10): the merchant is registered only once the
 * membership fee is received on the spot. Nothing is kept if the agent gives up.
 * Provided by the page, so the state is dropped when the agent leaves the screen.
 */
@Injectable()
export class EnrollmentStore {
  private readonly api = inject(AgentApi);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly session = inject(SessionStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = createEnrollmentForm(inject(NonNullableFormBuilder), this.defaultMarket());
  readonly step = signal(0);
  readonly errors = signal<EnrollmentErrors>({});
  readonly phoneCheck = signal<PhoneCheckState>(PHONE_CHECK_IDLE);
  readonly uploads = signal<Record<PhotoField, UploadState>>({
    idDocUrl: UPLOAD_IDLE,
    photoUrl: UPLOAD_IDLE,
  });
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  private readonly clock = inject(ClockService);
  /** Same key for every retry of this registration: the server never creates it twice. */
  private readonly idempotencyKey = crypto.randomUUID();

  private readonly membershipFee = rxResource({ stream: () => this.api.membershipFee() });
  readonly fee = computed(() => this.membershipFee.value() ?? 0);
  /** The fee shown must be the one in force on the server, never a silent default. */
  readonly feeReady = computed(() => this.membershipFee.hasValue());
  readonly feeFailed = computed(() => this.membershipFee.status() === 'error');

  private readonly cutoff = rxResource({ stream: () => this.api.cutoffTime() });
  private readonly cutoffTime = computed(
    () => this.cutoff.value() ?? DEFAULT_SETTINGS.cashCutoffTime,
  );
  readonly cutoffLabel = computed(() => formatHourLabel(this.cutoffTime()));
  /** From the cut-off on, the payment is booked on the next business day (J+1). */
  readonly afterCutoff = computed(() => isAfterCutoff(this.clock.now(), this.cutoffTime()));
  readonly isLastStep = computed(() => this.step() === LAST_ENROLLMENT_STEP);
  private readonly value = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    {
      initialValue: this.form.getRawValue(),
    },
  );
  readonly paymentChannel = computed(() => this.value().paymentChannel);
  readonly photoUrls = computed<Record<PhotoField, string>>(() => ({
    idDocUrl: this.value().idDocUrl,
    photoUrl: this.value().photoUrl,
  }));

  /** `null` cancels the pending check (the number was edited). */
  private readonly phoneChecks = new Subject<string | null>();
  private readonly submits = new Subject<EnrollmentInput>();

  constructor() {
    this.watchPhoneChecks();
    this.watchSubmits();
    this.clearErrorsOnEdit();
    this.askConfirmationAgainOnChannelChange();
  }

  checkPhone(): void {
    const phone = this.form.controls.phone.value;
    if (isValidCiPhone(phone)) this.phoneChecks.next(phone);
  }

  /** Validates the current step; returns false (errors shown) when the agent must fix something. */
  next(): boolean {
    const errors = this.currentStepErrors();
    this.errors.set(errors);
    if (hasErrors(errors)) return false;
    this.submitError.set(null);
    this.step.update((s) => Math.min(LAST_ENROLLMENT_STEP, s + 1));
    return true;
  }

  previous(): void {
    this.errors.set({});
    this.submitError.set(null);
    this.step.update((s) => Math.max(0, s - 1));
  }

  /** Top-bar arrow: previous step, or leave (asking first if something was typed). */
  back(): void {
    if (this.step() > 0) {
      this.previous();
      return;
    }
    if (!hasTypedIdentity(this.form.getRawValue())) {
      this.leave();
      return;
    }
    this.confirm
      .ask({
        title: 'Abandonner l’inscription ?',
        message: 'Les informations saisies seront effacées. Le marchand n’est pas enregistré.',
        confirmLabel: 'Abandonner',
        danger: true,
      })
      .pipe(
        filter((r) => r.confirmed),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.leave());
  }

  reloadFee(): void {
    this.membershipFee.reload();
  }

  /** Same check as "Continuer": an unpaid registration is never sent. */
  submit(): void {
    if (!this.feeReady()) return;
    const errors = this.currentStepErrors();
    this.errors.set(errors);
    if (hasErrors(errors)) return;
    this.submits.next(toEnrollmentInput(this.form.getRawValue()));
  }

  uploadPhoto(field: PhotoField, file: File): void {
    this.setUpload(field, { busy: true, error: null });
    this.api
      .upload(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (url) => {
          this.setUpload(field, UPLOAD_IDLE);
          this.form.controls[field].setValue(url);
        },
        error: (e: unknown) => this.setUpload(field, { busy: false, error: toApiError(e).message }),
      });
  }

  private currentStepErrors(): EnrollmentErrors {
    const input = toEnrollmentInput(this.form.getRawValue());
    const errors = validateStep(this.step(), input, this.fee());
    const phoneTaken = this.step() === 0 && this.phoneCheck().state === 'taken';
    return phoneTaken ? { ...errors, phone: PHONE_TAKEN_MESSAGE } : errors;
  }

  /** switchMap: only the answer for the number currently typed is kept. */
  private watchPhoneChecks(): void {
    this.phoneChecks
      .pipe(
        switchMap((phone) => (phone === null ? of(PHONE_CHECK_IDLE) : this.lookupPhone(phone))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.phoneCheck.set(state));
  }

  private lookupPhone(phone: string): Observable<PhoneCheckState> {
    return this.api.checkPhone(phone).pipe(
      map(toPhoneCheckState),
      // Offline: stay silent. Other failures are shown. The server checks again either way.
      catchError((e: unknown) =>
        of<PhoneCheckState>(
          e instanceof HttpErrorResponse && e.status === 0
            ? PHONE_CHECK_IDLE
            : { state: 'error', message: toApiError(e).message },
        ),
      ),
      startWith(PHONE_CHECK_PENDING),
    );
  }

  /** exhaustMap: a second tap on "Enregistrer" while saving is ignored. */
  private watchSubmits(): void {
    this.submits
      .pipe(
        exhaustMap((input) => {
          this.submitting.set(true);
          this.submitError.set(null);
          return this.api.enroll(input, this.idempotencyKey).pipe(
            map((r): SubmitOutcome => ({ ok: true, memberId: r.member.id })),
            catchError((e: unknown) =>
              of<SubmitOutcome>({ ok: false, failure: mapEnrollmentFailure(e) }),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((outcome) =>
        outcome.ok ? this.openCardStep(outcome.memberId) : this.fail(outcome.failure),
      );
  }

  /** Registered and paid: the next step is to scan the card. */
  private openCardStep(memberId: string): void {
    void this.router.navigate(['/agent/inscriptions', memberId, 'carte']);
  }

  private fail(failure: EnrollmentFailure): void {
    this.submitting.set(false);
    if (failure.kind === 'message') {
      this.submitError.set(failure.message);
      return;
    }
    this.errors.set(failure.errors);
    this.step.set(failure.step);
  }

  private clearErrorsOnEdit(): void {
    for (const [field, control] of Object.entries(this.form.controls)) {
      const changes: Observable<unknown> = control.valueChanges;
      changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.clearError(field));
    }
    this.form.controls.phone.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.phoneChecks.next(null));
  }

  /** Changing the payment channel asks for a fresh confirmation. */
  private askConfirmationAgainOnChannelChange(): void {
    this.form.controls.paymentChannel.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.form.controls.paymentConfirmed.setValue(false));
  }

  private clearError(field: string): void {
    if (!isEnrollmentField(field) || !this.errors()[field]) return;
    this.errors.update((e) => ({ ...e, [field]: undefined }));
  }

  private setUpload(field: PhotoField, state: UploadState): void {
    this.uploads.update((u) => ({ ...u, [field]: state }));
  }

  private leave(): void {
    void this.router.navigateByUrl(HOME);
  }

  private defaultMarket(): string {
    return MARKETS.find((m) => m === this.session.user()?.zone) ?? MARKETS[0];
  }
}
