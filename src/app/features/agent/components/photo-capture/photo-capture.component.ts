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
import { lucideCamera, lucideCheck } from '@ng-icons/lucide';

/**
 * Photo field (mockup step 2): opens the back camera on phones and emits the picture; the
 * parent uploads it and passes back the stored reference (`url`), progress and error.
 * Status = icon + text, never colour alone.
 */
@Component({
  selector: 'app-photo-capture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [provideIcons({ lucideCamera, lucideCheck })],
  host: { class: 'block' },
  templateUrl: './photo-capture.component.html',
})
export class PhotoCapture {
  readonly label = input.required<string>();
  /** Uploaded reference, if any. */
  readonly url = input<string>();
  readonly busy = input(false);
  readonly error = input<string | null>();
  readonly picked = output<File>();

  /** Local preview (object URL) of the last picture taken; never sent anywhere. */
  protected readonly preview = signal<string | null>(null);
  protected readonly actionLabel = computed(() => (this.url() ? 'Refaire' : 'Prendre'));
  protected readonly inputLabel = computed(
    () => `${this.url() ? 'Refaire la photo' : 'Prendre la photo'} : ${this.label()}`,
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revokePreview());
  }

  protected takePicture(event: Event): void {
    const fileInput = event.target;
    if (!(fileInput instanceof HTMLInputElement)) return;
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    this.revokePreview();
    this.preview.set(URL.createObjectURL(file));
    this.picked.emit(file);
  }

  private revokePreview(): void {
    const preview = this.preview();
    if (preview) URL.revokeObjectURL(preview);
  }
}
