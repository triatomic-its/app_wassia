import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Online/offline signal used by the offline banner and the agent sync badge. */
@Injectable({ providedIn: 'root' })
export class NetworkStatus {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly _online = signal(this.window?.navigator.onLine ?? true);
  readonly online = this._online.asReadonly();

  constructor() {
    const win = this.window;
    if (!win) return;
    const update = () => this._online.set(win.navigator.onLine);
    win.addEventListener('online', update);
    win.addEventListener('offline', update);
    inject(DestroyRef).onDestroy(() => {
      win.removeEventListener('online', update);
      win.removeEventListener('offline', update);
    });
  }
}
