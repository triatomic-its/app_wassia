import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFlaskConical, lucideX } from '@ng-icons/lucide';
import { AuthService } from '@core/auth/auth.service';
import { SessionStore } from '@core/auth/session.store';
import { FR } from '@core/i18n/fr';
import { ROLES, Role } from '@core/models';
import { ClockService } from '@core/services/clock.service';
import { formatAbidjanDate } from '@core/i18n/format/abidjan-date';
import { ButtonDirective } from '@shared/directives/button.directive';
import { eventChecked, eventValue } from '@shared/utils/dom-events';
import { InputDirective } from '@shared/directives/input.directive';
import { FAULTS, FaultKind, MockControl } from '../control';
import { MockDb } from '../db';
import { environment } from '@env/environment';
import { MockScanner } from '../scanner';
import { registreDemoCardToken, toPrintedNumber } from '../registre-demo-cards';

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
  templateUrl: './dev-panel.component.html',
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

  protected setLatency(event: Event): void {
    const l = LATENCIES[Number(eventValue(event))] ?? LATENCIES[1];
    this.control.update({ latencyMin: l.min, latencyMax: l.max });
  }

  protected setFault(event: Event): void {
    const value = eventValue(event);
    const kind: FaultKind = FAULTS.find((f) => f.kind === value)?.kind ?? 'none';
    this.control.update({ fault: kind });
  }

  protected setFaultOnce(event: Event): void {
    this.control.update({ faultOnce: eventChecked(event) });
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

  /** Registry mode: the blank cards are the registry's (`npm run seed:registre`). */
  protected readonly useRegistre = environment.useRegistre;
  protected readonly registreCard = signal('WAS-000003');
  protected readonly registreCardError = signal<string | null>(null);

  protected setRegistreCard(event: Event): void {
    this.registreCard.set(eventValue(event));
    this.registreCardError.set(null);
  }

  /** Sends the QR token of a registry demo card to the open scanner, then closes the panel. */
  protected async simulateRegistreScan(): Promise<void> {
    const printed = toPrintedNumber(this.registreCard());
    if (!printed) {
      this.registreCardError.set('Écrivez un numéro de carte, par exemple WAS-000003.');
      return;
    }
    const token = await registreDemoCardToken(printed);
    this.open.set(false);
    this.scanner.scan(token);
  }

  protected reset(): void {
    if (!confirm('Effacer toutes les données de démonstration et repartir des données de départ ?'))
      return;
    this.db.reset();
    location.reload();
  }
}
