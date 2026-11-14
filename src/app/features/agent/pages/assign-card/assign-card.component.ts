import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideCircleAlert,
  lucideCircleCheck,
  lucideCreditCard,
  lucideMessageSquareText,
} from '@ng-icons/lucide';
import { AgentHeader } from '@layout/agent-header.service';
import { FcfaPipe } from '@shared/pipes/fcfa.pipe';
import { Alert } from '@shared/components/alert/alert.component';
import { ButtonDirective } from '@shared/directives/button.directive';
import { CardScan } from '@shared/components/card-scan/card-scan.component';
import { ErrorState } from '@shared/components/error-state/error-state.component';
import { Skeleton } from '@shared/components/skeleton/skeleton.component';
import { AssignCardStore } from './assign-card.store';
import { StepBars } from '../../components/step-bars/step-bars.component';

/** "Associer la carte": right after registration, or later from "Mes inscriptions". */
@Component({
  selector: 'app-assign-card-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgIcon,
    FcfaPipe,
    Alert,
    ButtonDirective,
    CardScan,
    ErrorState,
    Skeleton,
    StepBars,
  ],
  providers: [
    AssignCardStore,
    provideIcons({
      lucideCircleCheck,
      lucideCircleAlert,
      lucideCreditCard,
      lucideMessageSquareText,
      lucideCheck,
    }),
  ],
  host: { class: 'flex flex-col gap-3.5 md:mx-auto md:w-full md:max-w-xl' },
  templateUrl: './assign-card.component.html',
})
export class AssignCardPage {
  protected readonly store = inject(AssignCardStore);

  constructor() {
    inject(AgentHeader).use({ title: 'Associer la carte', back: '/agent/inscriptions' });
  }
}
