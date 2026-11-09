import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideInbox, lucideRotateCcw } from '@ng-icons/lucide';
import { FR } from '../../core/i18n/fr';
import { ButtonDirective } from './button';

/** Empty list/screen: explains why it is empty and suggests an action (projected). */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideInbox })],
  host: { class: 'flex flex-col items-center gap-3 px-6 py-10 text-center' },
  template: `
    <span class="flex size-14 items-center justify-center rounded-full bg-info-soft text-info">
      <ng-icon [name]="icon()" size="28" aria-hidden="true" />
    </span>
    <p class="font-display text-lg font-bold text-primary">{{ title() }}</p>
    @if (text()) {
      <p class="max-w-sm text-ink-muted">{{ text() }}</p>
    }
    <ng-content />
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly text = input<string>();
  readonly icon = input('lucideInbox');
}

/** Error block with a "Réessayer" button. */
@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, ButtonDirective],
  providers: [provideIcons({ lucideCircleAlert, lucideRotateCcw })],
  host: { class: 'flex flex-col items-center gap-3 px-6 py-10 text-center', role: 'alert' },
  template: `
    <span class="flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
      <ng-icon name="lucideCircleAlert" size="28" aria-hidden="true" />
    </span>
    <p class="max-w-sm font-semibold text-ink">{{ message() }}</p>
    <button appButton variant="outline" type="button" (click)="retry.emit()">
      <ng-icon name="lucideRotateCcw" size="20" aria-hidden="true" />{{ retryLabel }}
    </button>
  `,
})
export class ErrorState {
  readonly message = input<string>(FR.common.errorGeneric);
  readonly retry = output<void>();
  protected readonly retryLabel = FR.common.retry;
}

/** Loading placeholder bars. */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3', 'aria-busy': 'true' },
  template: `
    <span class="sr-only">{{ loadingLabel }}</span>
    @for (line of linesArray(); track $index) {
      <span
        class="block h-4 animate-pulse rounded-control bg-neutral-soft"
        [style.width.%]="line"
      ></span>
    }
  `,
})
export class Skeleton {
  readonly lines = input(3);
  protected readonly loadingLabel = FR.common.loading;
  protected linesArray(): number[] {
    return Array.from({ length: this.lines() }, (_, i) => (i % 3 === 2 ? 60 : 100 - i * 8));
  }
}
