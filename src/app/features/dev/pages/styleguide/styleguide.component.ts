import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideScanLine, lucideUserPlus, lucideRoute, lucideSend } from '@ng-icons/lucide';
import { AuthService } from '@core/auth/auth.service';
import { SessionStore } from '@core/auth/session.store';
import { FR } from '@core/i18n/fr';
import { ROLES, Role } from '@core/models';
import { AbidjanDatePipe } from '@shared/pipes/abidjan-date.pipe';
import { FcfaPipe } from '@shared/pipes/fcfa.pipe';
import { MaskNamePipe } from '@shared/pipes/mask-name.pipe';
import { ButtonDirective } from '@shared/directives/button.directive';
import { ConfirmService } from '@shared/services/confirm.service';
import { CellDirective } from '@shared/directives/cell.directive';
import { Column, DataTable } from '@shared/components/data-table/data-table.component';
import { Field } from '@shared/components/field/field.component';
import { InputDirective } from '@shared/directives/input.directive';
import { PageHeader } from '@shared/components/page-header/page-header.component';
import { Panel } from '@shared/components/panel/panel.component';
import { EmptyState } from '@shared/components/empty-state/empty-state.component';
import { ErrorState } from '@shared/components/error-state/error-state.component';
import { Skeleton } from '@shared/components/skeleton/skeleton.component';
import { StatCard } from '@shared/components/stat-card/stat-card.component';
import { StatusChip, Tone } from '@shared/components/status-chip/status-chip.component';
import { Step, Steps } from '@shared/components/steps/steps.component';
import { ToastService } from '@core/services/toast.service';

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
  templateUrl: './styleguide.component.html',
})
export class Styleguide {
  protected readonly session = inject(SessionStore);
  protected readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
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

  /** Logs in as another demo profile (same as the dev panel). */
  protected async preview(role: Role): Promise<void> {
    await this.auth.login({ role });
    if (role === 'AGENT') await this.router.navigateByUrl('/agent/accueil');
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
