import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBanknote,
  lucideCircleAlert,
  lucideCircleCheck,
  lucideLoaderCircle,
  lucideSmartphone,
} from '@ng-icons/lucide';
import { isApiError, toApiError } from '../../../core/api/error.model';
import { SessionStore } from '../../../core/auth/session.store';
import { MARKETS, TRADE_SUGGESTIONS } from '../../../core/config/enrollment.config';
import {
  EnrollmentErrors,
  EnrollmentField,
  EnrollmentInput,
  MembershipChannel,
  formatPhone,
  hasErrors,
  isValidCiPhone,
  validateDocuments,
  validateIdentity,
  validatePayment,
} from '../../../core/domain/enrollment';
import { AgentHeader } from '../../../core/layout/agent-header';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { ButtonDirective } from '../../../shared/ui/button';
import { ConfirmService } from '../../../shared/ui/confirm-dialog';
import { Field, InputDirective } from '../../../shared/ui/field';
import { AgentApi } from '../data/agent.api';
import { CapturedPhoto, PhotoCapture } from './photo-capture';

const STEPS = ['Identité du marchand', 'Pièces et commerce', 'Paiement de l’adhésion'] as const;
const LAST = STEPS.length - 1;

const STEP_OF: Record<EnrollmentField, number> = {
  fullName: 0,
  phone: 0,
  market: 0,
  stall: 0,
  idDocUrl: 1,
  photoUrl: 1,
  idNumber: 1,
  trade: 1,
  paymentChannel: 2,
  paymentConfirmed: 2,
  paymentRef: 2,
};

const VALIDATORS = [validateIdentity, validateDocuments, validatePayment];

const emptyForm = (market: string): EnrollmentInput => ({
  fullName: '',
  phone: '',
  market,
  trade: '',
  idNumber: '',
  stall: '',
});

/**
 * "Inscrire un marchand" (client rule, 2026-11-10): the merchant is registered only once the
 * 1 000 F are received on the spot (cash or Wave). The QR card is then scanned on the next
 * screen. Nothing is kept if the agent gives up before registering.
 */
