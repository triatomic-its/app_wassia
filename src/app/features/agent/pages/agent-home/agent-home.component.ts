import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCreditCard,
  lucideRoute,
  lucideScanLine,
  lucideTriangleAlert,
  lucideUserPlus,
} from '@ng-icons/lucide';
import { FcfaPipe } from '@shared/pipes/fcfa.pipe';
import { ButtonDirective } from '@shared/directives/button.directive';
import { ErrorState } from '@shared/components/error-state/error-state.component';
import { LinkTile } from '@shared/components/link-tile/link-tile.component';
import { Skeleton } from '@shared/components/skeleton/skeleton.component';
import { StatCard } from '@shared/components/stat-card/stat-card.component';
import { AgentHomeStore } from './agent-home.store';

/** Agent home (mockup "Accueil du jour"): what to do now, in big buttons. */
@Component({
  selector: 'app-agent-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgIcon,
    FcfaPipe,
    ButtonDirective,
    ErrorState,
    LinkTile,
    Skeleton,
    StatCard,
  ],
  providers: [
    AgentHomeStore,
    provideIcons({
      lucideScanLine,
      lucideUserPlus,
      lucideRoute,
      lucideTriangleAlert,
      lucideCreditCard,
    }),
  ],
  host: { class: 'flex flex-col gap-3.5' },
  templateUrl: './agent-home.component.html',
})
export class AgentHomePage {
  protected readonly store = inject(AgentHomeStore);
}
