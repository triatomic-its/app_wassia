import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FR } from '@core/i18n/fr';

/** Width (%) of each placeholder bar: every third bar is shorter, like a paragraph end. */
function barWidths(lines: number): number[] {
  return Array.from({ length: lines }, (_, i) => (i % 3 === 2 ? 60 : 100 - i * 8));
}

/** Loading placeholder bars. */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3', 'aria-busy': 'true' },
  templateUrl: './skeleton.component.html',
})
export class Skeleton {
  readonly lines = input(3);
  protected readonly loadingLabel = FR.common.loading;
  protected readonly widths = computed(() => barWidths(this.lines()));
}
