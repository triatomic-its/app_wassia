import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from '../core/api/interceptors';
import { MockAuthService } from '../core/auth/auth.mock';
import { AuthService } from '../core/auth/auth.service';
import { AgentToday, CardAssignResult, EnrollmentResult, PhoneCheck } from '../core/models';
import { MockControl } from './control';
import { MockDb } from './db';
import { mockBackendInterceptor } from './mock-backend.interceptor';

const MERCHANT = {
  fullName: 'Awa Test',
  phone: '07 99 88 77 66',
  market: 'Adjamé',
  trade: 'Vente de pagnes',
  idNumber: 'CI 1234 5678',
  idDocUrl: 'mock-upload://cni',
  photoUrl: 'mock-upload://shop',
  paymentChannel: 'CASH' as const,
  paymentConfirmed: true,
};

async function setup() {
  localStorage.clear();
  sessionStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor, mockBackendInterceptor])),
      MockDb,
      MockControl,
      { provide: AuthService, useClass: MockAuthService },
    ],
  });
  TestBed.inject(MockControl).update({ latencyMin: 0, latencyMax: 0, fault: 'none' });
  await TestBed.inject(AuthService).login({ role: 'AGENT' });
  const db = TestBed.inject(MockDb);
  const blank = db.snapshot.cards.find((c) => c.status === 'UNASSIGNED')!;
  return { http: TestBed.inject(HttpClient), db, blank };
}

async function errorOf(promise: Promise<unknown>): Promise<HttpErrorResponse> {
  try {
    await promise;
  } catch (e) {
    return e as HttpErrorResponse;
  }
  throw new Error('expected an error');
}

