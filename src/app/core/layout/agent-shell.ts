import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideHandCoins,
  lucideHouse,
  lucideRoute,
  lucideScanLine,
  lucideUserPlus,
} from '@ng-icons/lucide';
import { SessionStore } from '../auth/session.store';
import { AGENT_NAV } from '../config/navigation.config';
import { FR } from '../i18n/fr';
import { formatAbidjanDate } from '../../shared/pipes/abidjan-date.pipe';
import { Brand, OfflineBanner } from './brand';
import { NetworkStatus } from './network-status';

/**
 * Field-agent PWA layout (mockup):
 * phone = navy top bar + bottom tab bar with a raised "Scanner" button;
 * tablet and up (`md`, 768 px) = left rail, content uses the extra width (list + detail).
 */
@Component({
  selector: 'app-agent-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIcon, Brand, OfflineBanner],
  providers: [
    provideIcons({ lucideHouse, lucideRoute, lucideScanLine, lucideUserPlus, lucideHandCoins }),
  ],
  host: { class: 'flex min-h-dvh bg-bg' },
  template: `
    <!-- Tablet / desktop rail -->
    <nav
      class="sticky top-0 hidden h-dvh w-28 shrink-0 flex-col items-stretch gap-1 bg-primary px-2 py-5 md:flex"
      [attr.aria-label]="t.layout.mainMenu"
    >
      <img
        src="logo/wassia-logo.png"
        width="150"
        height="168"
        alt=""
        class="mx-auto mb-5 h-12 w-auto"
      />
      @for (item of items(); track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="!bg-primary-hover !text-accent-light"
          #rla="routerLinkActive"
          [attr.aria-current]="rla.isActive ? 'page' : null"
          class="flex min-h-16 flex-col items-center justify-center gap-1 rounded-control text-xs font-semibold text-nav-ink hover:bg-primary-hover"
        >
          <ng-icon [name]="item.icon" size="24" aria-hidden="true" />{{ item.label }}
        </a>
      }
    </nav>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="flex items-center justify-between gap-3 bg-primary px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 text-white"
      >
        <div class="min-w-0">
          <div class="text-sm text-nav-ink">{{ today }}</div>
          <div class="truncate font-display text-xl font-bold">{{ greeting() }}</div>
        </div>
        <app-brand [onDark]="true" class="hidden lg:flex" />
        <span
          class="flex shrink-0 items-center gap-2 rounded-pill bg-primary-hover px-3 py-1.5 text-xs font-semibold"
          role="status"
        >
          <span
            class="size-2 rounded-full"
            [class]="network.online() ? 'bg-emerald' : 'bg-accent'"
            aria-hidden="true"
          ></span>
          {{ network.online() ? t.layout.online : t.layout.offlineShort }}
        </span>
      </header>

      <app-offline-banner />

      <!-- pb leaves room for the fixed bottom bar on phones -->
      <main
        id="main"
        class="flex w-full flex-1 flex-col gap-3.5 px-4 pt-4 pb-28 md:px-6 md:pb-6 lg:max-w-6xl"
      >
        <router-outlet />
      </main>
    </div>

    <!-- Phone bottom tab bar -->
    <nav
      class="fixed inset-x-0 bottom-0 z-30 flex h-[4.5rem] items-stretch border-t border-border bg-surface px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
      [attr.aria-label]="t.layout.mainMenu"
    >
      @for (item of items(); track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="!text-sapin font-bold"
          #rla="routerLinkActive"
          [attr.aria-current]="rla.isActive ? 'page' : null"
          class="flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold text-ink-muted"
        >
          @if (item.primary) {
            <span
              class="-mt-6 flex size-12 items-center justify-center rounded-full border-4 border-surface bg-sapin text-white"
            >
              <ng-icon [name]="item.icon" size="22" aria-hidden="true" />
            </span>
          } @else {
            <ng-icon [name]="item.icon" size="22" aria-hidden="true" />
          }
          {{ item.label }}
        </a>
      }
    </nav>
  `,
})
export class AgentShell {
  protected readonly session = inject(SessionStore);
  protected readonly network = inject(NetworkStatus);
  protected readonly t = FR;
  protected readonly today = formatAbidjanDate(new Date(), 'long');

  protected readonly items = computed(() => {
    const perms = this.session.permissions();
    return AGENT_NAV.filter((item) => perms.has(item.permission));
  });
  protected readonly greeting = computed(() => {
    const first = this.session.user()?.fullName.split(' ')[0] ?? '';
    return `Bonjour, ${first}`;
  });
}
