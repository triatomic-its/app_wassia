import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideScanQrCode, lucideX } from '@ng-icons/lucide';
import { ButtonDirective } from './button';
import { InputDirective } from './field';

/** What identifies a card: the QR token (scan) or the printed number (typed). */
export interface CardRef {
  qr?: string;
  number?: string;
}

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

/**
 * Card identification: camera QR scan when the browser supports it (Chrome on Android),
 * otherwise — or as a fallback — the number printed on the card (`WAS-000124` or `124`).
 */
@Component({
  selector: 'app-card-scan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, ButtonDirective, InputDirective],
  providers: [provideIcons({ lucideScanQrCode, lucideX })],
  host: { class: 'flex flex-col gap-3' },
  template: `
    @if (scanning()) {
      <div class="relative overflow-hidden rounded-card bg-night">
        <video #video class="aspect-square w-full object-cover" playsinline muted></video>
        <div
          class="pointer-events-none absolute inset-[18%] rounded-card border-4 border-accent"
          aria-hidden="true"
        ></div>
        <button
          appButton
          variant="accent"
          type="button"
          class="absolute right-3 bottom-3"
          (click)="stop()"
        >
          <ng-icon name="lucideX" size="20" aria-hidden="true" />Arrêter
        </button>
      </div>
      <p class="text-center text-sm text-ink-muted" aria-live="polite">
        Placez le QR de la carte dans le cadre.
      </p>
    } @else if (cameraSupported) {
      <button
        appButton
        variant="success"
        size="xl"
        type="button"
        [block]="true"
        [disabled]="disabled()"
        (click)="start()"
      >
        <ng-icon name="lucideScanQrCode" size="28" aria-hidden="true" />{{ scanLabel() }}
      </button>
    }

    @if (cameraError()) {
      <p class="rounded-control bg-warning-soft p-3 text-sm text-warning" role="alert">
        {{ cameraError() }}
      </p>
    }

    <form class="flex flex-col gap-1.5" (submit)="submitNumber($event)">
      <label for="card-number" class="text-sm font-semibold">
        {{
          cameraSupported
            ? 'Ou écrivez le numéro imprimé sur la carte'
            : 'Numéro imprimé sur la carte'
        }}
      </label>
      <div class="flex gap-2">
        <input
          id="card-number"
          appInput
          autocapitalize="characters"
          autocomplete="off"
          placeholder="WAS-000124"
          [value]="number()"
          [disabled]="disabled()"
          (input)="number.set($any($event.target).value)"
        />
        <button appButton type="submit" [disabled]="disabled() || !number().trim()">Valider</button>
      </div>
    </form>
  `,
})
export class CardScan {
  readonly disabled = input(false);
  readonly scanLabel = input('Scanner le QR de la carte');
  readonly found = output<CardRef>();

  protected readonly cameraSupported =
    typeof window !== 'undefined' &&
    'BarcodeDetector' in window &&
    !!navigator.mediaDevices?.getUserMedia;
  protected readonly scanning = signal(false);
  protected readonly cameraError = signal<string | null>(null);
  protected readonly number = signal('');
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private stream: MediaStream | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  protected submitNumber(event: Event): void {
    event.preventDefault();
    const value = this.number().trim();
    if (value) this.found.emit({ number: value });
  }

  protected async start(): Promise<void> {
    this.cameraError.set(null);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
    } catch {
      this.cameraError.set(
        "La caméra n'est pas disponible. Écrivez le numéro imprimé sur la carte.",
      );
      return;
    }
    this.scanning.set(true);
    queueMicrotask(() => void this.attachAndDetect());
  }

  protected stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.scanning.set(false);
  }

  private async attachAndDetect(): Promise<void> {
    const el = this.video()?.nativeElement;
    if (!el || !this.stream) return;
    el.srcObject = this.stream;
    await el.play().catch(() => undefined);
    const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor })
      .BarcodeDetector;
    const detector = new Detector({ formats: ['qr_code'] });
    const loop = async () => {
      if (!this.stream) return;
      try {
        const codes = await detector.detect(el);
        if (codes[0]?.rawValue) {
          this.stop();
          this.found.emit({ qr: codes[0].rawValue });
          return;
        }
      } catch {
        // Frame not ready yet.
      }
      this.timer = setTimeout(loop, 250);
    };
    void loop();
  }
}
