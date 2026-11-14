import { DestroyRef, Injectable, inject, signal, untracked } from '@angular/core';

export interface AgentHeaderState {
  title: string;
  /** Router link of the back arrow; omitted = no arrow. */
  back?: string;
  /** Called instead of navigating (e.g. previous wizard step). */
  onBack?: () => void;
}

/**
 * Lets an agent screen replace the greeting in the navy top bar by a title and a back arrow
 * (mockup "Inscrire un marchand"). Reset automatically when the screen is destroyed.
 */
@Injectable({ providedIn: 'root' })
export class AgentHeader {
  readonly state = signal<AgentHeaderState | null>(null);
  /** Presentation only: tall night header that the first card overlaps (mockup agent home). */
  readonly hero = signal(false);

  /** Call from a component constructor to get the tall overlapped header. */
  useHero(): void {
    this.hero.set(true);
    inject(DestroyRef).onDestroy(() => this.hero.set(false));
  }

  /** Call from a component constructor. */
  use(state: AgentHeaderState): void {
    this.state.set(state);
    inject(DestroyRef).onDestroy(() => {
      if (this.state() === state) this.state.set(null);
    });
  }

  /** Untracked read: safe to call from an effect without re-triggering it. */
  update(patch: Partial<AgentHeaderState>): void {
    const current = untracked(this.state);
    if (current) this.state.set({ ...current, ...patch });
  }
}
