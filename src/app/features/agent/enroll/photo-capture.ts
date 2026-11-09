import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCamera, lucideCircleCheck } from '@ng-icons/lucide';
import { toApiError } from '../../../core/api/error.model';
import { AgentApi } from '../data/agent.api';

export interface CapturedPhoto {
  url: string;
  /** Local preview (object URL), not persisted. */
  preview: string;
}

/**
 * Photo field (mockup step 2): opens the back camera on phones, uploads the picture and
 * returns its reference. Status = icon + text, never colour alone.
 */
@Component({
  selector: 'app-photo-capture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideCamera, lucideCircleCheck })],
  host: { class: 'block' },
  template: `
    <div
      class="flex items-center gap-3 rounded-card border bg-surface p-3"
      [class.border-danger]="shownError()"
      [class.border-border]="!shownError()"
    >
      <div
        class="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-control bg-neutral-soft text-ink-muted"
      >
        @if (preview()) {
          <img [src]="preview()" alt="" class="size-full object-cover" />
        } @else {
          <ng-icon
            [name]="url() ? 'lucideCircleCheck' : 'lucideCamera'"
            size="26"
            aria-hidden="true"
          />
        }
      </div>
      <div class="min-w-0 flex-1">
        <div class="font-semibold">{{ label() }}</div>
        @if (busy()) {
          <div class="text-sm text-ink-muted">Envoi de la photo…</div>
        } @else if (url()) {
          <div class="flex items-center gap-1 text-sm font-semibold text-success">
            <ng-icon name="lucideCircleCheck" size="16" aria-hidden="true" />Photo enregistrée
          </div>
        } @else {
          <div
            class="text-sm"
            [class.text-danger]="shownError()"
            [class.font-semibold]="shownError()"
            [class.text-ink-muted]="!shownError()"
          >
            {{ shownError() || 'Obligatoire' }}
          </div>
        }
      </div>
      <label
        class="flex min-h-12 cursor-pointer items-center rounded-control border-[1.5px] border-primary px-4 font-display text-sm font-bold text-primary hover:bg-info-soft focus-within:outline-3 focus-within:outline-accent"
      >
        {{ url() ? 'Refaire' : 'Prendre' }}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          class="sr-only"
          [attr.aria-label]="(url() ? 'Refaire la photo : ' : 'Prendre la photo : ') + label()"
          [disabled]="busy()"
          (change)="onFile($event)"
        />
      </label>
    </div>
  `,
})
export class PhotoCapture {
  readonly label = input.required<string>();
  /** Uploaded reference, if any. */
  readonly url = input<string | undefined>();
  readonly error = input<string | undefined>();
  readonly captured = output<CapturedPhoto>();

  private readonly api = inject(AgentApi);
  protected readonly preview = signal<string | null>(null);
  protected readonly busy = signal(false);
  private readonly uploadError = signal<string | null>(null);
  protected readonly shownError = computed(() => this.uploadError() ?? this.error());

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      const p = this.preview();
      if (p) URL.revokeObjectURL(p);
    });
  }

  protected onFile(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    const old = this.preview();
    if (old) URL.revokeObjectURL(old);
    const preview = URL.createObjectURL(file);
    this.preview.set(preview);
    this.busy.set(true);
    this.uploadError.set(null);
    this.api.upload(file).subscribe({
      next: (url) => {
        this.busy.set(false);
        this.captured.emit({ url, preview });
      },
      error: (e) => {
        this.busy.set(false);
        this.uploadError.set(toApiError(e).message);
      },
    });
  }
}
