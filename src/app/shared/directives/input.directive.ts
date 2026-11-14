import { Directive } from '@angular/core';

/** Base style for native inputs/selects/textareas: `<input appInput>`. */
@Directive({
  selector: 'input[appInput], select[appInput], textarea[appInput]',
  host: {
    class:
      'block w-full min-h-[3.375rem] rounded-control border-[1.5px] border-border bg-surface px-4 text-base text-ink ' +
      'placeholder:text-ink-faint focus:border-sapin focus:outline-none focus:ring-[3px] focus:ring-sapin/15 ' +
      'aria-[invalid=true]:border-danger disabled:bg-surface-alt disabled:text-ink-muted',
  },
})
export class InputDirective {}
