import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cn } from '../../utils/cn';

/** KPI tile from the mockup: small label, big Poppins value, optional hint. */
@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-w-0 rounded-card border border-border bg-surface',
    '[class.px-5]': '!compact()',
    '[class.py-4]': '!compact()',
    '[class.p-3.5]': 'compact()',
  },
  templateUrl: './stat-card.component.html',
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>();
  readonly tone = input<'default' | 'danger' | 'success'>('default');
  /** Smaller tile for phone screens (agent home). */
  readonly compact = input(false);

  protected readonly valueClass = computed(() =>
    cn(
      'font-display font-bold',
      this.compact() ? 'mt-1 text-[1.375rem]' : 'mt-1.5 text-2xl sm:text-[1.75rem]',
      {
        'text-primary': this.tone() === 'default',
        'text-danger': this.tone() === 'danger',
        'text-sapin': this.tone() === 'success',
      },
    ),
  );
}
