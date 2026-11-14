import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideCircleCheck, lucideLoaderCircle } from '@ng-icons/lucide';
import { PhoneCheckState } from '../../models/phone-check.model';

/** One-line result of the duplicate-phone check, under the phone field. */
@Component({
  selector: 'app-phone-check-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideCircleAlert, lucideCircleCheck, lucideLoaderCircle })],
  host: { class: 'block', 'aria-live': 'polite' },
  templateUrl: './phone-check-status.component.html',
})
export class PhoneCheckStatus {
  readonly check = input.required<PhoneCheckState>();

  protected readonly takenName = computed(() => {
    const check = this.check();
    return check.state === 'taken' ? check.name : '';
  });

  protected readonly errorMessage = computed(() => {
    const check = this.check();
    return check.state === 'error' ? check.message : '';
  });
}
