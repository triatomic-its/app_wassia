import { Dialog } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  ConfirmDialog,
  ConfirmOptions,
  ConfirmResult,
} from '../components/confirm-dialog/confirm-dialog.component';

/** Opens the confirmation dialog; emits once, `{ confirmed: false }` when dismissed. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(Dialog);

  ask(options: ConfirmOptions): Observable<ConfirmResult> {
    const ref = this.dialog.open<ConfirmResult, ConfirmOptions>(ConfirmDialog, {
      data: options,
      ariaLabelledBy: 'confirm-title',
      backdropClass: ['bg-night/50'],
    });
    return ref.closed.pipe(map((result) => result ?? { confirmed: false }));
  }
}
