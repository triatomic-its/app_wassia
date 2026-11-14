/**
 * Typed readers for native DOM events, so templates never need `$any($event.target)`.
 * They return a neutral value when the target is not a form control.
 */
export function eventValue(event: Event): string {
  const target = event.target;
  return target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
    ? target.value
    : '';
}

export function eventChecked(event: Event): boolean {
  return event.target instanceof HTMLInputElement && event.target.checked;
}
