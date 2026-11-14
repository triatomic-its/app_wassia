import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight } from '@ng-icons/lucide';
import { cva } from 'class-variance-authority';

const tileClass = cva('flex items-center gap-3 rounded-control p-3.5 text-sm', {
  variants: {
    tone: {
      info: 'min-h-14 bg-info-soft font-semibold text-info',
      warning: 'min-h-14 bg-warning-soft font-semibold text-warning',
      neutral: 'min-h-12 border border-border bg-surface text-ink-muted hover:border-primary',
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

  protected readonly classes = computed(() => tileClass({ tone: this.tone() }));
}
