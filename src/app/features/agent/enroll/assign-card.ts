import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideCircleCheck, lucideCreditCard } from '@ng-icons/lucide';
import { toApiError } from '../../../core/api/error.model';
import { AgentHeader } from '../../../core/layout/agent-header';
import { CardLookup } from '../../../core/models';
import { ButtonDirective } from '../../../shared/ui/button';
import { CardRef, CardScan } from '../../../shared/ui/card-scan';
import { ErrorState, Skeleton } from '../../../shared/ui/states';
import { AgentApi } from '../data/agent.api';

/**
 * Mockup "Étape 5 — Agent : associer la carte après paiement".
 * The agent scans a blank card, checks it is recognised, then hands it over.
 */
@Component({
  selector: 'app-assign-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgIcon, ButtonDirective, CardScan, ErrorState, Skeleton],
  providers: [provideIcons({ lucideCircleCheck, lucideCircleAlert, lucideCreditCard })],
  host: { class: 'flex flex-col gap-3.5 md:mx-auto md:w-full md:max-w-xl' },
  template: `
    @if (detail.error()) {
      <app-error-state message="Impossible de charger ce marchand." (retry)="detail.reload()" />
    } @else if (detail.value(); as d) {
      @if (done(); as card) {
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
          <p class="text-ink-muted">Carte {{ card }} remise à {{ d.member.fullName }}.</p>
          <p class="text-sm text-ink-muted">
            Le marchand a reçu un SMS : son compte est actif, il peut verser son épargne.
          </p>
        </section>
        <a routerLink="/agent/inscriptions" appButton variant="success" [block]="true"
          >Mes inscriptions</a
        >
        <a routerLink="/agent/accueil" appButton variant="ghost" [block]="true"
          >Retour à l'accueil</a
        >
      } @else if (d.member.status === 'PAYMENT_PENDING') {
        <p
          class="flex items-start gap-3 rounded-control bg-warning-soft p-3.5 text-sm text-warning"
          role="alert"
        >
          <ng-icon name="lucideCircleAlert" size="22" class="shrink-0" aria-hidden="true" />
          {{ d.member.fullName }} n'a pas encore payé ses 1 000 F. La carte pourra être associée
          après le paiement.
        </p>
        <a routerLink="/agent/inscriptions" appButton variant="outline" [block]="true">Retour</a>
      } @else if (d.member.status !== 'CARD_TO_ASSIGN') {
        <p class="rounded-control bg-info-soft p-3.5 text-sm text-info">
          {{ d.member.fullName }} a déjà une carte active.
        </p>
        <a routerLink="/agent/inscriptions" appButton variant="outline" [block]="true">Retour</a>
      } @else {
        <p class="rounded-control bg-success-soft p-3.5 text-sm text-success">
          <b>Paiement reçu.</b> {{ d.member.fullName }} a payé ses 1 000 F d'adhésion.
        </p>
        <div class="flex items-baseline justify-between gap-3">
          <h2 class="font-display text-lg font-bold text-primary">Associer la carte au compte</h2>
          <span class="shrink-0 text-sm text-ink-muted">Après paiement</span>
        </div>

        <app-card-scan
          scanLabel="Scanner le QR d'une carte vierge"
          [disabled]="busy()"
          (found)="lookup($event)"
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
                  <div class="text-sm">
                    Carte vierge, prête pour le compte de {{ d.member.fullName }}.
                  </div>
                </div>
              </div>
            } @else {
              <p
                class="rounded-control bg-danger-soft p-3.5 text-sm font-semibold text-danger"
                role="alert"
              >
                La carte {{ c.card.printedNumber }} est déjà utilisée. Prenez une carte vierge.
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

        <div class="flex gap-2.5">
          <a routerLink="/agent/inscriptions" appButton variant="outline" class="flex-1">Retour</a>
          <button
            appButton
            variant="success"
            type="button"
            class="flex-[2]"
            [disabled]="!canAssign() || busy()"
            (click)="assign(d.member.id)"
          >
            {{ busy() ? 'Association…' : 'Associer et remettre la carte' }}
          </button>
        </div>
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
  protected readonly card = signal<CardLookup | null>(null);
  private readonly ref = signal<CardRef | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal<string | null>(null);

  constructor() {
    inject(AgentHeader).use({ title: 'Associer la carte', back: '/agent/inscriptions' });
  }

  protected canAssign(): boolean {
    return this.card()?.card.status === 'UNASSIGNED';
  }

  protected lookup(ref: CardRef): void {
    this.error.set(null);
    this.card.set(null);
    this.ref.set(ref);
    this.busy.set(true);
    this.api.lookupCard(ref).subscribe({
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
    const ref = this.ref();
    if (!ref) return;
    this.busy.set(true);
    this.error.set(null);
    this.api.assignCard(memberId, ref).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.done.set(r.card.printedNumber);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(toApiError(e).message);
      },
    });
  }
}
