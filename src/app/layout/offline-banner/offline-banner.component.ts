import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideWifiOff } from '@ng-icons/lucide';
import { FR } from '@core/i18n/fr';
import { NetworkStatus } from '@core/services/network-status.service';

/** Sticky banner shown when the device loses connectivity. */
@Component({
  selector: 'app-offline-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideWifiOff })],
  templateUrl: './offline-banner.component.html',
})
export class OfflineBanner {
  protected readonly network = inject(NetworkStatus);
  protected readonly text = FR.layout.offline;
}
