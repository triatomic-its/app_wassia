import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { translateRegistreRefusal } from '@core/api/registre-errors';
import { RegistreClient } from '@core/api/registre-client.service';
import { REGISTRE } from '@core/api/registre-endpoints';
import { toApiError } from '@core/api/error.model';
import { SavingsBalance } from '@core/models';
import { NouveauFait, ResultatSync } from '@core/models/registre.model';
import { LocalStore } from '@core/services/local-store.service';
import { NetworkStatus } from '@core/services/network-status.service';
import { CachedCard, QueuedDeposit } from '../models/offline.model';
import { depositCashKey } from './registre-dossier';

const QUEUE = 'collect-queue';
const CARDS = 'collect-cards';

/** Registry answer → what happens to the queued deposit. */
export function outcomeOf(result: ResultatSync): 'done' | 'failed' {
  // "conflit" on a deposit key means the same deposit is already recorded (the key is unique
  // per deposit): the money is in, nothing to resend (ASSUMPTION A37).
  return result.statut === 'rejete' ? 'failed' : 'done';
}

/** A queued cash deposit as the registry fact the sync sends (`EncaissementEspeces`). */
export function toFact(d: QueuedDeposit): NouveauFait {
  return {
    type: 'EncaissementEspeces',
    champs: {
      canal: 'especes',
      cleIdempotence: depositCashKey(d.key),
      dateValeur: d.dateValeur,
      montantFcfa: d.amount,
      nature: 'epargne',
    },
    predecesseurs: { agent: [d.agentId], compte: [d.memberId] },
    auteur: d.agentId,
  };
}

/**
 * Offline collection for the field agent (registry only):
 * - a copy of the associated cards, so a card can be recognised without network;
 * - a queue of cash deposits taken without network, sent with `POST /synchronisations` as soon
 *   as the connection is back (automatically, or with "Envoyer maintenant").
 */
@Injectable({ providedIn: 'root' })
export class CollectOffline {
  private readonly store = inject(LocalStore);
  private readonly api = inject(RegistreClient);
  private readonly network = inject(NetworkStatus);

  private readonly _queue = signal<QueuedDeposit[]>([]);
  readonly queue = this._queue.asReadonly();
  readonly pending = computed(() => this._queue().filter((d) => d.state === 'pending'));
  readonly failed = computed(() => this._queue().filter((d) => d.state === 'failed'));
  readonly pendingTotal = computed(() => this.pending().reduce((sum, d) => sum + d.amount, 0));
  readonly syncing = signal(false);
  /** Last sync failure (network…), in plain French. */
  readonly syncError = signal<string | null>(null);

  private readonly loaded: Promise<void>;

  constructor() {
    this.loaded = this.store
      .getAll<QueuedDeposit>(QUEUE)
      .then((items) => this._queue.set(sortByDate(items)))
      .catch(() => undefined);
    // Back online: send what waits.
    effect(() => {
      if (this.network.online()) void this.sync();
    });
  }

  async enqueue(deposit: QueuedDeposit): Promise<void> {
    await this.loaded;
    await this.store.put(QUEUE, deposit);
    this._queue.update((q) => sortByDate([...q.filter((d) => d.key !== deposit.key), deposit]));
  }

  /** Sends the pending deposits. Never throws; the outcome is in the signals. */
  async sync(): Promise<void> {
    await this.loaded;
    const batch = this.pending();
    if (this.syncing() || batch.length === 0 || !this.network.online()) return;
    this.syncing.set(true);
    this.syncError.set(null);
    try {
      const results = await firstValueFrom(
        this.api.post<ResultatSync[]>(REGISTRE.sync, { faits: batch.map(toFact) }),
      );
      for (const [i, deposit] of batch.entries()) {
        const result = results.find((r) => r.ordre === i + 1);
        if (!result) continue;
        if (outcomeOf(result) === 'done') {
          await this.store.delete(QUEUE, deposit.key);
          this._queue.update((q) => q.filter((d) => d.key !== deposit.key));
        } else {
          const failed: QueuedDeposit = {
            ...deposit,
            state: 'failed',
            error: translateRegistreRefusal(422, result.message ?? '').message,
          };
          await this.store.put(QUEUE, failed);
          this._queue.update((q) => q.map((d) => (d.key === deposit.key ? failed : d)));
        }
      }
    } catch (e) {
      this.syncError.set(toApiError(e).message);
    } finally {
      this.syncing.set(false);
    }
  }

  /** Removes a refused deposit once the agent has dealt with it. */
  async dismiss(key: string): Promise<void> {
    await this.store.delete(QUEUE, key);
    this._queue.update((q) => q.filter((d) => d.key !== key));
  }

  /** Keeps the copy of the associated cards, with the balances already known. */
  async cacheCards(cards: readonly CachedCard[]): Promise<void> {
    const known = new Map((await this.cards()).map((c) => [c.memberId, c]));
    await this.store.replaceAll(
      CARDS,
      cards.map((c) => {
        const previous = known.get(c.memberId);
        return c.balance || !previous?.balance
          ? c
          : { ...c, balance: previous.balance, balanceAt: previous.balanceAt };
      }),
    );
  }

  async cardOf(memberId: string): Promise<CachedCard | undefined> {
    return (await this.cards()).find((c) => c.memberId === memberId);
  }

  async findCard(qrToken: string): Promise<CachedCard | undefined> {
    return (await this.cards()).find((c) => c.key === qrToken);
  }

  async rememberBalance(memberId: string, balance: SavingsBalance): Promise<void> {
    const card = (await this.cards()).find((c) => c.memberId === memberId);
    if (card)
      await this.store.put(CARDS, { ...card, balance, balanceAt: new Date().toISOString() });
  }

  private cards(): Promise<CachedCard[]> {
    return this.store.getAll<CachedCard>(CARDS).catch(() => []);
  }
}

function sortByDate(items: QueuedDeposit[]): QueuedDeposit[] {
  return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
