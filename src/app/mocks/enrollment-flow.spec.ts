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
import { AgentToday, CardAssignResult, Member, PhoneCheck } from '../core/models';
import { MockControl } from './control';
import { MockDb } from './db';
import { confirmMembershipPayment } from './domain';
import { mockBackendInterceptor } from './mock-backend.interceptor';

const NEW_MERCHANT = {
  fullName: 'Awa Test',
  phone: '07 99 88 77 66',
  market: 'Adjamé',
  trade: 'Vente de pagnes',
  idNumber: 'CI 1234 5678',
  idDocUrl: 'mock-upload://cni',
  photoUrl: 'mock-upload://shop',
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
  return { http: TestBed.inject(HttpClient), db: TestBed.inject(MockDb) };
}

async function errorOf(promise: Promise<unknown>): Promise<HttpErrorResponse> {
  try {
    await promise;
  } catch (e) {
    return e as HttpErrorResponse;
  }
  throw new Error('expected an error');
}

describe('agent enrollment flow (mock server)', () => {
  it('creates the account automatically, sends the payment SMS and logs the action', async () => {
    const { http, db } = await setup();
    const smsBefore = db.snapshot.smsLog.length;
    const member = await firstValueFrom(http.post<Member>('/api/v1/members', NEW_MERCHANT));
    expect(member.status).toBe('PAYMENT_PENDING');
    expect(member.agentId).toBe('u-ag1');
    expect(member.accountNumber).toMatch(/^CPT-\d{6}$/);
    expect(member.phone).toBe('07 99 88 77 66');
    const sms = db.snapshot.smsLog.slice(smsBefore);
    expect(sms).toHaveLength(1);
    expect(sms[0].templateCode).toBe('PAYMENT_LINK');
    expect(sms[0].body).toContain('Awa Test');
    expect(sms[0].body).toContain('1000');
    expect(db.snapshot.audit.at(-1)?.action).toBe('CREATE_ACCOUNT');
  });

  it('detects a phone number already used (check + 409 on create)', async () => {
    const { http, db } = await setup();
    const existing = db.snapshot.members[40];
    const check = await firstValueFrom(
      http.get<PhoneCheck>('/api/v1/members/phone-check', { params: { phone: existing.phone } }),
    );
    expect(check.available).toBe(false);
    expect(check.existingName).toMatch(/^\p{Lu}\*\*\*/u);
    const err = await errorOf(
      firstValueFrom(http.post('/api/v1/members', { ...NEW_MERCHANT, phone: existing.phone })),
    );
    expect(err.status).toBe(409);
    expect(err.error.code).toBe('PHONE_ALREADY_USED');
  });

  it('refuses an incomplete file with field details (422)', async () => {
    const { http } = await setup();
    const err = await errorOf(
      firstValueFrom(http.post('/api/v1/members', { ...NEW_MERCHANT, photoUrl: undefined })),
    );
    expect(err.status).toBe(422);
    expect(Object.keys(err.error.details)).toEqual(['photoUrl']);
  });

  it('refuses enrollment to roles other than agents (403)', async () => {
    const { http } = await setup();
    await TestBed.inject(AuthService).login({ role: 'CASHIER' });
    expect((await errorOf(firstValueFrom(http.post('/api/v1/members', NEW_MERCHANT)))).status).toBe(
      403,
    );
  });

  it('associates a blank card only after the 1 000 F payment', async () => {
    const { http, db } = await setup();
    const member = await firstValueFrom(http.post<Member>('/api/v1/members', NEW_MERCHANT));
    const blank = db.snapshot.cards.find((c) => c.status === 'UNASSIGNED')!;

    const early = await errorOf(
      firstValueFrom(
        http.post('/api/v1/cards/assign', { memberId: member.id, number: blank.printedNumber }),
      ),
    );
    expect(early.error.code).toBe('PAYMENT_MISSING');

    db.write((d) => confirmMembershipPayment(d, member.id, 'WAVE', new Date()));
    expect(db.snapshot.members.find((m) => m.id === member.id)?.status).toBe('CARD_TO_ASSIGN');
    const entry = db.snapshot.ledger.at(-1)!;
    expect(entry.lines).toEqual([
      { account: '5215', debit: 1000, credit: 0 },
      { account: '7061', debit: 0, credit: 1000 },
    ]);

    const used = db.snapshot.cards.find((c) => c.status === 'ACTIVE')!;
    const taken = await errorOf(
      firstValueFrom(
        http.post('/api/v1/cards/assign', { memberId: member.id, number: used.printedNumber }),
      ),
    );
    expect(taken.error.code).toBe('CARD_ALREADY_USED');

    const unknown = await errorOf(
      firstValueFrom(
        http.post('/api/v1/cards/assign', { memberId: member.id, number: 'WAS-999999' }),
      ),
    );
    expect(unknown.status).toBe(404);

    // The printed number can be typed short ("104") or scanned (QR token).
    const short = String(Number(blank.printedNumber.slice(4)));
    const lookup = await firstValueFrom(
      http.get<{ card: { printedNumber: string } }>('/api/v1/cards/lookup', {
        params: { number: short },
      }),
    );
    expect(lookup.card.printedNumber).toBe(blank.printedNumber);

    const result = await firstValueFrom(
      http.post<CardAssignResult>('/api/v1/cards/assign', {
        memberId: member.id,
        qrToken: blank.qrToken,
      }),
    );
    expect(result.member.status).toBe('ACTIVE');
    expect(result.card.status).toBe('ACTIVE');
    expect(result.member.cardId).toBe(blank.id);
    expect(db.snapshot.smsLog.at(-1)?.templateCode).toBe('ENROLLMENT');

    const again = await errorOf(
      firstValueFrom(
        http.post('/api/v1/cards/assign', { memberId: member.id, qrToken: blank.qrToken }),
      ),
    );
    expect(again.error.code).toBe('INVALID_STATUS');
  });

  it('does not let an agent touch another agent’s merchant', async () => {
    const { http, db } = await setup();
    const other = db.snapshot.members.find(
      (m) => m.agentId === 'u-ag2' && m.status === 'CARD_TO_ASSIGN',
    )!;
    const blank = db.snapshot.cards.find((c) => c.status === 'UNASSIGNED')!;
    const err = await errorOf(
      firstValueFrom(
        http.post('/api/v1/cards/assign', { memberId: other.id, number: blank.printedNumber }),
      ),
    );
    expect(err.status).toBe(403);
  });

  it('summarises the agent’s day and counts the new enrollment', async () => {
    const { http } = await setup();
    const before = await firstValueFrom(http.get<AgentToday>('/api/v1/agent/today'));
    await firstValueFrom(http.post<Member>('/api/v1/members', NEW_MERCHANT));
    const after = await firstValueFrom(http.get<AgentToday>('/api/v1/agent/today'));
    expect(after.enrolled).toBe(before.enrolled + 1);
    expect(after.paymentPending).toBe(before.paymentPending + 1);
    expect(after.cutoffTime).toBe('16:00');
    expect(Number.isInteger(after.collected)).toBe(true);
  });
});
