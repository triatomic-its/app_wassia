import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RoundFilter } from '../../models/round.model';
import { AgentApi } from '../../services/agent-api.service';
import { CollectOffline } from '../../services/collect-offline.service';
import { filterRound } from '../../services/round';

/** "Tournée du jour" (mockup). Provided by the page. */
@Injectable()
export class RoundStore {
  private readonly api = inject(AgentApi);
  private readonly offline = inject(CollectOffline);

  readonly day = rxResource({ stream: () => this.api.round() });
  readonly search = signal('');
  readonly filter = signal<RoundFilter>('all');

  // A resource in error throws on value(): always check hasValue() first.
  private readonly entries = computed(() => (this.day.hasValue() ? this.day.value().entries : []));
  readonly visible = computed(() => filterRound(this.entries(), this.filter(), this.search()));
  readonly counts = computed(() => {
    const all = this.entries();
    return {
      all: all.length,
      todo: all.filter((e) => e.state === 'todo').length,
      paid: all.filter((e) => e.state === 'paid').length,
    };
  });

  constructor() {
    // Deposits sent from the phone (or newly queued): read the round again.
    effect(() => {
      void this.offline.pending().length;
      untracked(() => {
        if (this.day.hasValue()) this.day.reload();
      });
    });
  }
}
