import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TRADE_SUGGESTIONS } from '@core/config/enrollment.config';
import { EnrollmentErrors } from '@core/domain/enrollment';
import { Field } from '@shared/components/field/field.component';
import { InputDirective } from '@shared/directives/input.directive';
import { EnrollmentForm, PhotoField, UploadState } from '../../models/enrollment-form.model';
import { PhotoCapture } from '../photo-capture/photo-capture.component';

export interface PickedPhoto {
  field: PhotoField;
  file: File;
}

/** Step 2 — ID card and stall photos, ID number, trade. */
@Component({
  selector: 'app-documents-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Field, InputDirective, PhotoCapture],
  host: { class: 'contents' },
  templateUrl: './documents-step.component.html',
})
export class DocumentsStep {
  readonly form = input.required<EnrollmentForm>();
  readonly errors = input.required<EnrollmentErrors>();
  readonly photoUrls = input.required<Record<PhotoField, string>>();
  readonly uploads = input.required<Record<PhotoField, UploadState>>();
  readonly photoPicked = output<PickedPhoto>();

  protected readonly trades = TRADE_SUGGESTIONS;
}
