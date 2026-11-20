import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { EnrollmentInput } from '@core/domain/enrollment';
import {
  AgentToday,
  Card,
  CardAssignResult,
  CardLookup,
  EnrollmentOptions,
  EnrollmentResult,
  Fcfa,
  Loan,
  Member,
  Page,
  Payment,
  PaymentType,
  PhoneCheck,
} from '@core/models';
import { environment } from '@env/environment';
import { MockAgentApi } from './mock-agent-api.service';
import { RegistreAgentApi } from './registre-agent-api.service';

export interface MemberDetail {
  member: Member;
  card: Card | null;
  payments: Payment[];
  loans: Loan[];
}

/**
 * Typed access to what the field-agent screens need. Two implementations, chosen by the
 * environment: `RegistreAgentApi` (real back end, hybrid: it delegates to the mock what the
 * registry does not expose yet) and `MockAgentApi` (mock back end only). Screens inject
 * `AgentApi` and never know which one runs.
 */
@Injectable({
  providedIn: 'root',
  useFactory: () => (environment.useRegistre ? inject(RegistreAgentApi) : inject(MockAgentApi)),
})
export abstract class AgentApi {
  abstract today(): Observable<AgentToday>;
  /** Cash paid on the spot at enrollment. */
  abstract membershipFee(): Observable<Fcfa>;
  /** Cash cut-off time (`HH:mm`, Africa/Abidjan). */
  abstract cutoffTime(): Observable<string>;
  /** Markets, sectors and the minimum savings offered by the registration form. */
  abstract enrollmentOptions(): Observable<EnrollmentOptions>;
  /** Payment types configured by the administration (membership fee, savings…). */
  abstract paymentTypes(): Observable<PaymentType[]>;
  /** Is this phone number free? (POST: the number never appears in a URL.) */
  abstract checkPhone(phone: string): Observable<PhoneCheck>;
  /** Photo upload: returns the stored file reference. */
  abstract upload(file: File): Observable<string>;
  /**
   * Registers a merchant who has paid the 1 000 F (the card is associated next).
   * `idempotencyKey` is the same for every retry of one registration: never created twice.
   */
  abstract enroll(input: EnrollmentInput, idempotencyKey: string): Observable<EnrollmentResult>;
  /** The agent's own merchants, newest first. */
  abstract myMembers(size?: number): Observable<Page<Member>>;
  abstract member(id: string): Observable<MemberDetail>;
  /** Checks a scanned QR code: is it a blank WASSIA card? */
  abstract lookupCard(qrToken: string): Observable<CardLookup>;
  /** Associates the scanned card with a registered member. */
  abstract assignCard(memberId: string, qrToken: string): Observable<CardAssignResult>;
  /** Own merchants registered (paid) who still have no card. */
  abstract cardsToAssign(): Observable<Page<Member>>;
}
