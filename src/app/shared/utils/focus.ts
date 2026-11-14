import { Injector, afterNextRender } from '@angular/core';

/** After the next render, moves the keyboard focus to the first invalid field inside `host`. */
export function focusFirstInvalid(host: HTMLElement, injector: Injector): void {
  afterNextRender(() => host.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), {
    injector,
  });
}
