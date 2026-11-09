import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBanknote,
  lucideBriefcase,
  lucideCalculator,
  lucideEye,
  lucideLandmark,
  lucideLogIn,
  lucideShieldCheck,
  lucideUserPlus,
  lucideUsers,
} from '@ng-icons/lucide';
import { toApiError } from '../../core/api/error.model';
import { AuthService } from '../../core/auth/auth.service';
import { SessionStore } from '../../core/auth/session.store';
import { FR } from '../../core/i18n/fr';
import { Brand, IobNotice } from '../../core/layout/brand';
import { Role } from '../../core/models';
import { ButtonDirective } from '../../shared/ui/button';

const ROLE_ICONS: Record<Role, string> = {
  DG: 'lucideShieldCheck',
  DEPUTY_DG: 'lucideEye',
  BRANCH_MANAGER: 'lucideBriefcase',
  MANAGER: 'lucideUserPlus',
  ACCOUNTANT: 'lucideCalculator',
  CASHIER: 'lucideLandmark',
  AGENT: 'lucideUsers',
};

/**
 * Login. With the real back end: one button (Keycloak). In development: choose a demo profile.
 */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, ButtonDirective, Brand, IobNotice],
  providers: [
    provideIcons({
      lucideShieldCheck,
      lucideEye,
      lucideBriefcase,
      lucideUserPlus,
      lucideCalculator,
      lucideLandmark,
      lucideUsers,
      lucideBanknote,
      lucideLogIn,
    }),
  ],
  host: { class: 'flex min-h-dvh flex-col items-center bg-bg px-4 py-8 sm:py-12' },
  template: `
    <main class="flex w-full max-w-3xl flex-1 flex-col items-center gap-6">
      <app-brand [width]="220" />

      <section class="w-full rounded-card border border-border bg-surface p-5 sm:p-8">
        <h1 class="text-2xl font-bold">Connexion</h1>

        @if (auth.kind === 'mock') {
          <p class="mt-1 text-ink-muted">Version de démonstration : choisissez qui vous êtes.</p>
          <ul class="mt-5 grid gap-3 sm:grid-cols-2">
            @for (role of roles; track role) {
              <li>
                <button
                  type="button"
                  class="flex min-h-18 w-full items-center gap-4 rounded-card border-[1.5px] border-border bg-surface px-4 py-3 text-left hover:border-primary hover:bg-info-soft disabled:opacity-50"
                  [class.border-sapin]="role === 'AGENT'"
                  [disabled]="busy() !== null"
                  (click)="enter(role)"
                >
                  <span
                    class="flex size-11 shrink-0 items-center justify-center rounded-full"
                    [class]="role === 'AGENT' ? 'bg-sapin text-white' : 'bg-info-soft text-primary'"
                  >
                    <ng-icon [name]="icons[role]" size="22" aria-hidden="true" />
                  </span>
                  <span class="min-w-0">
                    <span class="block font-display font-bold text-primary">{{
                      t.roles[role]
                    }}</span>
                    <span class="block text-sm text-ink-muted">
                      {{ busy() === role ? t.common.loading : t.roleHints[role] }}
                    </span>
                  </span>
                </button>
              </li>
            }
          </ul>
        } @else {
          <p class="mt-1 text-ink-muted">Utilisez votre compte WASSIA.</p>
          <button
            appButton
            size="xl"
            type="button"
            class="mt-5"
            [block]="true"
            [disabled]="busy() !== null"
            (click)="enter()"
          >
            <ng-icon name="lucideLogIn" size="24" aria-hidden="true" />Se connecter
          </button>
        }

        <div aria-live="assertive">
          @if (error()) {
            <p
              class="mt-4 rounded-control bg-danger-soft p-3 font-semibold text-danger"
              role="alert"
            >
              {{ error() }}
            </p>
          }
        </div>
      </section>

      <app-iob-notice class="max-w-xl text-center" />
    </main>
  `,
})
export class Login implements OnInit {
  /** Page to return to after login (`?retour=/app/caisse`). */
  readonly retour = input<string>();

  protected readonly auth = inject(AuthService);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  protected readonly t = FR;
  protected readonly icons = ROLE_ICONS;
  protected readonly roles: Role[] = [
    'AGENT',
    'CASHIER',
    'ACCOUNTANT',
    'MANAGER',
    'BRANCH_MANAGER',
    'DG',
    'DEPUTY_DG',
  ];
  protected readonly busy = signal<Role | 'oidc' | null>(null);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    if (this.session.authenticated()) void this.router.navigateByUrl('/');
  }

  protected async enter(role?: Role): Promise<void> {
    this.busy.set(role ?? 'oidc');
    this.error.set(null);
    try {
      await this.auth.login(role ? { role } : {});
      const back = this.retour();
      await this.router.navigateByUrl(back && back.startsWith('/') ? back : '/');
    } catch (e) {
      this.error.set(
        e instanceof Error && e.message === 'OIDC_NOT_CONFIGURED'
          ? 'La connexion WASSIA n’est pas encore configurée. Contactez l’administrateur.'
          : toApiError(e).message,
      );
    } finally {
      this.busy.set(null);
    }
  }
}
