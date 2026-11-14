import { Injectable, effect, inject, signal } from '@angular/core';
import { ClockService } from '@core/services/clock.service';
import { readJson, writeJson } from './storage';

export type FaultKind = 'none' | '401' | '403' | '404' | '409' | '422' | '500' | 'network';

export const FAULTS: readonly { kind: FaultKind; label: string }[] = [
  { kind: 'none', label: 'Aucune' },
  { kind: '401', label: '401 — session expirée' },
  { kind: '403', label: '403 — accès refusé' },
  { kind: '404', label: '404 — introuvable' },
  { kind: '409', label: '409 — conflit' },
  { kind: '422', label: '422 — données invalides' },
  { kind: '500', label: '500 — erreur serveur' },
  { kind: 'network', label: 'Réseau coupé' },
];

interface ControlState {
  latencyMin: number;
  latencyMax: number;
  fault: FaultKind;
  /** Apply the fault to the next request only. */
  faultOnce: boolean;
  clockOffsetMs: number;
}

const KEY = 'wassia.mock.control.v1';
const DEFAULTS: ControlState = {
  latencyMin: 200,
  latencyMax: 800,
  fault: 'none',
  faultOnce: true,
  clockOffsetMs: 0,
};

/** Dev-panel settings for the fake back end: latency, injected errors, simulated clock. */
@Injectable()
export class MockControl {
  private readonly clock = inject(ClockService);
  readonly state = signal<ControlState>({ ...DEFAULTS, ...readJson<Partial<ControlState>>(KEY) });

  constructor() {
    this.clock.setOffset(this.state().clockOffsetMs);
    effect(() => writeJson(KEY, this.state()));
  }

  update(patch: Partial<ControlState>): void {
    this.state.update((s) => ({ ...s, ...patch }));
    if (patch.clockOffsetMs !== undefined) this.clock.setOffset(patch.clockOffsetMs);
  }

  latency(): number {
    const { latencyMin, latencyMax } = this.state();
    if (latencyMax <= 0) return 0;
    return latencyMin + Math.round(Math.random() * Math.max(latencyMax - latencyMin, 0));
  }

  /** Returns the fault to apply to this request (and clears it when "once"). */
  takeFault(): FaultKind {
    const { fault, faultOnce } = this.state();
    if (fault !== 'none' && faultOnce) this.update({ fault: 'none' });
    return fault;
  }
}
