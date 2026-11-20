import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ID_TYPE_OPTIONS } from '@core/config/enrollment.config';
import { EnrollmentErrors } from '@core/domain/enrollment';
import { ChoiceOption } from '@core/models';
import { Field } from '@shared/components/field/field.component';
import { InputDirective } from '@shared/directives/input.directive';
import { EnrollmentForm, PhotoField, UploadState } from '../../models/enrollment-form.model';
import { PhotoCapture } from '../photo-capture/photo-capture.component';

export interface PickedPhoto {
  field: PhotoField;
  file: File;
}

/** Step 2 — ID document (type, number, photo), stall photo, sector of activity. */
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
  readonly sectors = input.required<readonly ChoiceOption[]>();
  readonly photoUrls = input.required<Record<PhotoField, string>>();
  readonly uploads = input.required<Record<PhotoField, UploadState>>();
  readonly photoPicked = output<PickedPhoto>();

  protected readonly idTypes = ID_TYPE_OPTIONS;
}
