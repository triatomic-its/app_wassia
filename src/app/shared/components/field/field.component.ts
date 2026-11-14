import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Label + control + hint/error. The projected control must carry `id` = `for`,
 * and `aria-describedby` = `{for}-msg` when a hint or error is shown.
 */
@Component({
  selector: 'app-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-1.5' },
  templateUrl: './field.component.html',
})
export class Field {
  readonly label = input.required<string>();
  readonly for = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string | null>();
  readonly required = input(false);
}
