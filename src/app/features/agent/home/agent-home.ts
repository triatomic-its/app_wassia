import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronRight,
  lucideRoute,
  lucideScanLine,
  lucideTriangleAlert,
  lucideUserPlus,
} from '@ng-icons/lucide';
import { COLLECTION_DAY_START } from '../../../core/config/enrollment.config';
import { ClockService } from '../../../core/realtime/clock.service';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { ButtonDirective } from '../../../shared/ui/button';
import { ErrorState, Skeleton } from '../../../shared/ui/states';
import { StatCard } from '../../../shared/ui/stat-card';
import { AgentApi } from '../data/agent.api';

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Agent home (mockup "Accueil du jour"): what to do now, in big buttons. */
@Component({
  selector: 'app-agent-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgIcon, ButtonDirective, StatCard, ErrorState, Skeleton, FcfaPipe],
  providers: [
    provideIcons({
      lucideScanLine,
      lucideUserPlus,
      lucideRoute,
      lucideTriangleAlert,
      lucideChevronRight,
    }),
  ],
  host: { class: 'flex flex-col gap-3.5' },
  template: `
    @if (today.error()) {
      <app-error-state message="Impossible de charger votre journée." (retry)="today.reload()" />
    } @else if (today.value(); as day) {
      <div class="grid gap-3.5 md:grid-cols-2">
        <!-- Countdown to the 16:00 cut-off -->
        <section
          class="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-4"
          aria-live="polite"
        >
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-[0.9375rem] font-bold">Clôture de caisse à {{ cutoffLabel() }}</h2>
            <span
              class="font-display text-[0.9375rem] font-bold"
              [class]="countdown().locked ? 'text-danger' : 'text-sapin'"
            >
              {{ countdown().label }}
            </span>
          </div>
          <div class="h-2 overflow-hidden rounded bg-border-soft" aria-hidden="true">
            <div
              class="h-full"
              [class]="countdown().locked ? 'bg-danger' : 'bg-sapin'"
              [style.width.%]="countdown().progress"
            ></div>
          </div>
          <p class="text-sm leading-normal text-ink-muted">
            @if (countdown().locked) {
              La caisse est fermée. Vos saisies comptent pour demain.
            } @else {
              Après {{ cutoffLabel() }}, vos saisies passent au jour suivant.
            }
          </p>
        </section>

        <section class="grid grid-cols-[1.4fr_1fr_1fr] gap-2.5" aria-label="Ma journée">
          <app-stat-card
            label="Collecté aujourd'hui"
            [value]="day.collected | fcfa"
            [compact]="true"
          />
          <app-stat-card label="Versements" [value]="day.deposits" [compact]="true" />
          <app-stat-card label="Inscrits" [value]="day.enrolled" [compact]="true" />
        </section>
      </div>

      <a
        routerLink="/agent/scanner"
        appButton
        variant="success"
        size="xl"
        class="justify-start gap-4"
      >
        <ng-icon name="lucideScanLine" size="30" aria-hidden="true" />Scanner une carte
      </a>

      <div class="grid grid-cols-2 gap-2.5">
        <a
          routerLink="/agent/inscrire"
          appButton
          variant="outline"
          size="xl"
          class="min-h-21 flex-col items-start justify-center gap-1.5 px-3 text-[0.9375rem] leading-tight"
        >
          <ng-icon name="lucideUserPlus" size="24" aria-hidden="true" />Inscrire un marchand
        </a>
        <a
          routerLink="/agent/collecte"
          appButton
          variant="outline"
          size="xl"
          class="min-h-21 flex-col items-start justify-center gap-1.5 px-3 text-[0.9375rem] leading-tight"
        >
          <ng-icon name="lucideRoute" size="24" aria-hidden="true" />Tournée de collecte
        </a>
      </div>

      @if (day.lateMembers > 0) {
        <a
          routerLink="/agent/collecte"
          class="flex min-h-14 items-center gap-3 rounded-control bg-warning-soft p-3.5 text-sm font-semibold text-warning"
        >
          <ng-icon name="lucideTriangleAlert" size="22" aria-hidden="true" />
          <span class="flex-1">
            {{ day.lateMembers }}
            {{ day.lateMembers > 1 ? 'marchands en retard' : 'marchand en retard' }} à relancer
          </span>
          <span class="flex items-center"
            >Voir<ng-icon name="lucideChevronRight" size="18" aria-hidden="true"
          /></span>
        </a>
      }

      <div class="grid gap-2.5 md:grid-cols-2">
        <div
          class="flex items-center justify-between gap-2.5 rounded-control border border-border bg-surface p-3.5 text-sm"
        >
          <span class="text-ink-muted">À remettre à la caissière</span>
          <span class="font-display text-base font-bold text-primary">{{
            day.toRemit | fcfa
          }}</span>
        </div>
        <a
          routerLink="/agent/inscriptions"
          class="flex min-h-12 items-center justify-between gap-2.5 rounded-control border border-border bg-surface p-3.5 text-sm hover:border-primary"
        >
          <span class="text-ink-muted">Mes inscriptions</span>
          <span class="flex items-center font-semibold text-primary">
            Voir<ng-icon name="lucideChevronRight" size="18" aria-hidden="true" />
          </span>
        </a>
      </div>
    } @else {
      <div class="rounded-card border border-border bg-surface p-4">
        <app-skeleton [lines]="3" />
      </div>
      <div class="rounded-card border border-border bg-surface p-4">
        <app-skeleton [lines]="2" />
      </div>
    }
  `,
})
export class AgentHome {
  private readonly api = inject(AgentApi);
  private readonly clock = inject(ClockService);

  protected readonly today = rxResource({ stream: () => this.api.today() });

  protected readonly cutoffLabel = computed(() =>
    (this.today.value()?.cutoffTime ?? '16:00').replace(':', ' h '),
  );

  /** Time left before the cut-off, Africa/Abidjan (UTC+0). */
  protected readonly countdown = computed(() => {
    const now = this.clock.now();
    const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
    const start = toMinutes(COLLECTION_DAY_START);
    const cutoff = toMinutes(this.today.value()?.cutoffTime ?? '16:00');
    const left = cutoff - nowMin;
    if (left <= 0) return { locked: true, label: 'Fermée', progress: 100 };
    const progress = Math.min(100, Math.max(0, ((nowMin - start) / (cutoff - start)) * 100));
    const label =
      left >= 60
        ? `${Math.floor(left / 60)} h ${String(left % 60).padStart(2, '0')}`
        : `${left} min`;
    return { locked: false, label, progress };
  });
}
