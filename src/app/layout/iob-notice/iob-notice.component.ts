import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FR } from '@core/i18n/fr';

/** IOB legal notice — required in the footer and on printed documents. */
@Component({
  selector: 'app-iob-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block text-xs leading-relaxed text-ink-muted' },
  templateUrl: './iob-notice.component.html',
})
export class IobNotice {
  protected readonly text = FR.app.iobNotice;
}
