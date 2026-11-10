import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Dev-only "virtual camera": the Démo panel pushes the QR token of a card here and the open
 * scanner (`app-card-scan`) receives it as if it had been read on a physical card.
 */
@Injectable()
export class MockScanner {
  private readonly subject = new Subject<string>();
  readonly scans$ = this.subject.asObservable();

  scan(qrToken: string): void {
    this.subject.next(qrToken);
  }
}
