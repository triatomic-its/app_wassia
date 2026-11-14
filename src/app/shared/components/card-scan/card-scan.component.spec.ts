import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { CardScan, SIMULATED_QR_SCANS } from './card-scan.component';

function render(withSimulator = true) {
  const scans = new Subject<string>();
  TestBed.configureTestingModule({
    imports: [CardScan],
    providers: withSimulator ? [{ provide: SIMULATED_QR_SCANS, useValue: scans }] : [],
  });
  const fixture = TestBed.createComponent(CardScan);
  const emitted: string[] = [];
  fixture.componentInstance.scanned.subscribe((t) => emitted.push(t));
  fixture.detectChanges();
  return { fixture, scans, emitted, el: fixture.nativeElement as HTMLElement };
}

describe('CardScan', () => {
  it('only offers the camera: no field to type a card number', () => {
    const { el } = render();
    expect(el.textContent).toContain('Scanner le code QR de la carte');
    expect(el.querySelector('input')).toBeNull();
  });

  it('emits the QR token read on the card', () => {
    const { scans, emitted } = render();
    scans.next('ABCDEF234567');
    expect(emitted).toEqual(['ABCDEF234567']);
  });

  it('ignores scans while disabled', () => {
    const { fixture, scans, emitted } = render();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    scans.next('ABCDEF234567');
    expect(emitted).toEqual([]);
  });

  it('explains plainly when there is no camera', async () => {
    const { el, fixture } = render(false);
    const original = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    el.querySelector('button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('n’a pas de caméra utilisable');
    Object.defineProperty(navigator, 'mediaDevices', { value: original, configurable: true });
  });
});
