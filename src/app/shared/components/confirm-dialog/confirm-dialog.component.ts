import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FR } from '@core/i18n/fr';
import { ButtonDirective } from '../../directives/button.directive';
import { eventValue } from '../../utils/dom-events';
import { InputDirective } from '../../directives/input.directive';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  /** Irreversible or negative actions get a red button. */
  danger?: boolean;
  /** Ask for a mandatory written reason (rejection, variance, reversal…). */
  reasonRequired?: boolean;
  reasonLabel?: string;
}

export interface ConfirmResult {
  confirmed: boolean;
  reason?: string;
}

/** Accessible confirmation dialog (CDK: focus trap, Escape, aria-modal). Opened by `ConfirmService`. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, InputDirective],
  host: {
    class: 'block w-[min(32rem,calc(100vw-2rem))] rounded-card bg-surface p-6 shadow-xl',
  },
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmOptions>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<ConfirmResult>>(DialogRef);
  protected readonly reason = signal('');
  protected readonly isConfirmBlocked = computed(
    () => this.data.reasonRequired === true && !this.reason().trim(),
  );
  protected readonly cancelLabel = FR.common.cancel;
  protected readonly confirmLabel = FR.common.confirm;
  protected readonly reasonLabel = FR.common.reasonRequired;

  protected updateReason(event: Event): void {
    this.reason.set(eventValue(event));
  }

  protected close(confirmed: boolean): void {
    this.ref.close(
      confirmed ? { confirmed, reason: this.reason().trim() || undefined } : { confirmed },
    );
  }
}
