import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SAVINGS_FREQUENCY_OPTIONS } from '@core/config/enrollment.config';
import { EnrollmentErrors } from '@core/domain/enrollment';
import { Fcfa } from '@core/models';
import { Field } from '@shared/components/field/field.component';
import { InputDirective } from '@shared/directives/input.directive';
import { FcfaPipe } from '@shared/pipes/fcfa.pipe';
import { EnrollmentForm } from '../../models/enrollment-form.model';

/** Step 3 — the trusted person (`Referent`) and the savings commitment (`Engagement`). */
@Component({
  selector: 'app-commitment-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Field, InputDirective, FcfaPipe],
  host: { class: 'contents' },
  templateUrl: './commitment-step.component.html',
})
export class CommitmentStep {
  readonly form = input.required<EnrollmentForm>();
  readonly errors = input.required<EnrollmentErrors>();
  readonly minimumSavings = input.required<Fcfa>();

  protected readonly frequencies = SAVINGS_FREQUENCY_OPTIONS;
}
