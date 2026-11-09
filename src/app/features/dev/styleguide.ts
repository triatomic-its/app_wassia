import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideScanLine, lucideUserPlus, lucideRoute, lucideSend } from '@ng-icons/lucide';
import { SessionStore } from '../../core/auth/session.store';
import { FR } from '../../core/i18n/fr';
import { ROLES, Role } from '../../core/models';
import { AbidjanDatePipe } from '../../shared/pipes/abidjan-date.pipe';
import { FcfaPipe } from '../../shared/pipes/fcfa.pipe';
import { MaskNamePipe } from '../../shared/pipes/mask-name.pipe';
import { ButtonDirective } from '../../shared/ui/button';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { CellDirective, Column, DataTable } from '../../shared/ui/data-table';
import { Field, InputDirective } from '../../shared/ui/field';
import { PageHeader, Panel } from '../../shared/ui/page';
import { EmptyState, ErrorState, Skeleton } from '../../shared/ui/states';
import { StatCard } from '../../shared/ui/stat-card';
import { StatusChip, Tone } from '../../shared/ui/status-chip';
import { Step, Steps } from '../../shared/ui/steps';
import { ToastService } from '../../shared/ui/toast';

interface AgentRow {
  id: string;
  name: string;
  zone: string;
  visits: string;
  collected: number;
  device: { label: string; tone: Tone };
}

