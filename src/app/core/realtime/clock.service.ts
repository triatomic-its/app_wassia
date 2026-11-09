import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

/**
 * Single source of "now" for business rules (16:00 cut-off, J+1, reminders).
 * With the real back end the offset stays 0; the dev panel can move the simulated clock.
 */
@Injectable({ providedIn: 'root' })
export class ClockService {
  private readonly offset = signal(0);
  private readonly tick = signal(Date.now());

  /** Offset applied to the device clock, in ms (dev only). */
  readonly offsetMs = this.offset.asReadonly();
  /** Reactive current time, refreshed every 15 s. */
  readonly now = computed(() => new Date(this.tick() + this.offset()));

  constructor() {
    const id = setInterval(() => this.tick.set(Date.now()), 15_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  /** Non-reactive current time. */
  current(): Date {
    return new Date(Date.now() + this.offset());
  }

  setOffset(ms: number): void {
    this.offset.set(ms);
    this.tick.set(Date.now());
  }
}
