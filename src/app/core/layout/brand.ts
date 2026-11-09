import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideWifiOff } from '@ng-icons/lucide';
import { FR } from '../i18n/fr';
import { NetworkStatus } from './network-status';

/**
 * Logo symbol + "GROUPE WASSIA" wordmark. Brand rules: never stretched, recoloured or rotated;
 * at least 120 px wide on screen. The PNG comes from the client mockup (ASSUMPTION A16: SVG pending).
 */
@Component({
  selector: 'app-brand',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  host: { class: 'flex items-center gap-3' },
  template: `
    <img
      ngSrc="logo/wassia-logo.png"
      width="150"
      height="168"
      alt=""
      class="h-11 w-auto"
      priority
    />
    <span
      class="flex flex-col leading-none"
      [class.text-white]="onDark()"
      [class.text-primary]="!onDark()"
    >
      <span class="font-display text-xs font-bold tracking-[0.2em]">GROUPE</span>
      <span
        class="font-display text-xl font-bold tracking-wider"
        [class.text-emerald]="onDark()"
        [class.text-sapin]="!onDark()"
      >
        WASSIA
      </span>
      <span class="sr-only">{{ name }}</span>
    </span>
  `,
})
export class Brand {
  readonly onDark = input(false);
  protected readonly name = FR.app.name;
}

/** IOB legal notice — required in the footer and on printed documents. */
@Component({
  selector: 'app-iob-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block text-xs leading-relaxed text-ink-muted' },
  template: `{{ text }}`,
})
export class IobNotice {
  protected readonly text = FR.app.iobNotice;
}

/** Sticky banner shown when the device loses connectivity. */
@Component({
  selector: 'app-offline-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideWifiOff })],
  template: `
    <div aria-live="polite">
      @if (!network.online()) {
        <p
          class="flex items-center gap-3 bg-warning-soft px-4 py-3 text-sm font-semibold text-warning"
        >
          <ng-icon name="lucideWifiOff" size="20" aria-hidden="true" />{{ text }}
        </p>
      }
    </div>
  `,
})
export class OfflineBanner {
  protected readonly network = inject(NetworkStatus);
  protected readonly text = FR.layout.offline;
}
