import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBanknote, lucideSmartphone } from '@ng-icons/lucide';
import { MEMBERSHIP_CHANNEL_OPTIONS } from '@core/config/enrollment.config';
import { EnrollmentErrors, MembershipChannel } from '@core/domain/enrollment';
import { formatFcfa } from '@core/i18n/format/fcfa';
import { Fcfa } from '@core/models';
import { FcfaPipe } from '@shared/pipes/fcfa.pipe';
import { Alert } from '@shared/components/alert/alert.component';
import { Field } from '@shared/components/field/field.component';
import { InputDirective } from '@shared/directives/input.directive';
import { EnrollmentForm } from '../../models/enrollment-form.model';

/** Step 3 — the membership fee, paid now in cash or by Wave, confirmed by the agent. */
@Component({
  selector: 'app-payment-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, FcfaPipe, Alert, Field, InputDirective],
  providers: [provideIcons({ lucideBanknote, lucideSmartphone })],
  host: { class: 'contents' },
  templateUrl: './payment-step.component.html',
})
export class PaymentStep {
  readonly form = input.required<EnrollmentForm>();
  readonly errors = input.required<EnrollmentErrors>();
  readonly fee = input.required<Fcfa>();
  readonly channel = input.required<MembershipChannel | null>();

  protected readonly channels = MEMBERSHIP_CHANNEL_OPTIONS;
  protected readonly confirmationLabel = computed(() =>
    this.channel() === 'CASH'
      ? `J’ai reçu ${formatFcfa(this.fee())} en espèces`
      : 'J’ai vu la confirmation du paiement Wave',
  );
}