@Component({
  selector: 'app-enroll-wizard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, ButtonDirective, Field, InputDirective, PhotoCapture, FcfaPipe],
  providers: [
    provideIcons({
      lucideCircleCheck,
      lucideCircleAlert,
      lucideLoaderCircle,
      lucideBanknote,
      lucideSmartphone,
    }),
  ],
  host: { class: 'flex flex-col gap-3.5 md:mx-auto md:w-full md:max-w-xl' },
  template: `
    <div
      class="flex gap-1.5"
      role="progressbar"
      [attr.aria-valuenow]="step() + 1"
      aria-valuemin="1"
      [attr.aria-valuemax]="steps.length"
      [attr.aria-label]="'Étape ' + (step() + 1) + ' sur ' + steps.length"
    >
      @for (s of steps; track s; let i = $index) {
        <div class="h-1.5 flex-1 rounded" [class]="i <= step() ? 'bg-sapin' : 'bg-border'"></div>
      }
    </div>
    <div class="flex items-baseline justify-between gap-3">
      <h2 class="font-display text-lg font-bold text-primary">{{ steps[step()] }}</h2>
      <span class="shrink-0 text-sm text-ink-muted"
        >Étape {{ step() + 1 }} sur {{ steps.length }}</span
      >
    </div>

    @switch (step()) {
      @case (0) {
        <app-field
          label="Nom et prénoms"
          for="en-name"
          [required]="true"
          [error]="errors().fullName"
        >
          <input
            id="en-name"
            appInput
            autocomplete="name"
            [value]="form().fullName"
            (input)="set('fullName', $event)"
            [attr.aria-invalid]="!!errors().fullName"
            aria-describedby="en-name-msg"
          />
        </app-field>

        <app-field label="Téléphone" for="en-phone" [required]="true" [error]="errors().phone">
          <input
            id="en-phone"
            appInput
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            placeholder="07 00 00 00 00"
            [value]="form().phone"
            (input)="set('phone', $event)"
            (blur)="checkPhone()"
            [attr.aria-invalid]="!!errors().phone"
            aria-describedby="en-phone-msg"
          />
        </app-field>
        <div aria-live="polite">
          @switch (phoneState().state) {
            @case ('checking') {
              <p class="-mt-1.5 flex items-center gap-2 text-sm text-ink-muted">
                <ng-icon
                  name="lucideLoaderCircle"
                  size="18"
                  class="animate-spin"
                  aria-hidden="true"
                />Vérification du numéro…
              </p>
            }
            @case ('free') {
              <p class="-mt-1.5 flex items-center gap-2 text-sm font-semibold text-success">
                <ng-icon name="lucideCircleCheck" size="18" aria-hidden="true" />Ce numéro n'est pas
                encore enregistré
              </p>
            }
            @case ('taken') {
              <p
                class="-mt-1.5 flex items-center gap-2 text-sm font-semibold text-danger"
                role="alert"
              >
                <ng-icon name="lucideCircleAlert" size="18" aria-hidden="true" />Déjà inscrit :
                {{ phoneState().name }}
              </p>
            }
          }
        </div>

        <app-field label="Marché" for="en-market" [required]="true" [error]="errors().market">
          <select
            id="en-market"
            appInput
            (change)="set('market', $event)"
            aria-describedby="en-market-msg"
          >
            @for (m of markets; track m) {
              <option [value]="m" [selected]="m === form().market">{{ m }}</option>
            }
          </select>
        </app-field>

        <app-field
          label="Emplacement (facultatif)"
          for="en-stall"
          hint="Exemple : Allée B, étal 12"
        >
          <input
            id="en-stall"
            appInput
            [value]="form().stall ?? ''"
            (input)="set('stall', $event)"
            aria-describedby="en-stall-msg"
          />
        </app-field>
      }

      @case (1) {
        <app-photo-capture
          label="Pièce d'identité (CNI)"
          [url]="form().idDocUrl"
          [error]="errors().idDocUrl"
          (captured)="photo('idDocUrl', $event)"
        />
        <app-photo-capture
          label="Photo de l'étalage ou du commerce"
          [url]="form().photoUrl"
          [error]="errors().photoUrl"
          (captured)="photo('photoUrl', $event)"
        />

        <app-field
          label="Numéro de la pièce d'identité"
          for="en-id"
          [required]="true"
          [error]="errors().idNumber"
        >
          <input
            id="en-id"
            appInput
            autocapitalize="characters"
            placeholder="CI 0000 0000"
            [value]="form().idNumber"
            (input)="set('idNumber', $event)"
            [attr.aria-invalid]="!!errors().idNumber"
            aria-describedby="en-id-msg"
          />
        </app-field>

        <app-field label="Activité" for="en-trade" [required]="true" [error]="errors().trade">
          <input
            id="en-trade"
            appInput
            list="en-trades"
            placeholder="Vente de pagnes"
            [value]="form().trade"
            (input)="set('trade', $event)"
            [attr.aria-invalid]="!!errors().trade"
            aria-describedby="en-trade-msg"
          />
          <datalist id="en-trades">
            @for (t of trades; track t) {
              <option [value]="t"></option>
            }
          </datalist>
        </app-field>
      }

      @case (2) {
        <section
          class="flex flex-col items-center gap-1 rounded-card border border-border bg-surface px-4 py-5 text-center"
        >
          <span class="text-sm text-ink-muted">Le marchand paie maintenant</span>
          <span class="font-display text-[2rem] font-bold text-primary">{{ fee() | fcfa }}</span>
          <span class="text-sm text-ink-muted">pour l'ouverture de son compte</span>
        </section>

        <fieldset class="flex flex-col gap-2">
          <legend class="mb-2 text-sm font-semibold">
            Comment paie-t-il ? <span class="text-danger" aria-hidden="true">*</span>
          </legend>
          <div class="grid grid-cols-2 gap-2.5">
            @for (c of channels; track c.value) {
              <label
                class="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-card border-[1.5px] px-3 font-display font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent"
                [class]="
                  form().paymentChannel === c.value
                    ? 'border-sapin bg-success-soft text-success'
                    : 'border-border bg-surface text-primary'
                "
              >
                <input
                  type="radio"
                  name="en-channel"
                  class="sr-only"
                  [value]="c.value"
                  [checked]="form().paymentChannel === c.value"
                  (change)="choose(c.value)"
                />
                <ng-icon [name]="c.icon" size="28" aria-hidden="true" />{{ c.label }}
              </label>
            }
          </div>
          @if (errors().paymentChannel) {
            <p class="text-sm font-semibold text-danger" role="alert">
              {{ errors().paymentChannel }}
            </p>
          }
        </fieldset>

        @if (form().paymentChannel === 'WAVE') {
          <p class="rounded-control bg-info-soft p-3.5 text-sm leading-normal text-info">
            Le marchand envoie {{ fee() | fcfa }} par Wave au numéro marchand WASSIA, puis vous
            montre la confirmation sur son téléphone.
          </p>
          <app-field
            label="Référence Wave (facultatif)"
            for="en-ref"
            hint="Elle aide le comptable à retrouver le paiement."
          >
            <input
              id="en-ref"
              appInput
              autocapitalize="characters"
              autocomplete="off"
              [value]="form().paymentRef ?? ''"
              (input)="set('paymentRef', $event)"
              aria-describedby="en-ref-msg"
            />
          </app-field>
        }

        @if (form().paymentChannel) {
          <label
            class="flex min-h-14 cursor-pointer items-center gap-3 rounded-card border-[1.5px] bg-surface p-3.5 font-semibold"
            [class]="errors().paymentConfirmed ? 'border-danger' : 'border-border'"
          >
            <input
              type="checkbox"
              class="size-6 shrink-0 accent-sapin"
              [checked]="form().paymentConfirmed === true"
              (change)="confirmPaid($event)"
            />
            {{
              form().paymentChannel === 'CASH'
                ? 'J’ai reçu ' + (fee() | fcfa) + ' en espèces'
                : 'J’ai vu la confirmation du paiement Wave'
            }}
          </label>
          @if (errors().paymentConfirmed) {
            <p class="-mt-1.5 text-sm font-semibold text-danger" role="alert">
              {{ errors().paymentConfirmed }}
            </p>
          }
          @if (form().paymentChannel === 'CASH') {
            <p class="text-sm text-ink-muted">
              Cet argent s'ajoute à ce que vous remettez à la caissière ce soir.
            </p>
          }
        }
      }
    }

    <div aria-live="assertive">
      @if (submitError()) {
        <p
          class="rounded-control bg-danger-soft p-3 text-sm font-semibold text-danger"
          role="alert"
        >
          {{ submitError() }}
        </p>
      }
    </div>

    <div class="mt-1 flex gap-2.5">
      @if (step() > 0) {
        <button
          appButton
          variant="outline"
          type="button"
          class="flex-1"
          [disabled]="submitting()"
          (click)="previous()"
        >
          Retour
        </button>
      }
      @if (step() < last) {
        <button appButton variant="success" type="button" class="flex-[2]" (click)="next()">
          Continuer
        </button>
      } @else {
        <button
          appButton
          variant="success"
          type="button"
          class="flex-[2]"
          [disabled]="submitting()"
          (click)="submit()"
        >
          {{ submitting() ? 'Enregistrement…' : 'Enregistrer le membre' }}
        </button>
      }
    </div>
  `,
})
export class EnrollWizard {
  private readonly api = inject(AgentApi);
  private readonly router = inject(Router);
  private readonly session = inject(SessionStore);
  private readonly header = inject(AgentHeader);
  private readonly confirm = inject(ConfirmService);

