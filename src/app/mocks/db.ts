import { Injectable, inject, signal } from '@angular/core';
import { ClockService } from '@core/services/clock.service';
import { MOCK_DATA_VERSION, MockData, seedMockData } from './seed/seed';
import { readJson, removeKey, writeJson } from './storage';

/** Versioned key: bumping MOCK_DATA_VERSION discards old browser data. */
export const DB_KEY = `wassia.mock.db.v${MOCK_DATA_VERSION}`;

/**
 * In-memory fake database, persisted in localStorage so a refresh keeps the demo state.
 * "Réinitialiser" in the dev panel re-seeds it.
 */
@Injectable()
export class MockDb {
  private readonly clock = inject(ClockService);
  private data: MockData;
  /** Bumped on every write so the dev panel can refresh its counters. */
  readonly revision = signal(0);

  constructor() {
    const stored = readJson<MockData>(DB_KEY);
    this.data = stored?.version === MOCK_DATA_VERSION ? stored : this.seedAndSave();
  }

  get snapshot(): Readonly<MockData> {
    return this.data;
  }

  /** Applies a mutation and persists it. */
  write<T>(mutate: (data: MockData) => T): T {
    const result = mutate(this.data);
    writeJson(DB_KEY, this.data);
    this.revision.update((r) => r + 1);
    return result;
  }

  reset(): void {
    removeKey(DB_KEY);
    this.data = this.seedAndSave();
    this.revision.update((r) => r + 1);
  }

  private seedAndSave(): MockData {
    const data = seedMockData(this.clock.current());
    writeJson(DB_KEY, data);
    return data;
  }
}
