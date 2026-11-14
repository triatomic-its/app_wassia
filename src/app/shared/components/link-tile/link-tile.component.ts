import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight } from '@ng-icons/lucide';
import { cva } from 'class-variance-authority';

const tileClass = cva(
  'press flex min-h-16 items-center gap-3.5 rounded-card bg-surface px-4 py-3 text-[0.9375rem] font-semibold text-ink shadow-card hover:bg-surface-alt',
);

/** Coloured square behind the icon (mockup icon tiles). */
const iconClass = cva('flex size-[2.375rem] shrink-0 items-center justify-center rounded-tile', {
  variants: {
    tone: {
      info: 'bg-primary-soft text-primary',
      warning: 'bg-danger-soft text-danger',
      neutral: 'bg-sapin-soft text-sapin',
    },
  },
});

export type LinkTileTone = 'info' | 'warning' | 'neutral';

/**
 * Full-width shortcut ending with "Voir ›" (agent home):
 * `<app-link-tile link="/agent/inscriptions" tone="info" icon="lucideCreditCard">3 cartes</app-link-tile>`.
 * The leading icon must be registered by the host component.
 */
@Component({
  selector: 'app-link-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgIcon],
  providers: [provideIcons({ lucideChevronRight })],
  host: { class: 'block' },
  templateUrl: './link-tile.component.html',
})
export class LinkTile {
  readonly link = input.required<string>();
  readonly tone = input<LinkTileTone>('neutral');
  readonly icon = input<string>();
  readonly actionLabel = input('Voir');

  protected readonly classes = tileClass();
  protected readonly iconClasses = computed(() => iconClass({ tone: this.tone() }));
}
