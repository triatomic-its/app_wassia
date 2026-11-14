import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Route } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideConstruction } from '@ng-icons/lucide';
import { FR } from '@core/i18n/fr';
import { PageHeader } from '../page-header/page-header.component';

/** Temporary screen used by routes not built yet (later phases). */
@Component({
  selector: 'app-coming-soon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, NgIcon],
  providers: [provideIcons({ lucideConstruction })],
  host: { class: 'flex flex-col gap-5' },
  templateUrl: './coming-soon.component.html',
})
export class ComingSoon {
  readonly title = input('');
  readonly phase = input('');
  protected readonly text = FR.common.comingSoon;
}

/** Route helper for screens of later phases. */
export function comingSoonRoute(path: string, title: string, phase: string): Route {
  return { path, component: ComingSoon, title: `${title} — WASSIA`, data: { title, phase } };
}