describe('agent enrollment (mock server): pay on the spot, then scan the card', () => {
  it('registers a paid member waiting for a card, with the 1 000 F and its ledger entry', async () => {
    const { http, db } = await setup();
    const r = await firstValueFrom(http.post<EnrollmentResult>('/api/v1/members', MERCHANT));

    expect(r.member.status).toBe('CARD_TO_ASSIGN');
    expect(r.member.cardId).toBeUndefined();
    expect(r.member.agentId).toBe('u-ag1');
    expect(r.member.accountNumber).toMatch(/^CPT-\d{6}$/);
    expect(r.payment).toMatchObject({ amount: 1000, channel: 'CASH', status: 'CONFIRMED' });
    expect(db.snapshot.ledger.at(-1)!.lines).toEqual([
      { account: '571', debit: 1000, credit: 0 },
      { account: '7061', debit: 0, credit: 1000 },
    ]);
    expect(db.snapshot.audit.at(-1)?.action).toBe('ENROLL_MEMBER');
  });

  it('books a Wave payment on the Wave account with the agent’s reference', async () => {
    const { http, db } = await setup();
    const r = await firstValueFrom(
      http.post<EnrollmentResult>('/api/v1/members', {
        ...MERCHANT,
        paymentChannel: 'WAVE',
        paymentRef: 'TX-123',
      }),
    );
    expect(r.payment.externalRef).toBe('TX-123');
    expect(db.snapshot.ledger.at(-1)!.lines[0].account).toBe('5215');
  });

  it('refuses to register without the confirmed payment (nothing is written)', async () => {
    const { http, db } = await setup();
    const members = db.snapshot.members.length;
    const err = await errorOf(
      firstValueFrom(http.post('/api/v1/members', { ...MERCHANT, paymentConfirmed: false })),
    );
    expect(err.status).toBe(422);
    expect(Object.keys(err.error.details)).toEqual(['paymentConfirmed']);
    expect(db.snapshot.members.length).toBe(members);
  });

  it('activates the member when the agent scans a blank card, then sends the SMS', async () => {
    const { http, db, blank } = await setup();
    const { member } = await firstValueFrom(
      http.post<EnrollmentResult>('/api/v1/members', MERCHANT),
    );
    const lookup = await firstValueFrom(
      http.get<{ card: { printedNumber: string; status: string } }>('/api/v1/cards/lookup', {
        params: { qr: blank.qrToken },
      }),
    );
    expect(lookup.card).toMatchObject({ printedNumber: blank.printedNumber, status: 'UNASSIGNED' });

    const r = await firstValueFrom(
      http.post<CardAssignResult>('/api/v1/cards/assign', {
        memberId: member.id,
        qrToken: blank.qrToken,
      }),
    );
    expect(r.member.status).toBe('ACTIVE');
    expect(r.member.cardId).toBe(blank.id);
    expect(r.card).toMatchObject({ status: 'ACTIVE', memberId: member.id });
    expect(db.snapshot.smsLog.at(-1)?.templateCode).toBe('ENROLLMENT');
    expect(db.snapshot.audit.at(-1)?.action).toBe('ASSIGN_CARD');

    const again = await errorOf(
      firstValueFrom(
        http.post('/api/v1/cards/assign', { memberId: member.id, qrToken: blank.qrToken }),
      ),
    );
    expect(again.error.code).toBe('INVALID_STATUS');
  });

  it('accepts the scanned QR only — a typed card number is refused', async () => {
    const { http, blank } = await setup();
    const { member } = await firstValueFrom(
      http.post<EnrollmentResult>('/api/v1/members', MERCHANT),
    );
    const err = await errorOf(
      firstValueFrom(
        http.post('/api/v1/cards/assign', { memberId: member.id, number: blank.printedNumber }),
      ),
    );
    expect(err.status).toBe(422);
    expect(err.error.code).toBe('QR_REQUIRED');
  });

  it('refuses a card already in use or a QR that is not a WASSIA card', async () => {
    const { http, db } = await setup();
    const { member } = await firstValueFrom(
      http.post<EnrollmentResult>('/api/v1/members', MERCHANT),
    );
    const used = db.snapshot.cards.find((c) => c.status === 'ACTIVE')!;
    const taken = await errorOf(
      firstValueFrom(
        http.post('/api/v1/cards/assign', { memberId: member.id, qrToken: used.qrToken }),
      ),
    );
    expect(taken.error.code).toBe('CARD_ALREADY_USED');
    const foreign = await errorOf(
      firstValueFrom(
        http.post('/api/v1/cards/assign', { memberId: member.id, qrToken: 'https://example.com' }),
      ),
    );
    expect(foreign.status).toBe(404);
    expect(db.snapshot.members.find((m) => m.id === member.id)?.status).toBe('CARD_TO_ASSIGN');
  });

  it('does not let an agent associate a card for another agent’s merchant', async () => {
    const { http, db, blank } = await setup();
    const other = db.snapshot.members.find(
      (m) => m.agentId !== 'u-ag1' && m.status === 'CARD_TO_ASSIGN',
    )!;
    const err = await errorOf(
      firstValueFrom(
        http.post('/api/v1/cards/assign', { memberId: other.id, qrToken: blank.qrToken }),
      ),
    );
    expect(err.status).toBe(403);
  });

  it('counts cash fees to remit and cards still to associate', async () => {
    const { http, blank } = await setup();
    const before = await firstValueFrom(http.get<AgentToday>('/api/v1/agent/today'));
    const { member } = await firstValueFrom(
      http.post<EnrollmentResult>('/api/v1/members', MERCHANT),
    );
    const mid = await firstValueFrom(http.get<AgentToday>('/api/v1/agent/today'));
    expect(mid.enrolled).toBe(before.enrolled + 1);
    expect(mid.toRemit).toBe(before.toRemit + 1000);
    expect(mid.cardsToAssign).toBe(before.cardsToAssign + 1);
    await firstValueFrom(
      http.post('/api/v1/cards/assign', { memberId: member.id, qrToken: blank.qrToken }),
    );
    const after = await firstValueFrom(http.get<AgentToday>('/api/v1/agent/today'));
    expect(after.cardsToAssign).toBe(before.cardsToAssign);
  });

  it('detects a phone number already used (check + 409)', async () => {
    const { http, db } = await setup();
    const existing = db.snapshot.members[40];
    const check = await firstValueFrom(
      http.get<PhoneCheck>('/api/v1/members/phone-check', { params: { phone: existing.phone } }),
    );
    expect(check.available).toBe(false);
    const err = await errorOf(
      firstValueFrom(http.post('/api/v1/members', { ...MERCHANT, phone: existing.phone })),
    );
    expect(err.error.code).toBe('PHONE_ALREADY_USED');
  });

  it('refuses enrollment to roles other than agents (403)', async () => {
    const { http } = await setup();
    await TestBed.inject(AuthService).login({ role: 'CASHIER' });
    expect((await errorOf(firstValueFrom(http.post('/api/v1/members', MERCHANT)))).status).toBe(
      403,
    );
  });
});
