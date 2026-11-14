import { Injectable, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ClockService } from '@core/services/clock.service';
import { AgentApi } from '../../services/agent-api.service';

/** "Mes inscriptions": merchants still waiting for a card, then all the agent's merchants. */
@Injectable()
export class MyEnrollmentsStore {
  private readonly api = inject(AgentApi);

  readonly toAssign = rxResource({ stream: () => this.api.cardsToAssign() });
  readonly members = rxResource({ stream: () => this.api.myMembers() });
  /** Reactive "now" for the "inscrit il y a…" labels. */
  readonly now = inject(ClockService).now;
}
