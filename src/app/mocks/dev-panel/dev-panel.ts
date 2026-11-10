import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFlaskConical, lucideX } from '@ng-icons/lucide';
import { AuthService } from '../../core/auth/auth.service';
import { SessionStore } from '../../core/auth/session.store';
import { FR } from '../../core/i18n/fr';
import { ROLES, Role } from '../../core/models';
import { ClockService } from '../../core/realtime/clock.service';
import { formatAbidjanDate } from '../../shared/pipes/abidjan-date.pipe';
import { ButtonDirective } from '../../shared/ui/button';
import { InputDirective } from '../../shared/ui/field';
import { FAULTS, FaultKind, MockControl } from '../control';
import { MockDb } from '../db';
import { MockScanner } from '../scanner';

const LATENCIES = [
  { label: 'Aucune (0 ms)', min: 0, max: 0 },
  { label: 'Normale (200–800 ms)', min: 200, max: 800 },
  { label: 'Lente (2–3 s)', min: 2000, max: 3000 },
];

/**
 * Floating demo tools, development builds only (lives in mocks/, never shipped).
 * Switch profile, set latency, inject an error, move the clock, reset the data.
 */
@Component({
  selector: 'app-dev-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, ButtonDirective, InputDirective],
  providers: [provideIcons({ lucideFlaskConical, lucideX })],
  host: { '(document:keydown.escape)': 'open.set(false)' },
  template: `
    @if (!open()) {
      <button
        type="button"
        class="fixed right-4 bottom-24 z-[60] flex min-h-12 items-center gap-2 rounded-pill bg-accent px-4 font-display text-sm font-bold text-primary shadow-lg md:bottom-4 print:hidden"
        (click)="open.set(true)"
      >
        <ng-icon name="lucideFlaskConical" size="20" aria-hidden="true" />Démo
      </button>
    } @else {
      <aside
        class="fixed inset-y-0 right-0 z-[60] flex w-[min(24rem,100vw)] flex-col gap-5 overflow-y-auto border-l border-border bg-surface p-5 shadow-2xl"
        aria-label="Outils de démonstration"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold">Outils de démonstration</h2>
          <button
            appButton
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Fermer"
            (click)="open.set(false)"
          >
            <ng-icon name="lucideX" size="22" aria-hidden="true" />
          </button>
        </div>
        <p class="rounded-control bg-warning-soft p-3 text-sm text-warning">
          Faux serveur : toutes les données sont fictives et restent dans ce navigateur.
        </p>

        <section class="flex flex-col gap-2">
          <h3 class="font-bold">Profil connecté</h3>
          <div class="grid grid-cols-2 gap-2">
            @for (role of roles; track role) {
              <button
                appButton
                type="button"
                class="min-h-11 px-3 text-sm"
                [variant]="session.role() === role ? 'primary' : 'outline'"
                [disabled]="busy()"
                (click)="switchTo(role)"
              >
                {{ t.roles[role] }}
              </button>
            }
          </div>
        </section>

        <section class="flex flex-col gap-2">
          <h3 class="font-bold">Horloge simulée</h3>
          <p class="text-sm">
            Il est <b class="font-display text-base text-primary">{{ clockLabel() }}</b>
            @if (clock.offsetMs() !== 0) {
              <span class="text-ink-muted">(décalée)</span>
            }
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              appButton
              variant="outline"
              type="button"
              class="min-h-10 px-3 text-sm"
              (click)="setTime(15, 55)"
            >
              15 h 55
            </button>
            <button
              appButton
              variant="outline"
              type="button"
              class="min-h-10 px-3 text-sm"
              (click)="setTime(16, 5)"
            >
              16 h 05
            </button>
            <button
              appButton
              variant="outline"
              type="button"
              class="min-h-10 px-3 text-sm"
              (click)="shift(3_600_000)"
            >
              + 1 h
            </button>
            <button
              appButton
              variant="outline"
              type="button"
              class="min-h-10 px-3 text-sm"
              (click)="shift(86_400_000)"
            >
              + 1 jour
            </button>
            <button
              appButton
              variant="ghost"
              type="button"
              class="min-h-10 px-3 text-sm"
              (click)="control.update({ clockOffsetMs: 0 })"
            >
              Heure réelle
            </button>
          </div>
        </section>

        <section class="flex flex-col gap-2">
          <label for="dev-latency" class="font-bold">Lenteur du réseau</label>
          <select
            id="dev-latency"
            appInput
            [value]="latencyIndex()"
            (change)="setLatency($any($event.target).value)"
          >
            @for (l of latencies; track l.label; let i = $index) {
              <option [value]="i" [selected]="i === latencyIndex()">{{ l.label }}</option>
            }
          </select>
        </section>

        <section class="flex flex-col gap-2">
          <label for="dev-fault" class="font-bold">Provoquer une erreur</label>
          <select
            id="dev-fault"
            appInput
            [value]="control.state().fault"
            (change)="setFault($any($event.target).value)"
          >
            @for (f of faults; track f.kind) {
              <option [value]="f.kind" [selected]="f.kind === control.state().fault">
                {{ f.label }}
              </option>
            }
          </select>
          <label class="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              class="size-5 accent-primary"
              [checked]="control.state().faultOnce"
              (change)="control.update({ faultOnce: $any($event.target).checked })"
            />
            Seulement pour la prochaine requête
          </label>
        </section>

        <section class="flex flex-col gap-2">
          <h3 class="font-bold">Scan de carte (sans caméra)</h3>
          <p class="text-sm text-ink-muted">
            Sur l'écran « Associer la carte », simule le scan du code QR d'une carte vierge.
          </p>
          <button appButton variant="outline" type="button" (click)="simulateScan()">
            Scanner la carte vierge {{ nextFreeCard() }}
          </button>
        </section>

        <section class="flex flex-col gap-2">
          <h3 class="font-bold">Données fictives</h3>
          <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            @for (c of counts(); track c.label) {
              <dt class="text-ink-muted">{{ c.label }}</dt>
              <dd class="text-right font-semibold">{{ c.value }}</dd>
            }
          </dl>
          <button appButton variant="danger" type="button" class="mt-2" (click)="reset()">
            Réinitialiser les données
          </button>
        </section>
      </aside>
    }
  `,
})
export class DevPanel {
  protected readonly session = inject(SessionStore);
  protected readonly clock = inject(ClockService);
  protected readonly control = inject(MockControl);
  private readonly db = inject(MockDb);
  private readonly scanner = inject(MockScanner);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly t = FR;
  protected readonly roles = ROLES;
  protected readonly faults = FAULTS;
  protected readonly latencies = LATENCIES;
  protected readonly open = signal(false);
  protected readonly busy = signal(false);

