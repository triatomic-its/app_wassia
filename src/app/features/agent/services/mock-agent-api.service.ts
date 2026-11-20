import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, map, of, throwError } from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import { API } from '@core/api/endpoints';
import { toPageParams } from '@core/api/pagination';
import { MARKETS, MOCK_SECTORS } from '@core/config/enrollment.config';
import { PRODUCT_RULES_SNAPSHOT } from '@core/config/product-rules.defaults';
import { EnrollmentInput, phoneDigits } from '@core/domain/enrollment';
import { membershipFeeOf } from '@core/domain/membership';
import {
  AgentToday,
  CardAssignResult,
  CardLookup,
  CollectTarget,
  DepositResult,
  EnrollmentOptions,
  EnrollmentResult,
  Fcfa,
  Member,
  Page,
  PaymentType,
  PhoneCheck,
} from '@core/models';
import type { AgentApi, MemberDetail } from './agent-api.service';

/** `AgentApi` on the mock back end (`/api/v1`, see docs/API_CONTRACT.md). */
@Injectable({ providedIn: 'root' })
export class MockAgentApi implements AgentApi {
  private readonly api = inject(ApiClient);

  today(): Observable<AgentToday> {
    return this.api.get<AgentToday>(API.agentToday);
  }

  membershipFee(): Observable<Fcfa> {
    return this.paymentTypes().pipe(map(membershipFeeOf));
  }

  cutoffTime(): Observable<string> {
    return this.today().pipe(map((t) => t.cutoffTime));
  }

  enrollmentOptions(): Observable<EnrollmentOptions> {
    return of({
      markets: MARKETS.map((m) => ({ value: m, label: m })),
      sectors: MOCK_SECTORS.map((s) => ({ ...s })),
      minimumSavings: PRODUCT_RULES_SNAPSHOT.minimumSavings,
    });
  }

  paymentTypes(): Observable<PaymentType[]> {
    return this.api.get<PaymentType[]>(API.paymentTypes);
  }

  checkPhone(phone: string): Observable<PhoneCheck> {
    return this.api.post<PhoneCheck>(API.phoneCheck, { phone: phoneDigits(phone) });
  }

  upload(file: File): Observable<string> {
    const body = new FormData();
    body.append('file', file);
    return this.api.post<{ url: string }>(API.uploads, body).pipe(map((r) => r.url));
  }

  enroll(input: EnrollmentInput, idempotencyKey: string): Observable<EnrollmentResult> {
    return this.api.post<EnrollmentResult>(API.members, input, {
      'Idempotency-Key': idempotencyKey,
    });
  }

  myMembers(size = 30): Observable<Page<Member>> {
    return this.api.get<Page<Member>>(API.members, toPageParams({ size, sort: 'createdAt,desc' }));
  }

  member(id: string): Observable<MemberDetail> {
    return this.api.get<MemberDetail>(API.member(id));
  }

  lookupCard(qrToken: string): Observable<CardLookup> {
    return this.api.post<CardLookup>(API.cardLookup, { qrToken });
  }

  assignCard(memberId: string, qrToken: string): Observable<CardAssignResult> {
    return this.api.post<CardAssignResult>(API.cardAssign, { memberId, qrToken });
  }

  cardsToAssign(): Observable<Page<Member>> {
    return this.api.get<Page<Member>>(
      API.members,
      toPageParams({ size: 50, sort: 'createdAt,desc' }, { status: 'CARD_TO_ASSIGN' }),
    );
  }

  /** Savings deposits are built on the registry only (2026-11-20, A36). */
  findByCard(): Observable<CollectTarget> {
    return registryOnly();
  }

  deposit(): Observable<DepositResult> {
    return registryOnly();
  }
}

function registryOnly(): Observable<never> {
  return throwError(
    () =>
      new HttpErrorResponse({
        status: 501,
        error: {
          code: 'REGISTRY_ONLY',
          message: 'Le versement d’épargne n’est disponible qu’avec le registre WASSIA.',
        },
      }),
  );
}
