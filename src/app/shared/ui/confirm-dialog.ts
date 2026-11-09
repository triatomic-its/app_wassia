import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { FR } from '../../core/i18n/fr';
import { ButtonDirective } from './button';
import { InputDirective } from './field';

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

/** Accessible confirmation dialog (CDK: focus trap, Escape, aria-modal). */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, InputDirective],
  host: {
    class: 'block w-[min(32rem,calc(100vw-2rem))] rounded-card bg-surface p-6 shadow-xl',
  },
  template: `
    <h2 id="confirm-title" class="text-xl font-bold">{{ data.title }}</h2>
    <p class="mt-2 text-ink-muted">{{ data.message }}</p>
    @if (data.reasonRequired) {
      <label for="confirm-reason" class="mt-4 block text-sm font-semibold">
        {{ data.reasonLabel ?? reasonLabel }} <span class="text-danger" aria-hidden="true">*</span>
      </label>
      <textarea
        id="confirm-reason"
        appInput
        rows="3"
        class="mt-1.5 py-3"
        [value]="reason()"
        (input)="reason.set($any($event.target).value)"
        aria-required="true"
      ></textarea>
    }
    <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button appButton variant="ghost" type="button" (click)="close(false)">
        {{ cancelLabel }}
      </button>
      <button
        appButton
        type="button"
        [variant]="data.danger ? 'danger' : 'primary'"
        [disabled]="data.reasonRequired && !reason().trim()"
        (click)="close(true)"
      >
        {{ data.confirmLabel ?? confirmLabel }}
      </button>
    </div>
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmOptions>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<ConfirmResult>>(DialogRef);
  protected readonly reason = signal('');
  protected readonly cancelLabel = FR.common.cancel;
  protected readonly confirmLabel = FR.common.confirm;
  protected readonly reasonLabel = FR.common.reasonRequired;

  protected close(confirmed: boolean): void {
    this.ref.close(
      confirmed ? { confirmed, reason: this.reason().trim() || undefined } : { confirmed },
    );
  }
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(Dialog);

  ask(options: ConfirmOptions): Observable<ConfirmResult> {
    const ref = this.dialog.open<ConfirmResult, ConfirmOptions>(ConfirmDialog, {
      data: options,
      ariaLabelledBy: 'confirm-title',
      backdropClass: ['bg-night/50'],
    });
    return ref.closed.pipe(map((result) => result ?? { confirmed: false }));
  }
}
