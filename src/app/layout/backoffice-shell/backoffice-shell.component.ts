import { A11yModule } from '@angular/cdk/a11y';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBanknote,
  lucideChartColumn,
  lucideLandmark,
  lucideLayoutDashboard,
  lucideMenu,
  lucideSettings,
  lucideUserPlus,
  lucideUsers,
  lucideX,
  lucideLogOut,
} from '@ng-icons/lucide';
import { filter } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { SessionStore } from '@core/auth/session.store';
import { BACKOFFICE_NAV } from '@core/config/navigation.config';
import { FR } from '@core/i18n/fr';
import { Brand } from '@shared/components/brand/brand.component';
import { IobNotice } from '../iob-notice/iob-notice.component';
import { OfflineBanner } from '../offline-banner/offline-banner.component';

/**
 * Back-office layout (DG, chefs, comptable, caissière, gestionnaire):
 * collapsible navy side menu from `lg` (1024 px), slide-in drawer below, white top bar.
 */
@Component({
  selector: 'app-backoffice-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgIcon,
    A11yModule,
    Brand,
    IobNotice,
    OfflineBanner,
  ],
  providers: [
    provideIcons({
      lucideLayoutDashboard,
      lucideUserPlus,
      lucideBanknote,
      lucideLandmark,
      lucideUsers,
      lucideChartColumn,
      lucideSettings,
      lucideMenu,
      lucideX,
      lucideLogOut,
    }),
  ],
  host: { class: 'flex min-h-dvh bg-bo-bg', '(document:keydown.escape)': 'closeDrawer()' },
  templateUrl: './backoffice-shell.component.html',
})
export class BackofficeShell {
  protected readonly session = inject(SessionStore);
  protected readonly t = FR;
  protected readonly drawerOpen = signal(false);
  /** Desktop side menu folded to icons only (presentation). */
  protected readonly collapsed = signal(false);

  protected readonly items = computed(() => {
    const perms = this.session.permissions();
    return BACKOFFICE_NAV.filter((item) => perms.has(item.permission));
  });
  protected readonly initials = computed(() =>
    (this.session.user()?.fullName ?? '')
      .split(/s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join(''),
  );
  protected readonly roleLabel = computed(() => {
    const role = this.session.role();
    return role ? FR.roles[role] : '';
  });
  protected readonly roleHint = computed(() => {
    const role = this.session.role();
    return role ? FR.roleHints[role] : '';
  });

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeDrawer());
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/connexion');
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }
}
