import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';

export interface Step {
  label: string;
  /** Who acts or what happens, e.g. "Comptage à 16 h 30 · en cours". */
  detail?: string;
}

/**
 * Numbered progress steps (enrollment wizard, 3-level cash closure).
 * Horizontal from `md`, vertical on phones.
 */
@Component({
  selector: 'app-steps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideCheck })],
  template: `
    <ol class="flex flex-col gap-3 md:flex-row md:gap-4">
      @for (step of steps(); track step.label; let i = $index) {
        <li
          class="flex min-w-0 flex-1 items-center gap-3 rounded-card border bg-surface px-4 py-3"
          [class.border-primary]="i === current()"
          [class.border-border]="i !== current()"
          [attr.aria-current]="i === current() ? 'step' : null"
        >
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold"
            [class]="
              i < current()
                ? 'bg-sapin text-white'
                : i === current()
                  ? 'bg-primary text-white'
                  : 'bg-neutral-soft text-ink-muted'
            "
          >
            @if (i < current()) {
              <ng-icon name="lucideCheck" size="18" aria-hidden="true" />
              <span class="sr-only">Terminé :</span>
            } @else {
              {{ i + 1 }}
            }
          </span>
          <span class="min-w-0">
            <span class="block font-semibold text-ink">{{ step.label }}</span>
            @if (step.detail) {
              <span class="block truncate text-sm text-ink-muted">{{ step.detail }}</span>
            }
          </span>
        </li>
      }
    </ol>
  `,
})
export class Steps {
  readonly steps = input.required<readonly Step[]>();
  /** 0-based index of the current step; steps before it are done. */
  readonly current = input(0);
}
