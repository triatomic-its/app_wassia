import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideUserPlus } from '@ng-icons/lucide';
import { AgentHeader } from '../../../core/layout/agent-header';
import { Member } from '../../../core/models';
import { ClockService } from '../../../core/realtime/clock.service';
import { ButtonDirective } from '../../../shared/ui/button';
import { Panel } from '../../../shared/ui/page';
import { EmptyState, ErrorState, Skeleton } from '../../../shared/ui/states';
import { StatusChip } from '../../../shared/ui/status-chip';
import { AgentApi } from '../data/agent.api';

const HOUR = 3_600_000;

/** The merchants this agent registered, newest first (all paid and holding a card). */
@Component({
  selector: 'app-my-enrollments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonDirective, Panel, EmptyState, ErrorState, Skeleton, StatusChip],
  providers: [provideIcons({ lucideUserPlus })],
  host: { class: 'flex flex-col gap-3.5 md:mx-auto md:w-full md:max-w-2xl' },
  template: `
    <a routerLink="/agent/inscrire" appButton variant="success" [block]="true"
      >Inscrire un marchand</a
    >
    <app-panel title="Mes marchands">
      @if (members.value(); as page) {
        <span panel-aside class="text-sm text-ink-muted">{{ page.total }} au total</span>
      }
      @if (members.error()) {
        <app-error-state (retry)="members.reload()" />
      } @else if (members.value(); as page) {
        @if (page.items.length === 0) {
          <app-empty-state
            title="Aucun marchand inscrit"
            text="Les marchands que vous inscrivez apparaîtront ici."
            icon="lucideUserPlus"
          />
        } @else {
          <ul class="divide-y divide-border-soft">
            @for (m of page.items; track m.id) {
              <li class="flex items-center gap-3 px-4 py-3">
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold">{{ m.fullName }}</span>
                  <span class="block text-sm text-ink-muted"
                    >{{ m.trade }} · inscrit {{ since(m) }}</span
                  >
                </span>
                @if (m.status === 'SUSPENDED') {
                  <app-status-chip label="Épargne bloquée" tone="danger" />
                } @else {
                  <app-status-chip label="Actif" tone="success" />
                }
              </li>
            }
          </ul>
        }
      } @else {
        <div class="p-4"><app-skeleton [lines]="4" /></div>
      }
    </app-panel>
  `,
})
export class MyEnrollments {
  private readonly api = inject(AgentApi);
  private readonly clock = inject(ClockService);
  protected readonly members = rxResource({ stream: () => this.api.myMembers() });

  constructor() {
    inject(AgentHeader).use({ title: 'Mes inscriptions', back: '/agent/accueil' });
  }

  protected since(m: Member): string {
    const hours = Math.floor((this.clock.now().getTime() - Date.parse(m.createdAt)) / HOUR);
    if (hours < 1) return "à l'instant";
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'hier' : `il y a ${days} jours`;
  }
}
