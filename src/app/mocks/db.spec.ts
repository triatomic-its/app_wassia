import { TestBed } from '@angular/core/testing';
import { DB_KEY, MockDb } from './db';
import { MOCK_DATA_VERSION, MockData } from './seed/seed';

describe('MockDb storage', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [MockDb] });
  });

  it('re-seeds browser data that still has old role codes (would answer 401 to everyone)', () => {
    const fresh = TestBed.inject(MockDb).snapshot;
    const stale = {
      ...fresh,
      users: fresh.users.map((u) => ({ ...u, role: u.role.toUpperCase() })),
    } as unknown as MockData;
    localStorage.setItem(DB_KEY, JSON.stringify(stale));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MockDb] });
    const users = TestBed.inject(MockDb).snapshot.users;
    expect(users.some((u) => u.role === 'agent')).toBe(true);
    expect(MOCK_DATA_VERSION).toBe(5);
  });
});