  protected readonly steps = STEPS;
  protected readonly last = LAST;
  protected readonly markets = MARKETS;
  protected readonly trades = TRADE_SUGGESTIONS;
  protected readonly channels: { value: MembershipChannel; label: string; icon: string }[] = [
    { value: 'CASH', label: 'Espèces', icon: 'lucideBanknote' },
    { value: 'WAVE', label: 'Wave', icon: 'lucideSmartphone' },
  ];

  private readonly defaultMarket =
    MARKETS.find((m) => m === this.session.user()?.zone) ?? MARKETS[0];

  protected readonly form = signal<EnrollmentInput>(emptyForm(this.defaultMarket));
  protected readonly step = signal(0);
  protected readonly errors = signal<EnrollmentErrors>({});
  protected readonly phoneState = signal<{
    state: 'idle' | 'checking' | 'free' | 'taken';
    name?: string;
  }>({
    state: 'idle',
  });
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  private readonly feeResource = rxResource({ stream: () => this.api.membershipFee() });
  protected readonly fee = computed(() => this.feeResource.value() ?? 1000);

  constructor() {
    this.header.use({ title: 'Inscrire un marchand', onBack: () => this.back() });
  }

  protected set(field: keyof EnrollmentInput, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.form.update((f) => ({ ...f, [field]: value }));
    if (this.errors()[field]) this.errors.update((e) => ({ ...e, [field]: undefined }));
    if (field === 'phone') this.phoneState.set({ state: 'idle' });
  }

  protected photo(field: 'idDocUrl' | 'photoUrl', photo: CapturedPhoto): void {
    this.form.update((f) => ({ ...f, [field]: photo.url }));
    this.errors.update((e) => ({ ...e, [field]: undefined }));
  }

