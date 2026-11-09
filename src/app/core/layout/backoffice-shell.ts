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
} from '@ng-icons/lucide';
import { filter } from 'rxjs';
import { SessionStore } from '../auth/session.store';
import { BACKOFFICE_NAV } from '../config/navigation.config';
import { FR } from '../i18n/fr';
import { Brand, IobNotice, OfflineBanner } from './brand';

/**
 * Back-office layout (DG, chefs, comptable, caissière, gestionnaire):
 * fixed navy side menu from `lg` (1024 px), slide-in drawer below.
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
    }),
  ],
  host: { class: 'flex min-h-dvh bg-bg', '(document:keydown.escape)': 'closeDrawer()' },
  template: `
    <a
      href="#main"
      class="sr-only z-50 rounded-control bg-accent px-4 py-3 font-bold text-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >{{ t.layout.skipToContent }}</a
    >

    <!-- Desktop side menu -->
    <nav
      class="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col gap-1 overflow-y-auto bg-primary px-4 py-6 text-white lg:flex"
      [attr.aria-label]="t.layout.mainMenu"
    >
      <ng-container *ngTemplateOutlet="menu" />
    </nav>

    <!-- Mobile / tablet drawer -->
    @if (drawerOpen()) {
      <button
        type="button"
        tabindex="-1"
        class="fixed inset-0 z-40 cursor-default bg-night/50 lg:hidden"
        [attr.aria-label]="t.layout.closeMenu"
        (click)="closeDrawer()"
      ></button>
      <nav
        id="drawer"
        class="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col gap-1 overflow-y-auto bg-primary px-4 py-6 text-white shadow-2xl lg:hidden"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="t.layout.mainMenu"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
      >
        <button
          type="button"
          class="mb-2 flex min-h-12 items-center gap-2 self-end rounded-control px-3 font-semibold text-nav-ink hover:bg-primary-hover"
          (click)="closeDrawer()"
        >
          <ng-icon name="lucideX" size="22" aria-hidden="true" />{{ t.layout.closeMenu }}
        </button>
        <ng-container *ngTemplateOutlet="menu" />
      </nav>
    }

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Top bar below lg -->
      <header
        class="sticky top-0 z-30 flex items-center gap-3 bg-primary px-4 py-2 text-white lg:hidden"
      >
        <button
          type="button"
          class="flex min-h-12 items-center gap-2 rounded-control px-2 font-semibold hover:bg-primary-hover"
          aria-controls="drawer"
          [attr.aria-expanded]="drawerOpen()"
          (click)="drawerOpen.set(true)"
        >
          <ng-icon name="lucideMenu" size="24" aria-hidden="true" />
          <span>Menu</span>
        </button>
        <app-brand [onDark]="true" class="ml-auto [&_img]:h-9" />
      </header>

      <app-offline-banner />

      <main
        id="main"
        tabindex="-1"
        class="flex w-full max-w-[90rem] flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-9 lg:py-7"
      >
        <router-outlet />
      </main>

      <footer class="border-t border-border px-4 py-4 sm:px-6 lg:px-9">
        <app-iob-notice />
      </footer>
    </div>

    <ng-template #menu>
      <app-brand [onDark]="true" class="mb-5 px-2" />
      <ul class="flex flex-col gap-1">
        @for (item of items(); track item.path) {
          <li>
            <a
              [routerLink]="item.path"
              routerLinkActive="!bg-primary-hover !text-accent-light font-bold"
              #rla="routerLinkActive"
              [attr.aria-current]="rla.isActive ? 'page' : null"
              class="flex min-h-12 items-center gap-3 rounded-control px-3.5 text-sm font-semibold text-nav-ink hover:bg-primary-hover hover:text-white"
            >
              <ng-icon [name]="item.icon" size="20" aria-hidden="true" />{{ item.label }}
            </a>
          </li>
        }
      </ul>
      @if (session.user(); as user) {
        <div
          class="mt-auto rounded-control bg-primary-hover p-3.5 text-xs leading-normal text-nav-ink"
        >
          {{ t.layout.connectedAs }}<br />
          <b class="text-sm text-white">{{ roleLabel() }}</b
          ><br />
          {{ roleHint() }}
        </div>
      }
    </ng-template>
  `,
})
export class BackofficeShell {
  protected readonly session = inject(SessionStore);
  protected readonly t = FR;
  protected readonly drawerOpen = signal(false);

  protected readonly items = computed(() => {
    const perms = this.session.permissions();
    return BACKOFFICE_NAV.filter((item) => perms.has(item.permission));
  });
  protected readonly roleLabel = computed(() => {
    const role = this.session.role();
    return role ? FR.roles[role] : '';
  });
  protected readonly roleHint = computed(() => {
    const role = this.session.role();
    return role ? FR.roleHints[role] : '';
  });

  constructor() {
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeDrawer());
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }
}
