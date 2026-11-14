import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Screen title + subtitle; actions/badges are projected on the right (stacked on phones). */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4' },
  templateUrl: './page-header.component.html',
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
