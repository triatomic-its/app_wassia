import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideCircleCheck,
  lucideCreditCard,
  lucideMessageSquareText,
} from '@ng-icons/lucide';
import { toApiError } from '../../../core/api/error.model';
import { AgentHeader } from '../../../core/layout/agent-header';
import { CardAssignResult, CardLookup } from '../../../core/models';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { ButtonDirective } from '../../../shared/ui/button';
import { CardScan } from '../../../shared/ui/card-scan';
import { ErrorState, Skeleton } from '../../../shared/ui/states';
import { AgentApi } from '../data/agent.api';

/**
 * "Associer la carte" (client rule, 2026-11-10): right after registration — or later from
 * "Mes inscriptions" — the agent scans the QR code of a blank card, checks it, and hands it over.
 */
@Component({
  selector: 'app-assign-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgIcon, ButtonDirective, CardScan, ErrorState, Skeleton, FcfaPipe],
  providers: [
    provideIcons({
      lucideCircleCheck,
      lucideCircleAlert,
      lucideCreditCard,
      lucideMessageSquareText,
    }),
  ],
  host: { class: 'flex flex-col gap-3.5 md:mx-auto md:w-full md:max-w-xl' },
  template: `
    @if (detail.error()) {
      <app-error-state message="Impossible de charger ce membre." (retry)="detail.reload()" />
    } @else if (detail.value(); as d) {
      @if (done(); as r) {
        <!-- Card associated: the member is active -->
        <section
          class="flex flex-col items-center gap-2 rounded-card border border-border bg-surface px-5 py-7 text-center"
          role="status"
        >
          <span
            class="flex size-16 items-center justify-center rounded-full bg-success-soft text-success"
          >
            <ng-icon name="lucideCircleCheck" size="36" aria-hidden="true" />
          </span>
          <h2 class="text-xl font-bold">Carte activée</h2>
          <p class="text-ink-muted">
            Carte {{ r.card.printedNumber }} remise à {{ r.member.fullName }}.
          </p>
          <p class="font-display font-bold text-primary">Compte N° {{ r.member.accountNumber }}</p>
        </section>
        <p
          class="flex items-start gap-3 rounded-control bg-success-soft p-3.5 text-sm leading-normal text-success"
        >
          <ng-icon
            name="lucideMessageSquareText"
            size="22"
            class="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <span
            ><b>SMS envoyé</b> : son compte est actif, il peut verser son épargne dès
            maintenant.</span
          >
        </p>
        <a routerLink="/agent/inscrire" appButton variant="success" [block]="true"
          >Inscrire un autre marchand</a
        >
        <a routerLink="/agent/accueil" appButton variant="ghost" [block]="true"
          >Retour à l'accueil</a
        >
      } @else if (d.member.status !== 'CARD_TO_ASSIGN') {
        <p class="rounded-control bg-info-soft p-3.5 text-sm text-info">
          {{ d.member.fullName }} a déjà une carte.
        </p>
        <a routerLink="/agent/inscriptions" appButton variant="outline" [block]="true"
          >Mes inscriptions</a
        >
      } @else {
        <!-- Progress: the 3 enrollment steps are done, this is the last one -->
        <div class="flex gap-1.5" aria-hidden="true">
          @for (i of [0, 1, 2, 3]; track i) {
            <div class="h-1.5 flex-1 rounded" [class]="i < 3 ? 'bg-sapin' : 'bg-primary'"></div>
          }
        </div>
        <p
          class="flex items-start gap-3 rounded-control bg-success-soft p-3.5 text-sm text-success"
        >
          <ng-icon name="lucideCircleCheck" size="22" class="shrink-0" aria-hidden="true" />
          <span>
            <b>{{ d.member.fullName }} est enregistré.</b>
            @if (membership(); as p) {
              {{ p.amount | fcfa }} reçus {{ p.channel === 'WAVE' ? 'par Wave' : 'en espèces' }}.
            }
          </span>
        </p>
        <div class="flex items-baseline justify-between gap-3">
          <h2 class="font-display text-lg font-bold text-primary">Associer la carte</h2>
          <span class="shrink-0 text-sm text-ink-muted">Dernière étape</span>
        </div>
        <p class="text-sm text-ink-muted">Prenez une carte vierge et scannez son code QR.</p>

        <app-card-scan
          scanLabel="Scanner le code QR de la carte"
          [disabled]="busy()"
          (scanned)="check($event)"
        />

        <div aria-live="polite">
          @if (card(); as c) {
            @if (c.card.status === 'UNASSIGNED') {
              <div
                class="flex items-center gap-3 rounded-card border-[1.5px] border-sapin bg-success-soft p-3.5 text-success"
              >
                <ng-icon name="lucideCreditCard" size="26" aria-hidden="true" />
                <div>
                  <div class="font-display font-bold">
                    Carte {{ c.card.printedNumber }} reconnue
                  </div>
                  <div class="text-sm">Carte vierge, prête pour {{ d.member.fullName }}.</div>
                </div>
              </div>
            } @else {
              <p
                class="flex items-start gap-3 rounded-control bg-danger-soft p-3.5 text-sm font-semibold text-danger"
                role="alert"
              >
                <ng-icon name="lucideCircleAlert" size="22" class="shrink-0" aria-hidden="true" />
                La carte {{ c.card.printedNumber }} est déjà utilisée. Prenez une autre carte
                vierge.
              </p>
            }
          }
          @if (error()) {
            <p
              class="rounded-control bg-danger-soft p-3.5 text-sm font-semibold text-danger"
              role="alert"
            >
              {{ error() }}
            </p>
          }
        </div>

        <button
          appButton
          variant="success"
          type="button"
          [block]="true"
          [disabled]="!cardReady() || busy()"
          (click)="assign(d.member.id)"
        >
          {{ busy() ? 'Association…' : 'Associer et remettre la carte' }}
        </button>
        <a routerLink="/agent/inscriptions" appButton variant="ghost" [block]="true"
          >Associer plus tard</a
        >
        <p class="text-center text-xs text-ink-muted">
          Sans carte, le marchand ne peut pas encore verser son épargne. Il restera dans « Cartes à
          associer ».
        </p>
      }
    } @else {
      <div class="rounded-card border border-border bg-surface p-5">
        <app-skeleton [lines]="4" />
      </div>
    }
  `,
})
export class AssignCard {
  readonly id = input.required<string>();
  private readonly api = inject(AgentApi);

  protected readonly detail = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.api.member(params),
  });
  /** The membership fee is, by definition, the member's first payment (made at enrollment). */
  protected readonly membership = computed(() => {
    const payments = this.detail.value()?.payments ?? [];
    return [...payments].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  });
  protected readonly card = signal<CardLookup | null>(null);
  private readonly qrToken = signal<string | null>(null);
  protected readonly cardReady = computed(() => this.card()?.card.status === 'UNASSIGNED');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal<CardAssignResult | null>(null);

  constructor() {
    inject(AgentHeader).use({ title: 'Associer la carte', back: '/agent/inscriptions' });
  }

  protected check(qrToken: string): void {
    this.error.set(null);
    this.card.set(null);
    this.qrToken.set(qrToken);
    this.busy.set(true);
    this.api.lookupCard(qrToken).subscribe({
      next: (c) => {
        this.busy.set(false);
        this.card.set(c);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }

  protected assign(memberId: string): void {
    const token = this.qrToken();
    if (!token) return;
    this.busy.set(true);
    this.error.set(null);
    this.api.assignCard(memberId, token).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.done.set(r);
      },
      error: (e) => {
        this.busy.set(false);
        this.card.set(null);
        this.error.set(toApiError(e).message);
      },
    });
  }
}
