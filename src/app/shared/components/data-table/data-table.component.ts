import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  contentChildren,
  input,
  output,
} from '@angular/core';
import { CellDirective } from '../../directives/cell.directive';

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

interface RowView<T> {
  row: T;
  key: string;
  selected: boolean;
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
  templateUrl: './data-table.component.html',
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

  protected readonly rowViews = computed<RowView<T>[]>(() => {
    const keyOf = this.trackBy();
    const selected = this.selectedKey();
    return this.rows().map((row) => {
      const key = keyOf(row);
      return { row, key, selected: selected !== undefined && key === selected };
    });
  });
  protected readonly cellTemplates = computed(
    () =>
      new Map<string, TemplateRef<{ $implicit: unknown }>>(
        this.cells().map((c) => [c.appCell(), c.template]),
      ),
  );
  protected readonly primaryColumn = computed(
    () => this.columns().find((c) => c.primary) ?? this.columns()[0],
  );
  protected readonly mobileColumns = computed(() =>
    this.columns().filter((c) => c !== this.primaryColumn() && !c.hideOnMobile),
  );
}