  protected readonly clockLabel = computed(() => formatAbidjanDate(this.clock.now(), 'datetime'));
  protected readonly latencyIndex = computed(() => {
    const { latencyMin, latencyMax } = this.control.state();
    const i = LATENCIES.findIndex((l) => l.min === latencyMin && l.max === latencyMax);
    return i < 0 ? 1 : i;
  });
  protected readonly counts = computed(() => {
    this.db.revision();
    const d = this.db.snapshot;
    return [
      { label: 'Utilisateurs', value: d.users.length },
      { label: 'Marchands', value: d.members.length },
      { label: 'Cartes', value: d.cards.length },
      { label: 'Paiements', value: d.payments.length },
      { label: 'Crédits', value: d.loans.length },
      { label: 'Clôtures de caisse', value: d.closures.length },
      { label: 'Écritures comptables', value: d.ledger.length },
      { label: 'À réconcilier', value: d.reconciliation.filter((r) => !r.resolved).length },
    ];
  });

  protected async switchTo(role: Role): Promise<void> {
    this.busy.set(true);
    try {
      await this.auth.login({ role });
      await this.router.navigateByUrl('/');
    } finally {
      this.busy.set(false);
    }
  }

  /** Moves the simulated clock to today HH:MM, Africa/Abidjan (UTC+0). */
  protected setTime(hours: number, minutes: number): void {
    const now = this.clock.current();
    const target = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hours,
      minutes,
    );
    this.control.update({ clockOffsetMs: target - Date.now() });
  }

  protected shift(ms: number): void {
    this.control.update({ clockOffsetMs: this.clock.offsetMs() + ms });
  }

  protected setLatency(index: string): void {
    const l = LATENCIES[Number(index)] ?? LATENCIES[1];
    this.control.update({ latencyMin: l.min, latencyMax: l.max });
  }

  protected setFault(kind: FaultKind): void {
    this.control.update({ fault: kind });
  }

  private readonly freeCard = computed(() => {
    this.db.revision();
    return this.db.snapshot.cards.find((c) => c.status === 'UNASSIGNED');
  });
  protected readonly nextFreeCard = computed(() => this.freeCard()?.printedNumber ?? '—');

  /** Sends the QR token of the next blank card to the open scanner, then closes the panel. */
  protected simulateScan(): void {
    const card = this.freeCard();
    if (!card) return;
    this.open.set(false);
    this.scanner.scan(card.qrToken);
  }

  protected reset(): void {
    if (!confirm('Effacer toutes les données de démonstration et repartir des données de départ ?'))
      return;
    this.db.reset();
    location.reload();
  }
}
