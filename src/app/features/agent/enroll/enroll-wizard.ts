import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideCircleCheck,
  lucideInfo,
  lucideLoaderCircle,
} from '@ng-icons/lucide';
import { isApiError, toApiError } from '../../../core/api/error.model';
import { SessionStore } from '../../../core/auth/session.store';
import { MARKETS, TRADE_SUGGESTIONS } from '../../../core/config/enrollment.config';
import {
  EnrollmentErrors,
  EnrollmentField,
  EnrollmentInput,
  formatPhone,
  hasErrors,
  isValidCiPhone,
  validateDocuments,
  validateIdentity,
} from '../../../core/domain/enrollment';
import { AgentHeader } from '../../../core/layout/agent-header';
import { ButtonDirective } from '../../../shared/ui/button';
import { Field, InputDirective } from '../../../shared/ui/field';
import { AgentApi } from '../data/agent.api';
import { CapturedPhoto, PhotoCapture } from './photo-capture';

const STEPS = [
  'Identité du marchand',
  'Pièces et commerce',
  'Vérifier et créer le compte',
] as const;
const IDENTITY_FIELDS: EnrollmentField[] = ['fullName', 'phone', 'market'];

type Draft = EnrollmentInput & { step: number };

const emptyDraft = (market: string): Draft => ({
  step: 0,
  fullName: '',
  phone: '',
  market,
  trade: '',
  idNumber: '',
  stall: '',
});

function readDraft(key: string): Draft | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

/**
 * "Inscrire un marchand" (mockup, 3 short steps). The draft is saved on the device as the agent
 * types, so nothing is lost if the phone rings or the network drops.
 */
