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
import { AgentToday, EnrollmentResult, PhoneCheck } from '../core/models';
import { MockControl } from './control';
import { MockDb } from './db';
import { mockBackendInterceptor } from './mock-backend.interceptor';

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
  const merchant = {
    fullName: 'Awa Test',
    phone: '07 99 88 77 66',
    market: 'Adjamé',
    trade: 'Vente de pagnes',
    idNumber: 'CI 1234 5678',
    idDocUrl: 'mock-upload://cni',
    photoUrl: 'mock-upload://shop',
    paymentChannel: 'CASH' as const,
    paymentConfirmed: true,
    cardNumber: blank.printedNumber,
  };
  return { http: TestBed.inject(HttpClient), db, blank, merchant };
}

async function errorOf(promise: Promise<unknown>): Promise<HttpErrorResponse> {
  try {
    await promise;
  } catch (e) {
    return e as HttpErrorResponse;
  }
  throw new Error('expected an error');
}

describe('agent enrollment (mock server) — paid on the spot, card handed over', () => {
  it('registers an ACTIVE member with the card, the 1 000 F and its ledger entry', async () => {
    const { http, db, blank, merchant } = await setup();
    const r = await firstValueFrom(http.post<EnrollmentResult>('/api/v1/members', merchant));

    expect(r.member.status).toBe('ACTIVE');
    expect(r.member.agentId).toBe('u-ag1');
    expect(r.member.accountNumber).toMatch(/^CPT-\d{6}$/);
    expect(r.member.cardId).toBe(blank.id);
    expect(r.card).toMatchObject({ status: 'ACTIVE', memberId: r.member.id });
    expect(r.payment).toMatchObject({
      amount: 1000,
      channel: 'CASH',
      status: 'CONFIRMED',
      agentId: 'u-ag1',
    });

    const entry = db.snapshot.ledger.at(-1)!;
    expect(entry.sourcePaymentId).toBe(r.payment.id);
    expect(entry.lines).toEqual([
      { account: '571', debit: 1000, credit: 0 },
      { account: '7061', debit: 0, credit: 1000 },
    ]);
    expect(db.snapshot.smsLog.at(-1)?.templateCode).toBe('ENROLLMENT');
    expect(db.snapshot.audit.at(-1)?.action).toBe('ENROLL_MEMBER');
  });

  it('books a Wave payment on the Wave account with the agent’s reference', async () => {
    const { http, db, merchant } = await setup();
    const r = await firstValueFrom(
      http.post<EnrollmentResult>('/api/v1/members', {
        ...merchant,
        paymentChannel: 'WAVE',
        paymentRef: 'TX-123',
      }),
    );
    expect(r.payment.channel).toBe('WAVE');
    expect(r.payment.externalRef).toBe('TX-123');
    expect(db.snapshot.ledger.at(-1)!.lines[0].account).toBe('5215');
  });

  it('adds the cash fee to what the agent must hand to the cashier', async () => {
    const { http, merchant } = await setup();
    const before = await firstValueFrom(http.get<AgentToday>('/api/v1/agent/today'));
    await firstValueFrom(http.post('/api/v1/members', merchant));
    const after = await firstValueFrom(http.get<AgentToday>('/api/v1/agent/today'));
    expect(after.enrolled).toBe(before.enrolled + 1);
    expect(after.toRemit).toBe(before.toRemit + 1000);
    expect(after.collected).toBe(before.collected + 1000);
  });

  it('refuses to register without the confirmed payment (nothing is written)', async () => {
    const { http, db, blank, merchant } = await setup();
    const members = db.snapshot.members.length;
    const err = await errorOf(
      firstValueFrom(http.post('/api/v1/members', { ...merchant, paymentConfirmed: false })),
    );
    expect(err.status).toBe(422);
    expect(Object.keys(err.error.details)).toEqual(['paymentConfirmed']);
    expect(db.snapshot.members.length).toBe(members);
    expect(db.snapshot.cards.find((c) => c.id === blank.id)?.status).toBe('UNASSIGNED');
  });

  it('refuses to register without a card', async () => {
    const { http, merchant } = await setup();
    const err = await errorOf(
      firstValueFrom(http.post('/api/v1/members', { ...merchant, cardNumber: undefined })),
    );
    expect(err.status).toBe(422);
    expect(Object.keys(err.error.details)).toEqual(['card']);
  });

  it('refuses a card already in use or unknown, without writing anything', async () => {
    const { http, db, merchant } = await setup();
    const used = db.snapshot.cards.find((c) => c.status === 'ACTIVE')!;
    const members = db.snapshot.members.length;
    const taken = await errorOf(
      firstValueFrom(http.post('/api/v1/members', { ...merchant, cardNumber: used.printedNumber })),
    );
    expect(taken.error.code).toBe('CARD_ALREADY_USED');
    const unknown = await errorOf(
      firstValueFrom(http.post('/api/v1/members', { ...merchant, cardNumber: 'WAS-999999' })),
    );
    expect(unknown.status).toBe(404);
    expect(db.snapshot.members.length).toBe(members);
  });

  it('accepts the scanned QR token or the short printed number', async () => {
    const { http, blank, merchant } = await setup();
    const short = String(Number(blank.printedNumber.slice(4)));
    const lookup = await firstValueFrom(
      http.get<{ card: { printedNumber: string } }>('/api/v1/cards/lookup', {
        params: { number: short },
      }),
    );
    expect(lookup.card.printedNumber).toBe(blank.printedNumber);
    const r = await firstValueFrom(
      http.post<EnrollmentResult>('/api/v1/members', {
        ...merchant,
        cardNumber: undefined,
        cardQrToken: blank.qrToken,
      }),
    );
    expect(r.card.id).toBe(blank.id);
  });

  it('detects a phone number already used (check + 409)', async () => {
    const { http, db, merchant } = await setup();
    const existing = db.snapshot.members[40];
    const check = await firstValueFrom(
      http.get<PhoneCheck>('/api/v1/members/phone-check', { params: { phone: existing.phone } }),
    );
    expect(check.available).toBe(false);
    expect(check.existingName).toMatch(/^\p{Lu}\*\*\*/u);
    const err = await errorOf(
      firstValueFrom(http.post('/api/v1/members', { ...merchant, phone: existing.phone })),
    );
    expect(err.status).toBe(409);
    expect(err.error.code).toBe('PHONE_ALREADY_USED');
  });

  it('refuses enrollment to roles other than agents (403)', async () => {
    const { http, merchant } = await setup();
    await TestBed.inject(AuthService).login({ role: 'CASHIER' });
    const err = await errorOf(firstValueFrom(http.post('/api/v1/members', merchant)));
    expect(err.status).toBe(403);
  });
});
