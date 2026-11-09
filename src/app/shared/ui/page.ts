import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Route } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideConstruction } from '@ng-icons/lucide';
import { FR } from '../../core/i18n/fr';

/** Screen title + subtitle; actions/badges are projected on the right (stacked on phones). */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4' },
  template: `
    <div class="min-w-0 flex-1">
      <h1 class="text-2xl font-bold sm:text-[1.75rem]">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="mt-0.5 text-sm text-ink-muted">{{ subtitle() }}</p>
      }
    </div>
    <div class="flex flex-wrap items-center gap-2"><ng-content /></div>
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}

/** White card section with an optional title bar (mockup panels). */
@Component({
  selector: 'app-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 overflow-hidden rounded-card border border-border bg-surface' },
  template: `
    @if (title()) {
      <div class="flex items-center gap-3 border-b border-border px-5 py-4">
        <h2 class="flex-1 text-[1.0625rem] font-bold">{{ title() }}</h2>
        <ng-content select="[panel-aside]" />
      </div>
    }
    <ng-content />
  `,
})
export class Panel {
  readonly title = input<string>();
}

/** Temporary screen used by routes not built yet (later phases). */
@Component({
  selector: 'app-coming-soon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, NgIcon],
  providers: [provideIcons({ lucideConstruction })],
  host: { class: 'flex flex-col gap-5' },
  template: `
    <app-page-header [title]="title()" [subtitle]="phase()" />
    <div
      class="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-14 text-center"
    >
      <ng-icon name="lucideConstruction" size="32" class="text-accent" aria-hidden="true" />
      <p class="font-semibold text-ink-muted">{{ text }}</p>
    </div>
  `,
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
