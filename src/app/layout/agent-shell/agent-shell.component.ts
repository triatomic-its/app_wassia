import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideHandCoins,
  lucideHouse,
  lucideLogOut,
  lucideRoute,
  lucideScanLine,
  lucideUserPlus,
} from '@ng-icons/lucide';
import { AuthService } from '@core/auth/auth.service';
import { SessionStore } from '@core/auth/session.store';
import { AGENT_NAV } from '@core/config/navigation.config';
import { FR } from '@core/i18n/fr';
import { formatAbidjanDate } from '@core/i18n/format/abidjan-date';
import { ClockService } from '@core/services/clock.service';
import { AgentHeader, AgentHeaderState } from '../agent-header.service';
import { Brand } from '@shared/components/brand/brand.component';
import { OfflineBanner } from '../offline-banner/offline-banner.component';
import { NetworkStatus } from '@core/services/network-status.service';

/**
 * Field-agent PWA layout (mockup):
 * phone = night header (home) or white step bar + bottom tab bar with a raised gold "Scanner" button;
 * tablet and up (`md`, 768 px) = left rail, content uses the extra width (list + detail).
 */
@Component({
  selector: 'app-agent-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIcon, Brand, OfflineBanner],
  providers: [
    provideIcons({
      lucideChevronLeft,
      lucideLogOut,
      lucideHouse,
      lucideRoute,
      lucideScanLine,
      lucideUserPlus,
      lucideHandCoins,
    }),
  ],
  host: { class: 'flex min-h-dvh bg-bg' },
  templateUrl: './agent-shell.component.html',
})
export class AgentShell {
  protected readonly session = inject(SessionStore);
  protected readonly network = inject(NetworkStatus);
  protected readonly t = FR;
  protected readonly header = inject(AgentHeader);
  private readonly clock = inject(ClockService);
  protected readonly today = computed(() => formatAbidjanDate(this.clock.now(), 'long'));

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected goBack(page: AgentHeaderState): void {
    if (page.onBack) page.onBack();
    else if (page.back) void this.router.navigateByUrl(page.back);
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/connexion');
  }

  protected readonly items = computed(() => {
    const perms = this.session.permissions();
    return AGENT_NAV.filter((item) => perms.has(item.permission));
  });
  protected readonly initials = computed(() =>
    (this.session.user()?.fullName ?? '')
      .split(/s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join(''),
  );
  protected readonly greeting = computed(() => {
    const first = this.session.user()?.fullName.split(' ')[0] ?? '';
    return `Bonjour, ${first}`;
  });
}