@Component({
  selector: 'app-enroll-wizard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, ButtonDirective, Field, InputDirective, PhotoCapture],
  providers: [
    provideIcons({ lucideCircleCheck, lucideCircleAlert, lucideInfo, lucideLoaderCircle }),
  ],
  host: { class: 'flex flex-col gap-3.5 md:mx-auto md:w-full md:max-w-xl' },
  template: `
    <!-- Progress -->
    <div
      class="flex gap-1.5"
      role="progressbar"
      [attr.aria-valuenow]="step() + 1"
      aria-valuemin="1"
      aria-valuemax="3"
      [attr.aria-label]="'Étape ' + (step() + 1) + ' sur 3'"
    >
      @for (s of steps; track s; let i = $index) {
        <div class="h-1.5 flex-1 rounded" [class]="i <= step() ? 'bg-sapin' : 'bg-border'"></div>
      }
    </div>
    <div class="flex items-baseline justify-between gap-3">
      <h2 class="font-display text-lg font-bold text-primary">{{ steps[step()] }}</h2>
      <span class="shrink-0 text-sm text-ink-muted">Étape {{ step() + 1 }} sur 3</span>
    </div>

    @if (restored()) {
      <div class="flex items-center gap-3 rounded-control bg-info-soft p-3 text-sm text-info">
        <ng-icon name="lucideInfo" size="20" aria-hidden="true" />
        <span class="flex-1">Brouillon repris là où vous l'aviez laissé.</span>
        <button
          type="button"
          class="min-h-10 rounded-control px-2 font-semibold underline"
          (click)="startOver()"
        >
          Recommencer
        </button>
      </div>
    }

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
            [value]="draft().fullName"
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
            [value]="draft().phone"
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
              <option [value]="m" [selected]="m === draft().market">{{ m }}</option>
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
            [value]="draft().stall ?? ''"
            (input)="set('stall', $event)"
            aria-describedby="en-stall-msg"
          />
        </app-field>
      }

      @case (1) {
        <app-photo-capture
          label="Pièce d'identité (CNI)"
          [url]="draft().idDocUrl"
          [error]="errors().idDocUrl"
          (captured)="photo('idDocUrl', $event)"
        />
        <app-photo-capture
          label="Photo de l'étalage ou du commerce"
          [url]="draft().photoUrl"
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
            [value]="draft().idNumber"
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
            [value]="draft().trade"
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
        <dl class="divide-y divide-border-soft rounded-card border border-border bg-surface">
          @for (row of summary(); track row.label) {
            <div class="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <dt class="text-ink-muted">{{ row.label }}</dt>
              <dd class="text-right font-semibold">{{ row.value }}</dd>
            </div>
          }
        </dl>
        <p class="rounded-control bg-info-soft p-3.5 text-sm leading-normal text-info">
          <b>Ensuite :</b> le compte est créé automatiquement. Le marchand reçoit un SMS pour payer
          ses 1 000 F d'adhésion.
        </p>
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
      @if (step() < 2) {
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
          {{ submitting() ? 'Création…' : 'Créer le compte' }}
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

  protected readonly steps = STEPS;
  protected readonly markets = MARKETS;
  protected readonly trades = TRADE_SUGGESTIONS;

  private readonly draftKey = `wassia.agent.draft.${this.session.user()?.id ?? 'anon'}`;
  private readonly defaultMarket =
    MARKETS.find((m) => m === this.session.user()?.zone) ?? MARKETS[0];

  protected readonly draft = signal<Draft>(
    readDraft(this.draftKey) ?? emptyDraft(this.defaultMarket),
  );
  protected readonly restored = signal(readDraft(this.draftKey) !== null);
  protected readonly step = computed(() => this.draft().step);
  protected readonly errors = signal<EnrollmentErrors>({});
  protected readonly phoneState = signal<{
    state: 'idle' | 'checking' | 'free' | 'taken';
    name?: string;
  }>({
    state: 'idle',
  });
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly summary = computed(() => {
    const d = this.draft();
    return [
      { label: 'Nom', value: d.fullName },
      { label: 'Téléphone', value: formatPhone(d.phone) },
      { label: 'Marché', value: d.market },
      { label: 'Activité', value: d.trade },
      { label: 'Pièce d’identité', value: d.idDocUrl ? 'Photo enregistrée' : 'Manquante' },
      { label: 'Photo du commerce', value: d.photoUrl ? 'Photo enregistrée' : 'Manquante' },
    ];
  });

  constructor() {
    this.header.use({ title: 'Inscrire un marchand', back: '/agent/accueil' });
    effect(() => {
      // Back arrow = previous step inside the wizard.
      const step = this.step();
      this.header.update({ onBack: step > 0 ? () => this.previous() : undefined });
    });
    effect(() => {
      const draft = this.draft();
      try {
        localStorage.setItem(this.draftKey, JSON.stringify(draft));
      } catch {
        // Storage unavailable: the draft lives for this screen only.
      }
    });
  }

  protected set(field: EnrollmentField, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.draft.update((d) => ({ ...d, [field]: value }));
    if (this.errors()[field]) this.errors.update((e) => ({ ...e, [field]: undefined }));
    if (field === 'phone') this.phoneState.set({ state: 'idle' });
  }

  protected photo(field: 'idDocUrl' | 'photoUrl', photo: CapturedPhoto): void {
    this.draft.update((d) => ({ ...d, [field]: photo.url }));
    this.errors.update((e) => ({ ...e, [field]: undefined }));
  }

  protected checkPhone(): void {
    const phone = this.draft().phone;
    if (!isValidCiPhone(phone)) return;
    this.phoneState.set({ state: 'checking' });
    this.api.checkPhone(phone).subscribe({
      next: (r) =>
        this.phoneState.set(
          r.available ? { state: 'free' } : { state: 'taken', name: r.existingName },
        ),
      // Offline or error: the server checks again at creation time.
      error: () => this.phoneState.set({ state: 'idle' }),
    });
  }

  protected next(): void {
    const d = this.draft();
    const errors = d.step === 0 ? validateIdentity(d) : validateDocuments(d);
    if (d.step === 0 && this.phoneState().state === 'taken') {
      errors.phone = 'Ce numéro est déjà enregistré pour un autre marchand.';
    }
    this.errors.set(errors);
    if (hasErrors(errors)) {
      this.focusFirstError(errors);
      return;
    }
    this.submitError.set(null);
    this.draft.update((x) => ({ ...x, step: x.step + 1 }));
  }

  protected previous(): void {
    this.errors.set({});
    this.submitError.set(null);
    this.draft.update((x) => ({ ...x, step: Math.max(0, x.step - 1) }));
  }

  protected startOver(): void {
    this.restored.set(false);
    this.errors.set({});
    this.phoneState.set({ state: 'idle' });
    this.draft.set(emptyDraft(this.defaultMarket));
  }

  protected submit(): void {
    const { step, ...input } = this.draft();
    void step;
    this.submitting.set(true);
    this.submitError.set(null);
    this.api.createMember({ ...input, phone: formatPhone(input.phone) }).subscribe({
      next: (member) => {
        try {
          localStorage.removeItem(this.draftKey);
        } catch {
          // ignore
        }
        void this.router.navigate(['/agent/inscriptions', member.id, 'cree']);
      },
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
      this.draft.update((d) => ({ ...d, step: 0 }));
      return;
    }
    if (body?.details) {
      const errors: EnrollmentErrors = {};
      for (const [k, v] of Object.entries(body.details)) errors[k as EnrollmentField] = v[0];
      this.errors.set(errors);
      const onIdentity = Object.keys(errors).some((k) =>
        IDENTITY_FIELDS.includes(k as EnrollmentField),
      );
      this.draft.update((d) => ({ ...d, step: onIdentity ? 0 : 1 }));
      return;
    }
    const status = e instanceof HttpErrorResponse ? e.status : -1;
    this.submitError.set(
      status === 0
        ? 'Pas de connexion. Votre saisie est gardée sur cet appareil ; réessayez quand le réseau revient.'
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
