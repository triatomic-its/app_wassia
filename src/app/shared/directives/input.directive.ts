import { Directive } from '@angular/core';

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
