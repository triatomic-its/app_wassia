import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  InjectionToken,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCameraOff, lucideScanQrCode, lucideX } from '@ng-icons/lucide';
import { Observable } from 'rxjs';
import { ButtonDirective } from './button';

/**
 * Optional source of simulated scans (QR tokens). Provided only by the development mock layer so
 * a demo can run on a computer without a physical card; never provided in production.
 */
export const SIMULATED_QR_SCANS = new InjectionToken<Observable<string>>('SIMULATED_QR_SCANS');

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;
type JsQr = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' },
) => { data: string } | null;

/**
 * Scans the QR code printed on a WASSIA card with the device camera — the only way to identify a
 * card (client rule, 2026-11-10: no typed number). Uses the browser's native reader when present,
 * otherwise the `jsqr` decoder, loaded on demand.
 */
@Component({
  selector: 'app-card-scan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, ButtonDirective],
  providers: [provideIcons({ lucideScanQrCode, lucideX, lucideCameraOff })],
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
        Placez le code QR de la carte dans le cadre jaune.
      </p>
    } @else {
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
    <canvas #canvas class="hidden"></canvas>

    @if (cameraError()) {
      <p
        class="flex items-start gap-3 rounded-control bg-warning-soft p-3.5 text-sm text-warning"
        role="alert"
      >
        <ng-icon name="lucideCameraOff" size="22" class="shrink-0" aria-hidden="true" />
        {{ cameraError() }}
      </p>
    }
  `,
})
export class CardScan {
  readonly disabled = input(false);
  readonly scanLabel = input('Scanner le code QR de la carte');
  /** Emits the QR token read on the card. */
  readonly scanned = output<string>();

  protected readonly scanning = signal(false);
  protected readonly cameraError = signal<string | null>(null);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private stream: MediaStream | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
    inject(SIMULATED_QR_SCANS, { optional: true })
      ?.pipe(takeUntilDestroyed())
      .subscribe((token) => {
        if (this.disabled()) return;
        this.stop();
        this.scanned.emit(token);
      });
  }

  protected async start(): Promise<void> {
    this.cameraError.set(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set(
        'Cet appareil n’a pas de caméra utilisable. Utilisez le téléphone de collecte.',
      );
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
    } catch {
      this.cameraError.set(
        'La caméra n’est pas disponible. Autorisez la caméra pour WASSIA dans le téléphone, puis réessayez.',
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
    const video = this.video()?.nativeElement;
    if (!video || !this.stream) return;
    video.srcObject = this.stream;
    await video.play().catch(() => undefined);

    const read = await this.createReader(video);
    const loop = async () => {
      if (!this.stream) return;
      const token = await read().catch(() => null);
      if (token) {
        this.stop();
        this.scanned.emit(token);
        return;
      }
      this.timer = setTimeout(loop, 200);
    };
    void loop();
  }

  /** Native BarcodeDetector (Chrome Android) or jsQR on canvas frames (iPhone, others). */
  private async createReader(video: HTMLVideoElement): Promise<() => Promise<string | null>> {
    const Native = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (Native) {
      const detector = new Native({ formats: ['qr_code'] });
      return async () => (await detector.detect(video))[0]?.rawValue ?? null;
    }
    const jsQR = (await import('jsqr')).default as unknown as JsQr;
    const canvas = this.canvas()!.nativeElement;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    return async () => {
      if (!video.videoWidth) return null;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return (
        jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })?.data ??
        null
      );
    };
  }
}
