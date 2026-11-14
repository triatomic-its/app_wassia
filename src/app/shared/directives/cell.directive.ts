import { Directive, TemplateRef, inject, input } from '@angular/core';

/** Custom data-table cell: `<ng-template appCell="status" let-row>…</ng-template>`. */
@Directive({ selector: 'ng-template[appCell]' })
export class CellDirective {
  readonly appCell = input.required<string>();
  readonly template = inject<TemplateRef<{ $implicit: unknown }>>(TemplateRef);
}
