import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInbox } from '@ng-icons/lucide';

/** Empty list/screen: explains why it is empty and suggests an action (projected). */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideInbox })],
  host: { class: 'flex flex-col items-center gap-3 px-6 py-10 text-center' },
  templateUrl: './empty-state.component.html',
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly text = input<string>();
  readonly icon = input('lucideInbox');
}
