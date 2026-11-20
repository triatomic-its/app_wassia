import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCircleCheck, lucideCreditCard } from '@ng-icons/lucide';
import { MEMBER_STATUS_DISPLAY } from '@core/config/member-status.config';
import { AgentHeader } from '@layout/agent-header.service';
import { Alert } from '@shared/components/alert/alert.component';
import { CardScan } from '@shared/components/card-scan/card-scan.component';
import { Field } from '@shared/components/field/field.component';
import { Skeleton } from '@shared/components/skeleton/skeleton.component';
import { StatusChip } from '@shared/components/status-chip/status-chip.component';
import { ButtonDirective } from '@shared/directives/button.directive';
import { InputDirective } from '@shared/directives/input.directive';
import { AbidjanDatePipe } from '@shared/pipes/abidjan-date.pipe';
import { FcfaPipe } from '@shared/pipes/fcfa.pipe';
import { CollectStore } from './collect.store';
import { PendingDeposits } from '../../components/pending-deposits/pending-deposits.component';

/** "Scanner et encaisser" then "Versement enregistré" (mockup). State lives in `CollectStore`. */
@Component({
  selector: 'app-collect-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NgIcon,
    Alert,
    CardScan,
    Field,
    Skeleton,
    StatusChip,
    ButtonDirective,
    InputDirective,
    AbidjanDatePipe,
    FcfaPipe,
    PendingDeposits,
  ],
  providers: [CollectStore, provideIcons({ lucideCheck, lucideCircleCheck, lucideCreditCard })],
  host: { class: 'flex flex-col gap-3.5 md:mx-auto md:w-full md:max-w-xl' },
  templateUrl: './collect.component.html',
})
export class CollectPage {
  protected readonly store = inject(CollectStore);
  protected readonly statusDisplay = MEMBER_STATUS_DISPLAY;
  protected readonly channels = [
    { value: 'CASH', label: 'Espèces' },
    { value: 'WAVE', label: 'Wave' },
  ] as const;

  constructor() {
    inject(AgentHeader).use({ title: 'Scanner et encaisser', back: '/agent/accueil' });
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
