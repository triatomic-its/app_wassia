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
import { toApiError } from '@core/api/error.model';
import { AuthService } from '@core/auth/auth.service';
import { SessionStore } from '@core/auth/session.store';
import { FR } from '@core/i18n/fr';
import { Brand } from '@shared/components/brand/brand.component';
import { IobNotice } from '@layout/iob-notice/iob-notice.component';
import { Role } from '@core/models';
import { ButtonDirective } from '@shared/directives/button.directive';

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
  host: { class: 'relative flex min-h-dvh flex-col overflow-hidden bg-night' },
  templateUrl: './login.component.html',
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