/** Dev-only catalogue of every shared/ui component and state (route absent from production builds). */
@Component({
  selector: 'app-styleguide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIcon,
    ButtonDirective,
    StatusChip,
    StatCard,
    Field,
    InputDirective,
    Steps,
    EmptyState,
    ErrorState,
    Skeleton,
    DataTable,
    CellDirective,
    PageHeader,
    Panel,
    FcfaPipe,
    AbidjanDatePipe,
    MaskNamePipe,
  ],
  providers: [provideIcons({ lucideScanLine, lucideUserPlus, lucideRoute, lucideSend })],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <app-page-header
      title="Guide de style"
      subtitle="Composants partagés et leurs états — visible en développement seulement"
    >
      <app-status-chip label="Données fictives" tone="info" />
    </app-page-header>

    <app-panel title="Rôle affiché (aperçu des menus)">
      <div class="flex flex-wrap gap-2 p-5">
        @for (role of roles; track role) {
          <button
            appButton
            type="button"
            [variant]="session.role() === role ? 'primary' : 'outline'"
            (click)="preview(role)"
          >
            {{ t.roles[role] }}
          </button>
        }
      </div>
      <p class="px-5 pb-5 text-sm text-ink-muted">
        « Agent terrain » ouvre l'application agent (barre d'onglets sur téléphone, rail sur
        tablette).
      </p>
    </app-panel>

    <app-panel title="Couleurs (jetons)">
      <ul class="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 lg:grid-cols-6">
        @for (c of colors; track c.cls) {
          <li class="overflow-hidden rounded-control border border-border">
            <div class="h-14" [class]="c.cls"></div>
            <div class="px-2 py-1.5 text-xs">
              <b>{{ c.name }}</b>
            </div>
          </li>
        }
      </ul>
    </app-panel>

    <app-panel title="Typographie">
      <div class="flex flex-col gap-2 p-5">
        <p class="font-display text-[1.75rem] font-bold text-primary">
          Poppins 700 — Caisse et clôture du jour
        </p>
        <p class="font-display text-lg font-semibold text-primary">
          Poppins 600 — Activité des agents
        </p>
        <p>
          Open Sans 400 — Après 16 h 00, la saisie est verrouillée. Les versements suivants comptent
          pour J+1.
        </p>
        <p class="font-semibold">Open Sans 600 — Koffi A. · Marché Gouro</p>
        <p class="text-sm text-ink-muted">Texte secondaire — Mise à jour il y a 12 secondes</p>
      </div>
    </app-panel>

    <app-panel title="Boutons">
      <div class="flex flex-col gap-4 p-5">
        <div class="flex flex-wrap gap-3">
          <button appButton type="button">Envoyer au comptable</button>
          <button appButton variant="success" type="button">Encaisser un versement</button>
          <button appButton variant="outline" type="button">Contacter l'agent</button>
          <button appButton variant="ghost" type="button">Annuler</button>
          <button appButton variant="danger" type="button">Refuser la clôture</button>
          <button appButton type="button" disabled>Désactivé</button>
          <span class="rounded-control bg-primary p-2"
            ><button appButton variant="accent" type="button">Sur fond bleu</button></span
          >
        </div>
        <div class="grid max-w-md gap-3">
          <button
            appButton
            variant="success"
            size="xl"
            type="button"
            [block]="true"
            class="justify-start"
          >
            <ng-icon name="lucideScanLine" size="28" aria-hidden="true" />Scanner une carte
          </button>
          <div class="grid grid-cols-2 gap-3">
            <button
              appButton
              variant="outline"
              size="xl"
              type="button"
              class="flex-col items-start text-base"
            >
              <ng-icon name="lucideUserPlus" size="24" aria-hidden="true" />Inscrire un marchand
            </button>
            <button
              appButton
              variant="outline"
              size="xl"
              type="button"
              class="flex-col items-start text-base"
            >
              <ng-icon name="lucideRoute" size="24" aria-hidden="true" />Tournée de collecte
            </button>
          </div>
        </div>
      </div>
    </app-panel>

    <app-panel title="Pastilles de statut">
      <div class="flex flex-wrap gap-2 p-5">
        <app-status-chip label="Synchronisé" tone="success" />
        <app-status-chip label="Hors connexion · 8 en attente" tone="warning" />
        <app-status-chip label="Aucun signal depuis 2 h" tone="danger" />
        <app-status-chip label="Paiement en attente" tone="info" />
        <app-status-chip label="Saisie verrouillée depuis 16 h 00" tone="neutral" />
      </div>
    </app-panel>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs">
      <app-stat-card
        label="Collecté aujourd'hui"
        [value]="412500 | fcfa"
        hint="sur 612 marchands attendus"
      />
      <app-stat-card label="Versements enregistrés" [value]="287" hint="dont 41 par Wave" />
      <app-stat-card
        label="Marchands en retard"
        [value]="19"
        hint="dont 4 au deuxième retard"
        tone="danger"
      />
      <app-stat-card
        label="Espèces à remettre"
        [value]="298000 | fcfa"
        hint="par 6 agents, avant 16 h 00"
      />
    </section>

    <app-panel title="Étapes">
      <div class="p-5"><app-steps [steps]="closureSteps" [current]="1" /></div>
    </app-panel>

    <app-panel title="Champs">
      <form class="grid gap-4 p-5 sm:grid-cols-2" (submit)="$event.preventDefault()">
        <app-field
          label="Nom complet"
          for="sg-name"
          [required]="true"
          hint="Comme sur la pièce d'identité"
        >
          <input id="sg-name" appInput autocomplete="name" aria-describedby="sg-name-msg" />
        </app-field>
        <app-field
          label="Téléphone"
          for="sg-phone"
          [required]="true"
          error="Numéro incomplet : 10 chiffres"
        >
          <input
            id="sg-phone"
            appInput
            inputmode="tel"
            aria-invalid="true"
            aria-describedby="sg-phone-msg"
            value="07 00 00"
          />
        </app-field>
        <app-field label="Marché" for="sg-market">
          <select id="sg-market" appInput>
            <option>Adjamé</option>
            <option>Marcory</option>
            <option>Yopougon</option>
          </select>
        </app-field>
        <app-field label="Montant" for="sg-amount" hint="En francs CFA, sans virgule">
          <input
            id="sg-amount"
            appInput
            inputmode="numeric"
            aria-describedby="sg-amount-msg"
            value="1000"
          />
        </app-field>
      </form>
    </app-panel>

    <app-panel title="Tableau (cartes sur téléphone)">
      <span panel-aside class="text-sm text-ink-muted">Mise à jour il y a 12 secondes</span>
      <app-data-table
        caption="Activité des agents"
        [columns]="columns"
        [rows]="rows"
        [trackBy]="trackRow"
        [selectable]="true"
        [selectedKey]="selected()"
        (rowSelect)="selected.set($event.id)"
      >
        <ng-template appCell="device" let-row>
          <app-status-chip [label]="asRow(row).device.label" [tone]="asRow(row).device.tone" />
        </ng-template>
      </app-data-table>
    </app-panel>

    <div class="grid gap-4 lg:grid-cols-3">
      <app-panel title="État vide">
        <app-empty-state
          title="Aucun dossier en attente"
          text="Les nouveaux enrôlements apparaîtront ici."
        >
          <button appButton variant="outline" type="button">Voir tous les marchands</button>
        </app-empty-state>
      </app-panel>
      <app-panel title="Erreur">
        <app-error-state (retry)="toast.info('Nouvel essai…')" />
      </app-panel>
      <app-panel title="Chargement">
        <div class="p-5"><app-skeleton [lines]="5" /></div>
      </app-panel>
    </div>

    <app-panel title="Dialogues et messages">
      <div class="flex flex-wrap gap-3 p-5">
        <button appButton variant="outline" type="button" (click)="askReason()">
          Écart avec motif obligatoire
        </button>
        <button
          appButton
          variant="outline"
          type="button"
          (click)="toast.success('Versement enregistré', 'Mariam T. · 1 000 F')"
        >
          Message de succès
        </button>
        <button
          appButton
          variant="outline"
          type="button"
          (click)="toast.error('La caisse est fermée depuis 16 h 00.')"
        >
          Message d'erreur
        </button>
      </div>
    </app-panel>

    <app-panel title="Formats">
      <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 p-5 text-sm">
        <dt class="text-ink-muted">Montant</dt>
        <dd>{{ 297500 | fcfa }}</dd>
        <dt class="text-ink-muted">Écart</dt>
        <dd class="font-bold text-danger">{{ -500 | fcfa }}</dd>
        <dt class="text-ink-muted">Écriture</dt>
        <dd>{{ 5000 | fcfa: true }}</dd>
        <dt class="text-ink-muted">Date et heure</dt>
        <dd>{{ sampleDate | abidjanDate }}</dd>
        <dt class="text-ink-muted">Heure</dt>
        <dd>{{ sampleDate | abidjanDate: 'time' }}</dd>
        <dt class="text-ink-muted">Jour</dt>
        <dd>{{ sampleDate | abidjanDate: 'long' }}</dd>
        <dt class="text-ink-muted">Nom masqué</dt>
        <dd>{{ 'Mariam Traoré' | maskName }}</dd>
      </dl>
    </app-panel>
  `,
})
export class Styleguide {
  protected readonly session = inject(SessionStore);
  protected readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  protected readonly t = FR;
  protected readonly roles = ROLES;
  protected readonly selected = signal<string | undefined>(undefined);
  protected readonly sampleDate = '2026-11-02T13:05:00Z';

  protected readonly colors = [
    { name: 'Bleu marine', cls: 'bg-primary' },
    { name: 'Bleu roi', cls: 'bg-primary-deep' },
    { name: 'Bleu nuit', cls: 'bg-night' },
    { name: 'Or', cls: 'bg-accent' },
    { name: 'Or clair', cls: 'bg-accent-light' },
    { name: 'Vert émeraude', cls: 'bg-emerald' },
    { name: 'Vert sapin', cls: 'bg-sapin' },
    { name: 'Vert foncé', cls: 'bg-forest' },
    { name: 'Fond', cls: 'bg-bg' },
    { name: 'Succès', cls: 'bg-success-soft' },
    { name: 'Erreur', cls: 'bg-danger-soft' },
    { name: 'Attention', cls: 'bg-warning-soft' },
  ];

  protected readonly closureSteps: Step[] = [
    { label: 'Caissière', detail: 'Comptage à 16 h 30 · fait' },
    { label: 'Comptable', detail: 'Contrôle et rapprochement' },
    { label: 'Directeur général', detail: 'Validation finale' },
  ];

  protected readonly columns: Column<AgentRow>[] = [
    { key: 'name', label: 'Agent', value: (r) => r.name, primary: true },
    { key: 'zone', label: 'Zone', value: (r) => r.zone },
    { key: 'visits', label: 'Passages', value: (r) => r.visits },
    {
      key: 'collected',
      label: 'Collecté',
      value: (r) => new FcfaPipe().transform(r.collected),
      align: 'end',
    },
    { key: 'device', label: 'Appareil' },
  ];

  protected readonly rows: AgentRow[] = [
    {
      id: 'a1',
      name: 'Koffi A.',
      zone: 'Marché Gouro',
      visits: '37 / 52',
      collected: 48_500,
      device: { label: 'Synchronisé', tone: 'success' },
    },
    {
      id: 'a2',
      name: 'Moussa B.',
      zone: 'Siporex',
      visits: '29 / 48',
      collected: 41_500,
      device: { label: 'Hors connexion · 8 en attente', tone: 'warning' },
    },
    {
      id: 'a3',
      name: 'Fanta C.',
      zone: 'Sable',
      visits: '12 / 49',
      collected: 17_500,
      device: { label: 'Aucun signal depuis 2 h', tone: 'danger' },
    },
  ];

  protected readonly trackRow = (row: AgentRow) => row.id;
  protected asRow(row: unknown): AgentRow {
    return row as AgentRow;
  }

  protected preview(role: Role): void {
    this.session.switchRole(role);
    if (role === 'AGENT') void this.router.navigateByUrl('/agent/accueil');
  }

  protected askReason(): void {
    this.confirm
      .ask({
        title: 'Expliquer l’écart',
        message: 'Espèces comptées 297 500 F, attendues 298 000 F : écart de − 500 F.',
        confirmLabel: 'Envoyer au comptable',
        reasonRequired: true,
        reasonLabel: "Raison de l'écart",
      })
      .subscribe((r) => r.confirmed && this.toast.success('Envoyé au comptable', r.reason));
  }
}
