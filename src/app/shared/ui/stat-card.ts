import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cn } from './cn';

/** KPI tile from the mockup: small label, big Poppins value, optional hint. */
@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 rounded-card border border-border bg-surface px-5 py-4' },
  template: `
    <div class="text-sm text-ink-muted">{{ label() }}</div>
    <div [class]="valueClass()">{{ value() }}</div>
    @if (hint()) {
      <div class="mt-0.5 text-xs text-ink-muted">{{ hint() }}</div>
    }
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>();
  readonly tone = input<'default' | 'danger' | 'success'>('default');

  protected readonly valueClass = computed(() =>
    cn('mt-1.5 font-display text-2xl font-bold sm:text-[1.75rem]', {
      'text-primary': this.tone() === 'default',
      'text-danger': this.tone() === 'danger',
      'text-sapin': this.tone() === 'success',
    }),
  );
}
