import { ChangeDetectionStrategy, Component, Directive, input } from '@angular/core';

/** Base style for native inputs/selects/textareas: `<input appInput>`. */
@Directive({
  selector: 'input[appInput], select[appInput], textarea[appInput]',
  host: {
    class:
      'block w-full min-h-12 rounded-control border border-border bg-surface px-4 text-base text-ink ' +
      'placeholder:text-ink-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ' +
      'aria-[invalid=true]:border-danger disabled:bg-surface-alt disabled:text-ink-muted',
  },
})
export class InputDirective {}

/**
 * Label + control + hint/error. The projected control must carry `id` = `for`,
 * and `aria-describedby` = `{for}-msg` when a hint or error is shown.
 */
@Component({
  selector: 'app-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-1.5' },
  template: `
    <label [attr.for]="for()" class="text-sm font-semibold text-ink">
      {{ label() }}
      @if (required()) {
        <span class="text-danger" aria-hidden="true">*</span>
      }
    </label>
    <ng-content />
    @if (error()) {
      <p [id]="for() + '-msg'" class="text-sm font-semibold text-danger" role="alert">
        {{ error() }}
      </p>
    } @else if (hint()) {
      <p [id]="for() + '-msg'" class="text-sm text-ink-muted">{{ hint() }}</p>
    }
  `,
})
export class Field {
  readonly label = input.required<string>();
  readonly for = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string | null>();
  readonly required = input(false);
}
