import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClient } from '../../../core/api/api.client';
import { API } from '../../../core/api/endpoints';
import { toPageParams } from '../../../core/api/pagination';
import { EnrollmentInput, phoneDigits } from '../../../core/domain/enrollment';
import {
  AgentToday,
  Card,
  CardAssignResult,
  CardLookup,
  EnrollmentStatus,
  Loan,
  Member,
  Page,
  Payment,
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

  checkPhone(phone: string): Observable<PhoneCheck> {
    return this.api.get<PhoneCheck>(API.phoneCheck, { phone: phoneDigits(phone) });
  }

  /** Simulated photo upload: returns the stored file reference. */
  upload(file: File): Observable<string> {
    const body = new FormData();
    body.append('file', file);
    return this.api.post<{ url: string }>(API.uploads, body).pipe(map((r) => r.url));
  }

  createMember(input: EnrollmentInput): Observable<Member> {
    return this.api.post<Member>(API.members, input);
  }

  myMembers(status: EnrollmentStatus, size = 50): Observable<Page<Member>> {
    const params: HttpParams = toPageParams({ size, sort: 'createdAt,desc' }, { status });
    return this.api.get<Page<Member>>(API.members, params);
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

  assignCard(memberId: string, by: { qr?: string; number?: string }): Observable<CardAssignResult> {
    return this.api.post<CardAssignResult>(API.cardAssign, {
      memberId,
      ...(by.qr ? { qrToken: by.qr } : { number: by.number }),
    });
  }
}
