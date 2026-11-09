import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideWifiOff } from '@ng-icons/lucide';
import { FR } from '../i18n/fr';
import { NetworkStatus } from './network-status';

/**
 * Official logo files (public/logo, charte v1.0). Brand rules: never stretched, recoloured,
 * rotated, or split into symbol + text; at least 120 px wide on screen.
 * - `horizontal`: full logo. White monochrome on navy backgrounds, colour on white.
 * - `symbol`: colour symbol only — allowed for the mobile app (narrow agent rail).
 */
@Component({
  selector: 'app-brand',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (variant() === 'symbol') {
      <img [src]="symbolSrc()" width="216" height="242" [alt]="name" class="h-auto w-14" />
    } @else {
      <img
        [src]="horizontalSrc()"
        width="704"
        height="274"
        [alt]="name"
        class="h-auto"
        [style.width.px]="width()"
      />
    }
  `,
})
export class Brand {
  readonly onDark = input(false);
  readonly variant = input<'horizontal' | 'symbol'>('horizontal');
  /** Rendered width in px (minimum 120 per the brand guidelines). */
  readonly width = input(200, { transform: (w: number) => Math.max(120, w) });
  protected readonly name = 'GROUPE WASSIA SARL';
  protected readonly horizontalSrc = () =>
    this.onDark()
      ? 'logo/logo-horizontal_monochrome-blanc.svg'
      : 'logo/logo-horizontal_couleur.svg';
  /** The colour symbol is allowed on navy too (gold outline keeps it readable). */
  protected readonly symbolSrc = () => 'logo/symbole_couleur.svg';
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
