import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight, lucideScanQrCode, lucideSearch } from '@ng-icons/lucide';
import { NetworkStatus } from '@core/services/network-status.service';
import { AgentHeader } from '@layout/agent-header.service';
import { EmptyState } from '@shared/components/empty-state/empty-state.component';
import { ErrorState } from '@shared/components/error-state/error-state.component';
import { Skeleton } from '@shared/components/skeleton/skeleton.component';
import { ButtonDirective } from '@shared/directives/button.directive';
import { AbidjanDatePipe } from '@shared/pipes/abidjan-date.pipe';
import { FcfaPipe } from '@shared/pipes/fcfa.pipe';
import { eventValue } from '@shared/utils/dom-events';
import { RoundFilter } from '../../models/round.model';
import { PendingDeposits } from '../../components/pending-deposits/pending-deposits.component';
import { RoundStore } from './round.store';

const OFFLINE_MESSAGE =
  'Pas de réseau : la tournée se charge avec la connexion. Vous pouvez quand même scanner les cartes.';

/** "Tournée du jour" (mockup): the agent's merchants, who has paid today, who is left. */
@Component({
  selector: 'app-round-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgIcon,
    EmptyState,
    ErrorState,
    Skeleton,
    ButtonDirective,
    AbidjanDatePipe,
    FcfaPipe,
    PendingDeposits,
  ],
  providers: [RoundStore, provideIcons({ lucideChevronRight, lucideScanQrCode, lucideSearch })],
  host: { class: 'flex flex-col gap-3.5 md:mx-auto md:w-full md:max-w-2xl' },
  templateUrl: './round.component.html',
})
export class RoundPage {
  protected readonly store = inject(RoundStore);
  protected readonly online = inject(NetworkStatus).online;
  protected readonly offlineMessage = OFFLINE_MESSAGE;
  protected readonly filters: readonly { value: RoundFilter; label: string }[] = [
    { value: 'all', label: 'Tous' },
    { value: 'todo', label: 'À passer' },
    { value: 'paid', label: 'Versé' },
  ];

  constructor() {
    inject(AgentHeader).use({ title: 'Tournée du jour' });
  }

  protected setSearch(event: Event): void {
    this.store.search.set(eventValue(event));
  }

  /** "MT" for "Mariam TRAORÉ". */
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }
}
