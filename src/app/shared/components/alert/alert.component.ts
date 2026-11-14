import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { cva } from 'class-variance-authority';
import { Tone } from '@core/models';

const alertClass = cva('flex items-start gap-3 rounded-control p-3.5 text-sm leading-normal', {
  variants: {
    tone: {
      success: 'bg-success-soft text-success',
      danger: 'bg-danger-soft font-semibold text-danger',
      warning: 'bg-warning-soft text-warning',
      info: 'bg-info-soft text-info',
      neutral: 'bg-neutral-soft text-ink',
    },
  },
});

/**
 * Inline message box: `<app-alert tone="danger" icon="lucideCircleAlert">…</app-alert>`.
 * Errors are announced (`role="alert"`); other tones are polite (`role="status"`) unless
 * `announce` is false. The icon must be registered by the host component.
 */
@Component({
  selector: 'app-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  host: { '[class]': 'classes()', '[attr.role]': 'role()' },
  templateUrl: './alert.component.html',
})
export class Alert {
  readonly tone = input<Tone>('info');
  readonly icon = input<string>();
  /** Set to false for static explanations that should not be read out when they appear. */
  readonly announce = input(true);

  protected readonly classes = computed(() => alertClass({ tone: this.tone() }));
  protected readonly role = computed(() => {
    if (!this.announce()) return null;
    return this.tone() === 'danger' ? 'alert' : 'status';
  });
}
