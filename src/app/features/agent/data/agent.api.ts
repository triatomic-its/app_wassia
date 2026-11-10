import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClient } from '../../../core/api/api.client';
import { API } from '../../../core/api/endpoints';
import { toPageParams } from '../../../core/api/pagination';
import { EnrollmentInput, phoneDigits } from '../../../core/domain/enrollment';
import {
  AgentToday,
  Card,
  CardLookup,
  EnrollmentResult,
  Loan,
  Member,
  Page,
  Payment,
  PaymentType,
  PhoneCheck,
} from '../../../core/models';

export interface MemberDetail {
  member: Member;
  card: Card | null;
  payments: Payment[];
  loans: Loan[];
}

/** Typed access to the endpoints used by the field-agent screens. */
@Injectable({ providedIn: 'root' })
export class AgentApi {
  private readonly api = inject(ApiClient);

  today(): Observable<AgentToday> {
    return this.api.get<AgentToday>(API.agentToday);
  }

  /** Membership fee currently configured by the administration (1 000 F by default). */
  membershipFee(): Observable<number> {
    return this.api
      .get<PaymentType[]>(API.paymentTypes)
      .pipe(map((types) => types.find((t) => t.code === 'MEMBERSHIP')?.defaultAmount ?? 1000));
  }

  checkPhone(phone: string): Observable<PhoneCheck> {
    return this.api.get<PhoneCheck>(API.phoneCheck, { phone: phoneDigits(phone) });
  }

  /** Simulated photo upload: returns the stored file reference. */
  upload(file: File): Observable<string> {
    const body = new FormData();
    body.append('file', file);
    return this.api.post<{ url: string }>(API.uploads, body).pipe(map((r) => r.url));
  }

  /** Registers a merchant who has paid the 1 000 F and receives a card. */
  enroll(input: EnrollmentInput): Observable<EnrollmentResult> {
    return this.api.post<EnrollmentResult>(API.members, input);
  }

  /** The agent's own merchants, newest first. */
  myMembers(size = 30): Observable<Page<Member>> {
    return this.api.get<Page<Member>>(API.members, toPageParams({ size, sort: 'createdAt,desc' }));
  }

  member(id: string): Observable<MemberDetail> {
    return this.api.get<MemberDetail>(API.member(id));
  }

  lookupCard(by: { qr?: string; number?: string }): Observable<CardLookup> {
    return this.api.get<CardLookup>(
      API.cardLookup,
      by.qr ? { qr: by.qr } : { number: by.number ?? '' },
    );
  }
}
