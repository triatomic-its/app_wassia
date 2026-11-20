import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCloudUpload, lucideTriangleAlert } from '@ng-icons/lucide';
import { plural } from '@core/i18n/plural';
import { NetworkStatus } from '@core/services/network-status.service';
import { Alert } from '@shared/components/alert/alert.component';
import { ButtonDirective } from '@shared/directives/button.directive';
import { FcfaPipe } from '@shared/pipes/fcfa.pipe';
import { CollectOffline } from '../../services/collect-offline.service';

/**
 * Deposits taken without network and still on the phone: how many, the total, "Envoyer
 * maintenant", and the ones the registry refused. Shows nothing when the queue is empty.
 */
@Component({
  selector: 'app-pending-deposits',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, Alert, ButtonDirective, FcfaPipe],
  providers: [provideIcons({ lucideCloudUpload, lucideTriangleAlert })],
  host: { class: 'flex flex-col gap-2.5 empty:hidden' },
  templateUrl: './pending-deposits.component.html',
})
export class PendingDeposits {
  protected readonly offline = inject(CollectOffline);
  protected readonly online = inject(NetworkStatus).online;
  protected readonly title = computed(() =>
    plural(this.offline.pending().length, 'versement à envoyer', 'versements à envoyer'),
  );
}
