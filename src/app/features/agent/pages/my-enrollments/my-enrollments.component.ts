import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCreditCard, lucideUser, lucideUserPlus } from '@ng-icons/lucide';
import { MEMBER_STATUS_DISPLAY } from '@core/config/member-status.config';
import { AgentHeader } from '@layout/agent-header.service';
import { TimeAgoPipe } from '@shared/pipes/time-ago.pipe';
import { ButtonDirective } from '@shared/directives/button.directive';
import { EmptyState } from '@shared/components/empty-state/empty-state.component';
import { ErrorState } from '@shared/components/error-state/error-state.component';
import { Panel } from '@shared/components/panel/panel.component';
import { Skeleton } from '@shared/components/skeleton/skeleton.component';
import { StatusChip } from '@shared/components/status-chip/status-chip.component';
import { MyEnrollmentsStore } from './my-enrollments.store';

/** The agent's merchants: first those (paid) still waiting for a card, then everyone. */
@Component({
  selector: 'app-my-enrollments-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgIcon,
    TimeAgoPipe,
    ButtonDirective,
    EmptyState,
    ErrorState,
    Panel,
    Skeleton,
    StatusChip,
  ],
  providers: [MyEnrollmentsStore, provideIcons({ lucideUserPlus, lucideCreditCard, lucideUser })],
  host: { class: 'flex flex-col gap-3.5 md:mx-auto md:w-full md:max-w-2xl' },
  templateUrl: './my-enrollments.component.html',
})
export class MyEnrollmentsPage {
  protected readonly store = inject(MyEnrollmentsStore);
  protected readonly statusDisplay = MEMBER_STATUS_DISPLAY;

  constructor() {
    inject(AgentHeader).use({ title: 'Mes inscriptions', back: '/agent/accueil' });
  }
}
