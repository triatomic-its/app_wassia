import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Thin progress bars of the agent flows (mockup). Done steps are green; the current one is
 * green too, or navy when `currentTone` is `primary` (last step, after the registration).
 */
@Component({
  selector: 'app-step-bars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex gap-1.5' },
  templateUrl: './step-bars.component.html',
})
export class StepBars {
  readonly count = input.required<number>();
  /** 0-based index of the current step. */
  readonly current = input.required<number>();
  readonly currentTone = input<'sapin' | 'primary'>('sapin');

  protected readonly bars = computed(() =>
    Array.from({ length: this.count() }, (_, i) => {
      if (i < this.current()) return 'bg-sapin';
      if (i > this.current()) return 'bg-border-soft';
      return this.currentTone() === 'primary' ? 'bg-night' : 'bg-sapin';
    }),
  );
}
