import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { EnrollmentErrors } from '@core/domain/enrollment';
import { ChoiceOption } from '@core/models';
import { Field } from '@shared/components/field/field.component';
import { InputDirective } from '@shared/directives/input.directive';
import { PhoneCheckState } from '../../models/phone-check.model';
import { EnrollmentForm } from '../../models/enrollment-form.model';
import { PhoneCheckStatus } from '../phone-check-status/phone-check-status.component';

/** Step 1 — last name, first names, phone (checked when the field is left), market, stall. */
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
  readonly markets = input.required<readonly ChoiceOption[]>();
  readonly phoneLeft = output<void>();
}
