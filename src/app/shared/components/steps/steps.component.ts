import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';

export interface Step {
  label: string;
  /** Who acts or what happens, e.g. "Comptage à 16 h 30 · en cours". */
  detail?: string;
}

/**
 * Numbered progress steps (enrollment wizard, 3-level cash closure).
 * Horizontal from `md`, vertical on phones.
 */
@Component({
  selector: 'app-steps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideCheck })],
  templateUrl: './steps.component.html',
})
export class Steps {
  readonly steps = input.required<readonly Step[]>();
  /** 0-based index of the current step; steps before it are done. */
  readonly current = input(0);
}
