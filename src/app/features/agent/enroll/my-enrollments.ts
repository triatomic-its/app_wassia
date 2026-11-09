import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronRight, lucideCreditCard, lucideUserPlus } from '@ng-icons/lucide';
import { DEFAULT_SETTINGS } from '../../../core/config/settings.defaults';
import { AgentHeader } from '../../../core/layout/agent-header';
import { Member } from '../../../core/models';
import { ClockService } from '../../../core/realtime/clock.service';
import { ButtonDirective } from '../../../shared/ui/button';
import { Panel } from '../../../shared/ui/page';
import { EmptyState, ErrorState, Skeleton } from '../../../shared/ui/states';
import { StatusChip } from '../../../shared/ui/status-chip';
import { AgentApi } from '../data/agent.api';

const HOUR = 3_600_000;

/** Agent's own pending enrollments: cards to associate, then payments still awaited. */
@Component({
  selector: 'app-my-enrollments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonDirective, Panel, EmptyState, ErrorState, Skeleton, StatusChip],
  providers: [provideIcons({ lucideCreditCard, lucideChevronRight, lucideUserPlus })],
  host: { class: 'flex flex-col gap-3.5' },
  template: `
    <div class="grid gap-3.5 md:grid-cols-2 md:items-start">
      <app-panel title="Cartes à associer">
        <span panel-aside class="text-sm text-ink-muted">Adhésion payée</span>
        @if (toAssign.error()) {
          <app-error-state (retry)="toAssign.reload()" />
        } @else if (toAssign.value(); as page) {
          @if (page.items.length === 0) {
            <app-empty-state
              title="Aucune carte à associer"
              text="Les marchands qui ont payé leurs 1 000 F apparaîtront ici."
              icon="lucideCreditCard"
            />
          } @else {
            <ul class="divide-y divide-border-soft">
              @for (m of page.items; track m.id) {
                <li class="flex items-center gap-3 px-4 py-3">
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-semibold">{{ m.fullName }}</span>
                    <span class="block text-sm text-ink-muted">{{ m.trade }} · {{ m.market }}</span>
                  </span>
                  <a
                    [routerLink]="['/agent/inscriptions', m.id, 'carte']"
                    appButton
                    variant="success"
                    class="min-h-11 px-3.5 text-sm"
                  >
                    Associer la carte
                  </a>
                </li>
              }
            </ul>
          }
        } @else {
          <div class="p-4"><app-skeleton [lines]="3" /></div>
        }
      </app-panel>

      <app-panel title="En attente du paiement">
        <span panel-aside class="text-sm text-ink-muted">1 000 F d'adhésion</span>
        @if (pending.error()) {
          <app-error-state (retry)="pending.reload()" />
        } @else if (pending.value(); as page) {
          @if (page.items.length === 0) {
            <app-empty-state
              title="Aucun paiement en attente"
              text="Tous vos marchands ont payé leur adhésion."
            >
              <a routerLink="/agent/inscrire" appButton variant="outline">Inscrire un marchand</a>
            </app-empty-state>
          } @else {
            <ul class="divide-y divide-border-soft">
              @for (m of page.items; track m.id) {
                <li class="flex items-center gap-3 px-4 py-3">
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-semibold">{{ m.fullName }}</span>
                    <span class="block text-sm text-ink-muted">Compte créé {{ since(m) }}</span>
                  </span>
                  @if (isLate(m)) {
                    <app-status-chip label="Rappel conseillé" tone="warning" />
                  } @else {
                    <app-status-chip label="Paiement en attente" tone="info" />
                  }
                </li>
              }
            </ul>
          }
        } @else {
          <div class="p-4"><app-skeleton [lines]="3" /></div>
        }
      </app-panel>
    </div>
  `,
})
export class MyEnrollments {
  private readonly api = inject(AgentApi);
  private readonly clock = inject(ClockService);
  protected readonly toAssign = rxResource({ stream: () => this.api.myMembers('CARD_TO_ASSIGN') });
  protected readonly pending = rxResource({ stream: () => this.api.myMembers('PAYMENT_PENDING') });
  private readonly reminderMs = computed(() => DEFAULT_SETTINGS.paymentReminderHours * HOUR);

  constructor() {
    inject(AgentHeader).use({ title: 'Mes inscriptions', back: '/agent/accueil' });
  }

  protected isLate(m: Member): boolean {
    return this.clock.now().getTime() - Date.parse(m.createdAt) > this.reminderMs();
  }

  protected since(m: Member): string {
    const hours = Math.floor((this.clock.now().getTime() - Date.parse(m.createdAt)) / HOUR);
    if (hours < 1) return "à l'instant";
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'hier' : `il y a ${days} jours`;
  }
}
