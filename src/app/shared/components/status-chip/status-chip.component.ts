import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cva } from 'class-variance-authority';
import { Tone } from '@core/models';

export type { Tone } from '@core/models';

const chip = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-1 text-xs font-bold leading-snug',
  {
    variants: {
      tone: {
        success: 'bg-success-soft text-success',
        danger: 'bg-danger-soft text-danger',
        warning: 'bg-warning-soft text-warning',
        info: 'bg-info-soft text-info',
        neutral: 'bg-neutral-soft text-neutral',
      },
    },
  },
);

const dot = cva('size-2 shrink-0 rounded-full', {
  variants: {
    tone: {
      success: 'bg-success',
      danger: 'bg-danger',
      warning: 'bg-warning',
      info: 'bg-info',
      neutral: 'bg-neutral',
    },
  },
});

/** Status = colour dot + text, never colour alone. */
@Component({
  selector: 'app-status-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-chip.component.html',
})
export class StatusChip {
  readonly label = input.required<string>();
  readonly tone = input<Tone>('neutral');

  protected readonly chipClass = computed(() => chip({ tone: this.tone() }));
  protected readonly dotClass = computed(() => dot({ tone: this.tone() }));
}