  protected choose(channel: MembershipChannel): void {
    // Changing the channel asks for a fresh confirmation.
    this.form.update((f) => ({ ...f, paymentChannel: channel, paymentConfirmed: false }));
    this.errors.update((e) => ({ ...e, paymentChannel: undefined, paymentConfirmed: undefined }));
  }

  protected confirmPaid(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.form.update((f) => ({ ...f, paymentConfirmed: checked }));
    if (checked) this.errors.update((e) => ({ ...e, paymentConfirmed: undefined }));
  }

  protected checkPhone(): void {
    const phone = this.form().phone;
    if (!isValidCiPhone(phone)) return;
    this.phoneState.set({ state: 'checking' });
    this.api.checkPhone(phone).subscribe({
      next: (r) =>
        this.phoneState.set(
          r.available ? { state: 'free' } : { state: 'taken', name: r.existingName },
        ),
      // Offline or error: the server checks again at registration.
      error: () => this.phoneState.set({ state: 'idle' }),
    });
  }

  protected next(): void {
    const errors = VALIDATORS[this.step()](this.form());
    if (this.step() === 0 && this.phoneState().state === 'taken') {
      errors.phone = 'Ce numéro est déjà enregistré pour un autre marchand.';
    }
    this.errors.set(errors);
    if (hasErrors(errors)) {
      this.focusFirstError(errors);
      return;
    }
    this.submitError.set(null);
    this.step.update((s) => Math.min(LAST, s + 1));
  }

  protected previous(): void {
    this.errors.set({});
    this.submitError.set(null);
    this.step.update((s) => Math.max(0, s - 1));
  }

  /** Top-bar arrow: previous step, or leave (asking first if something was typed). */
  private back(): void {
    if (this.step() > 0) {
      this.previous();
      return;
    }
    const f = this.form();
    if (!f.fullName.trim() && !f.phone.trim()) {
      void this.router.navigateByUrl('/agent/accueil');
      return;
    }
    this.confirm
      .ask({
        title: 'Abandonner l’inscription ?',
        message: 'Les informations saisies seront effacées. Le marchand n’est pas enregistré.',
        confirmLabel: 'Abandonner',
        danger: true,
      })
      .subscribe((r) => r.confirmed && void this.router.navigateByUrl('/agent/accueil'));
  }

  protected submit(): void {
    // Same check as "Continuer": never send an unpaid registration.
    const errors = VALIDATORS[this.step()](this.form());
    this.errors.set(errors);
    if (hasErrors(errors)) return;
    this.submitting.set(true);
    this.submitError.set(null);
    const f = this.form();
    this.api.enroll({ ...f, phone: formatPhone(f.phone) }).subscribe({
      // Registered and paid: next step is to scan the card.
      next: (r) => void this.router.navigate(['/agent/inscriptions', r.member.id, 'carte']),
      error: (e: unknown) => {
        this.submitting.set(false);
        this.handleSubmitError(e);
      },
    });
  }

  private handleSubmitError(e: unknown): void {
    const body = e instanceof HttpErrorResponse && isApiError(e.error) ? e.error : null;
    if (body?.code === 'PHONE_ALREADY_USED') {
      this.errors.set({ phone: body.message });
      this.step.set(0);
      return;
    }
    if (body?.details) {
      const errors: EnrollmentErrors = {};
      for (const [k, v] of Object.entries(body.details)) errors[k as EnrollmentField] = v[0];
      this.errors.set(errors);
      this.step.set(
        Math.min(...Object.keys(errors).map((k) => STEP_OF[k as EnrollmentField] ?? LAST)),
      );
      return;
    }
    const status = e instanceof HttpErrorResponse ? e.status : -1;
    this.submitError.set(
      status === 0
        ? 'Pas de connexion : le marchand n’est pas encore enregistré. Réessayez quand le réseau revient.'
        : toApiError(e).message,
    );
  }

  private focusFirstError(errors: EnrollmentErrors): void {
    const ids: Partial<Record<EnrollmentField, string>> = {
      fullName: 'en-name',
      phone: 'en-phone',
      market: 'en-market',
      idNumber: 'en-id',
      trade: 'en-trade',
    };
    const first = (Object.keys(errors) as EnrollmentField[]).map((k) => ids[k]).find(Boolean);
    if (first) queueMicrotask(() => document.getElementById(first)?.focus());
  }
}
