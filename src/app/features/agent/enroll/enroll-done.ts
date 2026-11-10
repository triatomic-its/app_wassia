import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideMessageSquareText } from '@ng-icons/lucide';
import { AgentHeader } from '../../../core/layout/agent-header';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { ButtonDirective } from '../../../shared/ui/button';
import { ErrorState, Skeleton } from '../../../shared/ui/states';
import { AgentApi } from '../data/agent.api';

/** End of enrollment: the member is registered, has paid the 1 000 F and holds a card. */
@Component({
  selector: 'app-enroll-done',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgIcon, ButtonDirective, ErrorState, Skeleton, FcfaPipe],
  providers: [provideIcons({ lucideCircleCheck, lucideMessageSquareText })],
  host: { class: 'flex flex-col gap-3.5 md:mx-auto md:w-full md:max-w-xl' },
  template: `
    @if (detail.error()) {
      <app-error-state message="Impossible d'afficher ce membre." (retry)="detail.reload()" />
    } @else if (detail.value(); as d) {
      <section
        class="flex flex-col items-center gap-2 rounded-card border border-border bg-surface px-5 py-7 text-center"
        role="status"
      >
        <span
          class="flex size-16 items-center justify-center rounded-full bg-success-soft text-success"
        >
          <ng-icon name="lucideCircleCheck" size="36" aria-hidden="true" />
        </span>
        <h2 class="text-xl font-bold">Membre enregistré</h2>
        <p class="text-ink-muted">{{ d.member.fullName }} · {{ d.member.market }}</p>
        <p class="font-display text-lg font-bold text-primary">
          Compte N° {{ d.member.accountNumber }}
        </p>
      </section>

      <dl class="divide-y divide-border-soft rounded-card border border-border bg-surface">
        <div class="flex items-center justify-between gap-4 px-4 py-3 text-sm">
          <dt class="text-ink-muted">Carte remise</dt>
          <dd class="font-display font-bold text-primary">{{ d.card?.printedNumber ?? '—' }}</dd>
        </div>
        @if (membership(); as p) {
          <div class="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <dt class="text-ink-muted">Adhésion payée</dt>
            <dd class="font-semibold">
              {{ p.amount | fcfa }} · {{ p.channel === 'WAVE' ? 'Wave' : 'Espèces' }}
            </dd>
          </div>
        }
      </dl>

      @if (membership()?.channel === 'CASH') {
        <p class="rounded-control bg-warning-soft p-3.5 text-sm text-warning">
          Gardez les {{ membership()!.amount | fcfa }} avec votre collecte du jour : ils sont à
          remettre à la caissière.
        </p>
      }
      <p
        class="flex items-start gap-3 rounded-control bg-success-soft p-3.5 text-sm leading-normal text-success"
      >
        <ng-icon
          name="lucideMessageSquareText"
          size="22"
          class="mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <span>
          <b>SMS envoyé</b> à {{ d.member.fullName }} : son compte est actif et sa carte QR est
          prête. Il peut verser son épargne dès maintenant.
        </span>
      </p>

      <a routerLink="/agent/inscrire" appButton variant="success" [block]="true"
        >Inscrire un autre marchand</a
      >
      <a routerLink="/agent/accueil" appButton variant="ghost" [block]="true">Retour à l'accueil</a>
    } @else {
      <div class="rounded-card border border-border bg-surface p-5">
        <app-skeleton [lines]="4" />
      </div>
    }
  `,
})
export class EnrollDone {
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

  constructor() {
    inject(AgentHeader).use({ title: 'Inscription', back: '/agent/accueil' });
  }
}
