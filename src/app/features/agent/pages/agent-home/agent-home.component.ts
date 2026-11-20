import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBanknote,
  lucideChevronRight,
  lucideClock,
  lucideCreditCard,
  lucideUsers,
  lucideRoute,
  lucideScanLine,
  lucideTriangleAlert,
  lucideUserPlus,
} from '@ng-icons/lucide';
import { FcfaPipe } from '@shared/pipes/fcfa.pipe';
import { ErrorState } from '@shared/components/error-state/error-state.component';
import { LinkTile } from '@shared/components/link-tile/link-tile.component';
import { Skeleton } from '@shared/components/skeleton/skeleton.component';
import { AgentHeader } from '@layout/agent-header.service';
import { AgentHomeStore } from './agent-home.store';
import { PendingDeposits } from '../../components/pending-deposits/pending-deposits.component';

/** Agent home (mockup "Accueil du jour"): what to do now, in big buttons. */
@Component({
  selector: 'app-agent-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgIcon, FcfaPipe, ErrorState, LinkTile, Skeleton, PendingDeposits],
  providers: [
    AgentHomeStore,
    provideIcons({
      lucideScanLine,
      lucideUserPlus,
      lucideRoute,
      lucideTriangleAlert,
      lucideCreditCard,
      lucideClock,
      lucideChevronRight,
      lucideBanknote,
      lucideUsers,
    }),
  ],
  host: { class: 'flex flex-col gap-3.5' },
  templateUrl: './agent-home.component.html',
})
export class AgentHomePage {
  protected readonly store = inject(AgentHomeStore);

  constructor() {
    inject(AgentHeader).useHero();
  }
}
