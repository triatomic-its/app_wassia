import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { COLLECTION_DAY_START } from '@core/config/enrollment.config';
import { DEFAULT_SETTINGS } from '@core/config/settings.defaults';
import { cutoffCountdown, formatHourLabel } from '@core/domain/cash-cutoff';
import { plural } from '@core/i18n/plural';
import { ClockService } from '@core/services/clock.service';
import { AgentApi } from '../../services/agent-api.service';

/** Agent home ("Accueil du jour"): the day summary and the countdown to the cash cut-off. */
@Injectable()
export class AgentHomeStore {
  private readonly api = inject(AgentApi);
  private readonly clock = inject(ClockService);

  readonly today = rxResource({ stream: () => this.api.today() });
  private readonly todayValue = computed(() => (this.today.hasValue() ? this.today.value() : null));

  private readonly cutoff = rxResource({ stream: () => this.api.cutoffTime() });
  private readonly cutoffTime = computed(
    // A resource in error throws on value(): fall back to the default cut-off.
    () => (this.cutoff.hasValue() ? this.cutoff.value() : DEFAULT_SETTINGS.cashCutoffTime),
  );
  readonly cutoffLabel = computed(() => formatHourLabel(this.cutoffTime()));
  readonly countdown = computed(() =>
    cutoffCountdown(this.clock.now(), COLLECTION_DAY_START, this.cutoffTime()),
  );
  readonly cardsToAssignLabel = computed(() =>
    plural(this.todayValue()?.cardsToAssign ?? 0, 'carte à associer', 'cartes à associer'),
  );
  readonly lateMembersLabel = computed(
    () =>
      `${plural(this.todayValue()?.lateMembers ?? 0, 'marchand en retard', 'marchands en retard')} à relancer`,
  );
}
