import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MARKETS } from '@core/config/enrollment.config';
import { EnrollmentErrors } from '@core/domain/enrollment';
import { Field } from '@shared/components/field/field.component';
import { InputDirective } from '@shared/directives/input.directive';
import { PhoneCheckState } from '../../models/phone-check.model';
import { EnrollmentForm } from '../../models/enrollment-form.model';
import { PhoneCheckStatus } from '../phone-check-status/phone-check-status.component';

/** Step 1 — name, phone (checked for duplicates when the field is left), market, stall. */
@Component({
  selector: 'app-identity-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Field, InputDirective, PhoneCheckStatus],
  host: { class: 'contents' },
  templateUrl: './identity-step.component.html',
})
export class IdentityStep {
  readonly form = input.required<EnrollmentForm>();
  readonly errors = input.required<EnrollmentErrors>();
  readonly phoneCheck = input.required<PhoneCheckState>();
  readonly phoneLeft = output<void>();

  protected readonly markets = MARKETS;
}
