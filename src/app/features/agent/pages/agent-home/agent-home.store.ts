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

  private readonly cutoffTime = computed(
    () => this.today.value()?.cutoffTime ?? DEFAULT_SETTINGS.cashCutoffTime,
  );
  readonly cutoffLabel = computed(() => formatHourLabel(this.cutoffTime()));
  readonly countdown = computed(() =>
    cutoffCountdown(this.clock.now(), COLLECTION_DAY_START, this.cutoffTime()),
  );
  readonly cardsToAssignLabel = computed(() =>
    plural(this.today.value()?.cardsToAssign ?? 0, 'carte à associer', 'cartes à associer'),
  );
  readonly lateMembersLabel = computed(
    () =>
      `${plural(this.today.value()?.lateMembers ?? 0, 'marchand en retard', 'marchands en retard')} à relancer`,
  );
}
