import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  computed,
  inject,
} from '@angular/core';
import { AgentHeader } from '@layout/agent-header.service';
import { Alert } from '@shared/components/alert/alert.component';
import { ErrorState } from '@shared/components/error-state/error-state.component';
import { Skeleton } from '@shared/components/skeleton/skeleton.component';
import { ButtonDirective } from '@shared/directives/button.directive';
import { focusFirstInvalid } from '@shared/utils/focus';
import { EnrollmentStore } from './enroll.store';
import { ENROLLMENT_STEPS } from './enroll-steps';
import {
  DocumentsStep,
  PickedPhoto,
} from '../../components/documents-step/documents-step.component';
import { IdentityStep } from '../../components/identity-step/identity-step.component';
import { PaymentStep } from '../../components/payment-step/payment-step.component';
import { StepBars } from '../../components/step-bars/step-bars.component';

/**
 * "Inscrire un marchand" (client rule, 2026-11-10): registered only once the fee is received
 * on the spot; the QR card is scanned on the next screen. All state lives in `EnrollmentStore`.
 */
@Component({
  selector: 'app-enroll-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonDirective,
    Alert,
    ErrorState,
    Skeleton,
    StepBars,
    IdentityStep,
    DocumentsStep,
    PaymentStep,
  ],
  providers: [EnrollmentStore],
  host: { class: 'flex flex-col gap-3.5 md:mx-auto md:w-full md:max-w-xl' },
  templateUrl: './enroll.component.html',
})
export class EnrollPage {
  protected readonly store = inject(EnrollmentStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly steps = ENROLLMENT_STEPS;
  protected readonly stepTitle = computed(() => ENROLLMENT_STEPS[this.store.step()]);
  protected readonly stepCounter = computed(
    () => `Étape ${this.store.step() + 1} sur ${ENROLLMENT_STEPS.length}`,
  );

  constructor() {
    inject(AgentHeader).use({ title: 'Inscrire un marchand', onBack: () => this.store.back() });
  }

  protected continueToNextStep(): void {
    if (!this.store.next()) focusFirstInvalid(this.host.nativeElement, this.injector);
  }

  protected uploadPhoto(photo: PickedPhoto): void {
    this.store.uploadPhoto(photo.field, photo.file);
  }
}
