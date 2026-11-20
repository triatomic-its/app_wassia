import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { Fait, FaitResume, ResultatSync } from '@core/models/registre.model';
import { LocalStore, MemoryLocalStore } from '@core/services/local-store.service';
import { NetworkStatus } from '@core/services/network-status.service';
import { QueuedDeposit } from '../models/offline.model';
import type { MemberDetail } from './agent-api.service';
import { buildCollectableCards } from './collect-cards';
import { CollectOffline, toFact } from './collect-offline.service';

const SYNC_URL = `${environment.registreBaseUrl}/synchronisations`;

const deposit = (key: string, amount = 1000): QueuedDeposit => ({
  key,
  memberId: 'acc-1',
  agentId: 'ag-1',
  amount,
  dateValeur: '2026-11-20',
  createdAt: `2026-11-20T10:00:0${key.length % 10}Z`,
  fullName: 'Mariam TRAORÉ',
  printedNumber: 'WAS-000124',
  state: 'pending',
});

const answer = (statut: ResultatSync['statut'], ordre: number, message?: string): ResultatSync => ({
  ordre,
  statut,
  insere: statut === 'insere',
  fait: statut === 'rejete' ? null : `f-${ordre}`,
  message: message ?? null,
});

describe('CollectOffline', () => {
  let online: ReturnType<typeof signal<boolean>>;
  let http: HttpTestingController;
  let store: MemoryLocalStore;

  function setup(): CollectOffline {
    online = signal(false);
    store = new MemoryLocalStore();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LocalStore, useValue: store },
        { provide: NetworkStatus, useValue: { online } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(CollectOffline);
  }

  afterEach(() => http.verify());

  it('sends nothing without network, and keeps the deposits on the phone', async () => {
    const offline = setup();
    await offline.enqueue(deposit('k1'));
    await offline.sync();
    http.expectNone(SYNC_URL);
    expect(offline.pending()).toHaveLength(1);
    expect(await store.getAll('collect-queue')).toHaveLength(1);
  });

  it('sends the registry fact of each cash deposit, with the same key as online', async () => {
    const offline = setup();
    expect(toFact(deposit('0f8a3c1e-1b2c-4d5e-8f90-a1b2c3d4e5f6', 700))).toEqual({
      type: 'EncaissementEspeces',
      champs: {
        canal: 'especes',
        cleIdempotence: 'versement-0f8a3c1e1b2c4d5e8f90a1b2c3d4e5f6',
        dateValeur: '2026-11-20',
        montantFcfa: 700,
        nature: 'epargne',
      },
      predecesseurs: { agent: ['ag-1'], compte: ['acc-1'] },
      auteur: 'ag-1',
    });
    expect(offline.pending()).toEqual([]);
  });

  it('removes what the registry recorded or already had; keeps what it refused, explained', async () => {
    const offline = setup();
    await offline.enqueue(deposit('k1'));
    await offline.enqueue(deposit('k22'));
    await offline.enqueue(deposit('k333'));
    await offline.enqueue(deposit('k4444'));
    online.set(true);
    const done = offline.sync();
    let req!: TestRequest;
    await vi.waitFor(() => {
      req = http.expectOne(SYNC_URL);
    });
    expect((req.request.body as { faits: unknown[] }).faits).toHaveLength(4);
    req.flush([
      answer('insere', 1),
      answer('deja_connu', 2),
      answer('conflit', 3, 'hm_conflict: le type EncaissementEspeces a déjà le fait…'),
      answer('rejete', 4, 'hm: prédécesseur eee introuvable pour le rôle compte'),
    ]);
    await done;
    expect(offline.pending()).toEqual([]);
    expect(offline.failed().map((d) => d.key)).toEqual(['k4444']);
    expect(offline.failed()[0].error).not.toMatch(/hm|prédécesseur/);
    expect((await store.getAll<QueuedDeposit>('collect-queue')).map((d) => d.key)).toEqual([
      'k4444',
    ]);
    await offline.dismiss('k4444');
    expect(offline.queue()).toEqual([]);
  });

  it('keeps everything and says why when the network drops during the send', async () => {
    const offline = setup();
    await offline.enqueue(deposit('k1'));
    online.set(true);
    const done = offline.sync();
    let req!: TestRequest;
    await vi.waitFor(() => {
      req = http.expectOne(SYNC_URL);
    });
    req.error(new ProgressEvent('error'));
    await done;
    expect(offline.pending()).toHaveLength(1);
    expect(offline.syncError()).toMatch(/connexion/);
  });
});

describe('buildCollectableCards', () => {
  const fait = (id: string, type: string, preds: Record<string, string>, recuLe: string): Fait => ({
    fait: id,
    type,
    champs: {},
    recuLe,
    predecesseurs: Object.entries(preds).map(([role, predecesseur]) => ({ role, predecesseur })),
  });
  const qr = (id: string, jeton: string): FaitResume => ({
    fait: id,
    type: 'CarteQr',
    champs: { jeton },
    recuLe: '2026-11-20T09:00:00Z',
  });
  const member = (id: string, name: string): MemberDetail => ({
    member: {
      id,
      fullName: name,
      phone: '',
      market: '',
      trade: '',
      agentId: '',
      status: 'PENDING_VALIDATION',
      savings: 0,
      createdAt: '',
      updatedAt: '',
    },
    card: { id: 'c', printedNumber: 'WAS-000003', qrToken: '', status: 'ASSIGNED' },
    payments: [],
    loans: [],
  });

  it('keys associated cards by their QR token and skips blank ones', () => {
    const cards = buildCollectableCards(
      [qr('card-1', 'tok-1'), qr('card-2', 'tok-2')],
      [
        fait(
          'l1',
          'AssociationCarte',
          { carte: 'card-1', compte: 'acc-1' },
          '2026-11-20T10:00:00Z',
        ),
      ],
      [member('acc-1', 'Awa KONÉ')],
    );
    expect(cards).toEqual([
      {
        key: 'tok-1',
        cardId: 'card-1',
        memberId: 'acc-1',
        fullName: 'Awa KONÉ',
        printedNumber: 'WAS-000003',
        status: 'PENDING_VALIDATION',
        balance: null,
      },
    ]);
  });
});
