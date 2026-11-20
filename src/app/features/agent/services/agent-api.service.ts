import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import { API } from '@core/api/endpoints';
import { toPageParams } from '@core/api/pagination';
import { EnrollmentInput, phoneDigits } from '@core/domain/enrollment';
import { membershipFeeOf } from '@core/domain/membership';
import { ProductRulesService } from '@core/services/product-rules.service';
import { environment } from '@env/environment';
import {
  AgentToday,
  Card,
  CardAssignResult,
  CardLookup,
  EnrollmentResult,
  Fcfa,
  Loan,
  Member,
  Page,
  Payment,
  PaymentType,
  PhoneCheck,
} from '@core/models';

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
  private readonly rules = inject(ProductRulesService);

  today(): Observable<AgentToday> {
    return this.api.get<AgentToday>(API.agentToday);
  }

  /** Cash paid on the spot at enrollment: the registry rule, or the mock's payment types. */
  membershipFee(): Observable<Fcfa> {
    return environment.useRegistre
      ? this.rules.rules().pipe(map((r) => r.membershipCashFee))
      : this.paymentTypes().pipe(map(membershipFeeOf));
  }

  /** Cash cut-off time (`HH:mm`): the registry rule, or the mock's settings. */
  cutoffTime(): Observable<string> {
    return environment.useRegistre
      ? this.rules.rules().pipe(map((r) => r.cutoffTime))
      : this.today().pipe(map((t) => t.cutoffTime));
  }

  /** Payment types configured by the administration (membership fee, savings…). */
  paymentTypes(): Observable<PaymentType[]> {
    return this.api.get<PaymentType[]>(API.paymentTypes);
  }

  /** POST, so the phone number never appears in a URL. */
  checkPhone(phone: string): Observable<PhoneCheck> {
    return this.api.post<PhoneCheck>(API.phoneCheck, { phone: phoneDigits(phone) });
  }

  /** Simulated photo upload: returns the stored file reference. */
  upload(file: File): Observable<string> {
    const body = new FormData();
    body.append('file', file);
    return this.api.post<{ url: string }>(API.uploads, body).pipe(map((r) => r.url));
  }

  /**
   * Registers a merchant who has paid the 1 000 F (the card is associated next).
   * `idempotencyKey` is the same for every retry of one registration: the server never
   * creates the merchant twice.
   */
  enroll(input: EnrollmentInput, idempotencyKey: string): Observable<EnrollmentResult> {
    return this.api.post<EnrollmentResult>(API.members, input, {
      'Idempotency-Key': idempotencyKey,
    });
  }

  /** The agent's own merchants, newest first. */
  myMembers(size = 30): Observable<Page<Member>> {
    return this.api.get<Page<Member>>(API.members, toPageParams({ size, sort: 'createdAt,desc' }));
  }

  member(id: string): Observable<MemberDetail> {
    return this.api.get<MemberDetail>(API.member(id));
  }

  /** Checks a scanned QR code: is it a blank WASSIA card? POST: the token stays out of URLs. */
  lookupCard(qrToken: string): Observable<CardLookup> {
    return this.api.post<CardLookup>(API.cardLookup, { qrToken });
  }

  /** Associates the scanned card with a registered member, who becomes active. */
  assignCard(memberId: string, qrToken: string): Observable<CardAssignResult> {
    return this.api.post<CardAssignResult>(API.cardAssign, { memberId, qrToken });
  }

  /** Own merchants registered (paid) who still have no card. */
  cardsToAssign(): Observable<Page<Member>> {
    return this.api.get<Page<Member>>(
      API.members,
      toPageParams({ size: 50, sort: 'createdAt,desc' }, { status: 'CARD_TO_ASSIGN' }),
    );
  }
}
