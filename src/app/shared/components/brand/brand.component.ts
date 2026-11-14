import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const LOGO = {
  horizontalColor: 'logo/logo-horizontal_couleur.svg',
  horizontalWhite: 'logo/logo-horizontal_monochrome-blanc.svg',
  /** The colour symbol is allowed on navy too (gold outline keeps it readable). */
  symbol: 'logo/symbole_couleur.svg',
} as const;

/** Brand guidelines: the logo is never shown narrower than this on screen. */
const MIN_LOGO_WIDTH_PX = 120;

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
  templateUrl: './brand.component.html',
})
export class Brand {
  readonly onDark = input(false);
  readonly variant = input<'horizontal' | 'symbol'>('horizontal');
  /** Rendered width in px (minimum 120 per the brand guidelines). */
  readonly width = input(200, { transform: (w: number) => Math.max(MIN_LOGO_WIDTH_PX, w) });

  protected readonly name = 'GROUPE WASSIA SARL';
  protected readonly symbolSrc = LOGO.symbol;
  protected readonly horizontalSrc = computed(() =>
    this.onDark() ? LOGO.horizontalWhite : LOGO.horizontalColor,
  );
}
