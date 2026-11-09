import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  TemplateRef,
  computed,
  contentChildren,
  inject,
  input,
  output,
} from '@angular/core';

export interface Column<T> {
  key: string;
  label: string;
  align?: 'start' | 'end';
  /** Plain text value; ignored when an `appCell` template exists for this key. */
  value?: (row: T) => string | number;
  /** Shown as the title line of the mobile card. */
  primary?: boolean;
  /** Hidden in the mobile card layout. */
  hideOnMobile?: boolean;
}

/** Custom cell template: `<ng-template appCell="status" let-row>…</ng-template>`. */
@Directive({ selector: 'ng-template[appCell]' })
export class CellDirective {
  readonly appCell = input.required<string>();
  readonly template = inject<TemplateRef<{ $implicit: unknown }>>(TemplateRef);
}

/**
 * Responsive table: a real `<table>` from `md`, stacked cards below.
 * Server-side pagination is handled by the parent (lists > 50 rows).
 */
@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  host: { class: 'block' },
  template: `
    <!-- Desktop / tablet -->
    <table class="hidden w-full text-sm md:table">
      @if (caption()) {
        <caption class="sr-only">
          {{
            caption()
          }}
        </caption>
      }
      <thead>
        <tr class="bg-surface-alt text-left text-xs text-ink-muted">
          @for (col of columns(); track col.key) {
            <th
              scope="col"
              class="px-3 py-2.5 font-semibold first:pl-5 last:pr-5"
              [class.text-right]="col.align === 'end'"
            >
              {{ col.label }}
            </th>
          }
          @if (selectable()) {
            <th scope="col" class="pr-5"><span class="sr-only">Action</span></th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track trackBy()(row)) {
          <tr
            class="border-t border-border-soft"
            [class.bg-info-soft]="selectedKey() !== undefined && trackBy()(row) === selectedKey()"
          >
            @for (col of columns(); track col.key) {
              <td
                class="px-3 py-3 first:pl-5 first:font-semibold last:pr-5"
                [class.text-right]="col.align === 'end'"
              >
                <ng-container
                  [ngTemplateOutlet]="cellTpl"
                  [ngTemplateOutletContext]="{ row, col }"
                />
              </td>
            }
            @if (selectable()) {
              <td class="py-2 pr-5 text-right">
                <button
                  type="button"
                  class="min-h-10 rounded-control px-3 font-semibold text-primary hover:bg-info-soft"
                  (click)="rowSelect.emit(row)"
                >
                  {{ selectLabel() }}
                </button>
              </td>
            }
          </tr>
        }
      </tbody>
    </table>

    <!-- Phone: one card per row -->
    <ul class="flex flex-col gap-2 p-3 md:hidden">
      @for (row of rows(); track trackBy()(row)) {
        <li>
          <div
            class="rounded-control border border-border-soft bg-surface p-4"
            [class.ring-2]="selectedKey() !== undefined && trackBy()(row) === selectedKey()"
            [class.ring-primary]="selectedKey() !== undefined && trackBy()(row) === selectedKey()"
          >
            @if (primaryColumn(); as pc) {
              <div class="mb-2 font-display font-bold text-primary">
                <ng-container
                  [ngTemplateOutlet]="cellTpl"
                  [ngTemplateOutletContext]="{ row, col: pc }"
                />
              </div>
            }
            <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              @for (col of mobileColumns(); track col.key) {
                <dt class="text-ink-muted">{{ col.label }}</dt>
                <dd class="text-right">
                  <ng-container
                    [ngTemplateOutlet]="cellTpl"
                    [ngTemplateOutletContext]="{ row, col }"
                  />
                </dd>
              }
            </dl>
            @if (selectable()) {
              <button
                type="button"
                class="mt-3 min-h-12 w-full rounded-control border border-border font-semibold text-primary"
                (click)="rowSelect.emit(row)"
              >
                {{ selectLabel() }}
              </button>
            }
          </div>
        </li>
      }
    </ul>

    <ng-template #cellTpl let-row="row" let-col="col">
      @if (templateFor(col.key); as tpl) {
        <ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="{ $implicit: row }" />
      } @else {
        {{ col.value ? col.value(row) : '' }}
      }
    </ng-template>
  `,
})
export class DataTable<T> {
  readonly columns = input.required<readonly Column<T>[]>();
  readonly rows = input.required<readonly T[]>();
  readonly trackBy = input.required<(row: T) => string>();
  readonly caption = input<string>();
  readonly selectable = input(false);
  readonly selectLabel = input('Voir le détail');
  readonly selectedKey = input<string>();
  readonly rowSelect = output<T>();

  private readonly cells = contentChildren(CellDirective);

  protected readonly primaryColumn = computed(
    () => this.columns().find((c) => c.primary) ?? this.columns()[0],
  );
  protected readonly mobileColumns = computed(() =>
    this.columns().filter((c) => c !== this.primaryColumn() && !c.hideOnMobile),
  );

  protected templateFor(key: string): TemplateRef<{ $implicit: unknown }> | undefined {
    return this.cells().find((c) => c.appCell() === key)?.template;
  }
}
