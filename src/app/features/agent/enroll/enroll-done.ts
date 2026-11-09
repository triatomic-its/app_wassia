import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideMessageSquareText } from '@ng-icons/lucide';
import { AgentHeader } from '../../../core/layout/agent-header';
import { ButtonDirective } from '../../../shared/ui/button';
import { ErrorState, Skeleton } from '../../../shared/ui/states';
import { AgentApi } from '../data/agent.api';

/** Mockup "Compte créé automatiquement": confirms the SMS and suggests the next action. */
@Component({
  selector: 'app-enroll-done',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgIcon, ButtonDirective, ErrorState, Skeleton],
  providers: [provideIcons({ lucideCircleCheck, lucideMessageSquareText })],
  host: { class: 'flex flex-col gap-3.5 md:mx-auto md:w-full md:max-w-xl' },
  template: `
    @if (detail.error()) {
      <app-error-state message="Impossible d'afficher ce compte." (retry)="detail.reload()" />
    } @else if (detail.value(); as d) {
      <section
        class="flex flex-col items-center gap-2 rounded-card border border-border bg-surface px-5 py-7 text-center"
      >
        <span
          class="flex size-16 items-center justify-center rounded-full bg-success-soft text-success"
        >
          <ng-icon name="lucideCircleCheck" size="36" aria-hidden="true" />
        </span>
        <h2 class="text-xl font-bold">Compte créé</h2>
        <p class="text-ink-muted">{{ d.member.fullName }} · {{ d.member.market }}</p>
        <p class="font-display text-lg font-bold text-primary">N° {{ d.member.accountNumber }}</p>
      </section>

      <p
        class="flex items-start gap-3 rounded-control bg-success-soft p-3.5 text-sm leading-normal text-success"
        role="status"
      >
        <ng-icon
          name="lucideMessageSquareText"
          size="22"
          class="mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <span>
          <b>SMS envoyé</b> à {{ d.member.fullName }} avec le lien pour payer ses 1 000 F.
          L'administration voit l'enrôlement en temps réel.
        </span>
      </p>
      <p class="text-sm text-ink-muted">
        Quand le paiement est reçu, revenez dans « Mes inscriptions » pour associer une carte QR.
      </p>

      <a routerLink="/agent/inscrire" appButton variant="success" [block]="true"
        >Inscrire un autre marchand</a
      >
      <a routerLink="/agent/inscriptions" appButton variant="outline" [block]="true"
        >Mes inscriptions</a
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

  constructor() {
    inject(AgentHeader).use({ title: 'Inscription', back: '/agent/accueil' });
  }
}
