import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** White card section with an optional title bar (mockup panels). */
@Component({
  selector: 'app-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 overflow-hidden rounded-card bg-surface shadow-card' },
  templateUrl: './panel.component.html',
})
export class Panel {
  readonly title = input<string>();
}
