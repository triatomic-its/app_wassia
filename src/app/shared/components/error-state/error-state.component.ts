import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideRotateCcw } from '@ng-icons/lucide';
import { FR } from '@core/i18n/fr';
import { ButtonDirective } from '../../directives/button.directive';

/** Error block with a "Réessayer" button. */
@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, ButtonDirective],
  providers: [provideIcons({ lucideCircleAlert, lucideRotateCcw })],
  host: { class: 'flex flex-col items-center gap-3 px-6 py-10 text-center', role: 'alert' },
  templateUrl: './error-state.component.html',
})
export class ErrorState {
  readonly message = input<string>(FR.common.errorGeneric);
  readonly retry = output<void>();
  protected readonly retryLabel = FR.common.retry;
}
