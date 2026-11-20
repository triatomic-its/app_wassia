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
import { AuthService, LoginProfile } from '@core/auth/auth.service';
import { SessionStore } from '@core/auth/session.store';
import { FR } from '@core/i18n/fr';
import { Brand } from '@shared/components/brand/brand.component';
import { IobNotice } from '@layout/iob-notice/iob-notice.component';
import { Role } from '@core/models';
import { ButtonDirective } from '@shared/directives/button.directive';

const ROLE_ICONS: Record<Role, string> = {
  dg: 'lucideShieldCheck',
  chef_agence: 'lucideBriefcase',
  secretaire: 'lucideUserPlus',
  assistant: 'lucideEye',
  comptable: 'lucideCalculator',
  caissiere: 'lucideLandmark',
  agent: 'lucideUsers',
};

/**
 * Login. With Keycloak: one button. In development: choose a demo profile (mock back end) or a
 * staff member of the registry (real back end without authentication yet, ASSUMPTION A26).
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
  protected readonly profiles = signal<LoginProfile[] | null>(null);
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    if (this.session.authenticated()) {
      void this.router.navigateByUrl('/');
      return;
    }
    void this.loadProfiles();
  }

  protected async loadProfiles(): Promise<void> {
    this.error.set(null);
    this.profiles.set(null);
    try {
      this.profiles.set(await this.auth.profiles());
    } catch (e) {
      this.profiles.set([]);
      this.error.set(toApiError(e).message);
    }
  }

  protected async enter(profile?: LoginProfile): Promise<void> {
    this.busy.set(profile?.id ?? 'oidc');
    this.error.set(null);
    try {
      await this.auth.login(profile ? { profileId: profile.id } : {});
      const back = this.retour();
      await this.router.navigateByUrl(back && back.startsWith('/') ? back : '/');
    } catch (e) {
      this.error.set(
        e instanceof Error && e.message === 'OIDC_NOT_CONFIGURED'
          ? 'La connexion WASSIA n’est pas encore configurée. Contactez l’administrateur.'
          : e instanceof Error && e.message === 'REGISTRE_USER_NOT_FOUND'
            ? 'Ce compte n’existe plus. Choisissez un autre profil.'
            : toApiError(e).message,
      );
    } finally {
      this.busy.set(null);
    }
  }
}
