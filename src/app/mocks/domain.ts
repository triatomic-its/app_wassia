import {
  EnrollmentInput,
  formatPhone,
  hasErrors,
  phoneDigits,
  validateEnrollment,
} from '@core/domain/enrollment';
import { businessDateOf } from '@core/domain/cash-cutoff';
import { findMembershipType, membershipFeeOf } from '@core/domain/membership';
import {
  AgentToday,
  AppNotification,
  Card,
  CardAssignResult,
  EnrollmentResult,
  Member,
  Payment,
  PaymentChannel,
  SmsTemplate,
  User,
} from '@core/models';
import { fail } from './http';
import { MockData } from './seed/seed';

/**
 * Server-side business rules of the fake back end, so the UI receives the same errors as with
 * the real server. Every mutating function must be called inside `MockDb.write()`.
 */

export const CHANNEL_ACCOUNT: Record<PaymentChannel, string> = {
  CASH: '571',
  WAVE: '5215',
  ORANGE: '5216',
  MTN: '5217',
  MOOV: '5218',
};

let counter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;

export function audit(
  data: MockData,
  user: User | null,
  action: string,
  entity: string,
  entityId: string,
  now: Date,
): void {
  data.audit.push({
    id: newId('a'),
    userId: user?.id ?? 'system',
    action,
    entity,
    entityId,
    at: now.toISOString(),
  });
}

/** Renders a template with `[Variable]` placeholders and logs the SMS as sent. */
export function sendSms(
  data: MockData,
  code: SmsTemplate['code'],
  to: string,
  vars: Record<string, string>,
  now: Date,
): AppNotification {
  const template = data.smsTemplates.find((t) => t.code === code);
  const body = (template?.body ?? '').replace(
    /\[([^\]]+)\]/g,
    (_, key: string) => vars[key] ?? `[${key}]`,
  );
  const sms: AppNotification = {
    id: newId('sms'),
    templateCode: code,
    to,
    body,
    sentAt: now.toISOString(),
    status: 'SENT',
  };
  data.smsLog.push(sms);
  return sms;
}

export function findByPhone(data: MockData, phone: string): Member | undefined {
  const digits = phoneDigits(phone);
  return data.members.find((m) => phoneDigits(m.phone) === digits);
}

function nextAccountNumber(data: MockData): string {
  const max = data.members.reduce((m, x) => Math.max(m, Number(x.accountNumber?.slice(4) ?? 0)), 0);
  return `CPT-${String(max + 1).padStart(6, '0')}`;
}

export function findCard(
  data: MockData,
  by: { qr?: string | null; number?: string | null },
): Card | undefined {
  const qr = by.qr?.trim();
  if (qr) return data.cards.find((c) => c.qrToken === qr);
  const number = by.number?.trim().toUpperCase().replace(/\s+/g, '');
  if (!number) return undefined;
  const normalized = /^\d+$/.test(number)
    ? `WAS-${number.padStart(6, '0')}`
    : number.replace(/^WAS(?!-)/, 'WAS-');
  return data.cards.find((c) => c.printedNumber === normalized);
}

/**
 * Registers a merchant (client rule, 2026-11-10): the agent has received the 1 000 F on the spot
 * (cash, or Wave confirmed by the agent). The member, the payment and its ledger entry are written
 * together; the member is CARD_TO_ASSIGN until the agent scans a blank card (assignCard).
 *
 * - Idempotent: replaying the same `Idempotency-Key` (same agent) returns the first result and
 *   creates nothing (lost response + retry never ends in "number already registered").
 * - From the cash cut-off (16:00) on, the payment and its entry belong to the next business day.
 */
export function enrollMember(
  data: MockData,
  agent: User,
  input: Partial<EnrollmentInput>,
  now: Date,
  idempotencyKey?: string,
): EnrollmentResult {
  const replayKey = idempotencyKey?.trim() ? `${agent.id}:${idempotencyKey.trim()}` : undefined;
  const previous = replayKey ? replayEnrollment(data, replayKey) : undefined;
  if (previous) return previous;

  const fee = membershipFeeOf(data.paymentTypes);
  const errors = validateEnrollment(input, fee);
  if (hasErrors(errors)) {
    throw fail(
      422,
      'ENROLLMENT_INCOMPLETE',
      'Certaines informations manquent.',
      Object.fromEntries(
        Object.entries(errors)
          .filter(([, v]) => v)
          .map(([k, v]) => [k, [v!]]),
      ),
    );
  }
  const { fullName = '', phone = '', market = '', trade = '', idNumber = '' } = input;
  const channel = input.paymentChannel;
  if (!channel) throw fail(422, 'PAYMENT_CHANNEL_REQUIRED', 'Choisissez : espèces ou Wave.');
  if (findByPhone(data, phone)) {
    throw fail(409, 'PHONE_ALREADY_USED', 'Ce numéro est déjà enregistré pour un autre marchand.');
  }
  const type = findMembershipType(data.paymentTypes);
  if (!type)
    throw fail(500, 'MEMBERSHIP_TYPE_MISSING', 'Le type de paiement « Adhésion » est introuvable.');
  const at = now.toISOString();
  const businessDate = businessDateOf(now, data.settings.cashCutoffTime);
  const member: Member = {
    id: newId('m'),
    fullName: fullName.trim(),
    phone: formatPhone(phone),
    market,
    trade: trade.trim(),
    stall: input.stall?.trim() || undefined,
    idNumber: idNumber.trim(),
    idDocUrl: input.idDocUrl,
    photoUrl: input.photoUrl,
    agentId: agent.id,
    status: 'CARD_TO_ASSIGN',
    accountNumber: nextAccountNumber(data),
    savings: 0,
    dailyTarget: 500,
    createdAt: at,
    updatedAt: at,
  };
  const payment: Payment = {
    id: newId('p'),
    memberId: member.id,
    typeId: type.id,
    amount: fee,
    channel,
    status: 'CONFIRMED',
    externalRef: input.paymentRef?.trim() || newId(channel === 'WAVE' ? 'WV' : 'ESP'),
    agentId: agent.id,
    createdAt: at,
    businessDate,
  };

  data.members.push(member);
  data.payments.push(payment);
  data.ledger.push({
    id: newId('e'),
    date: at,
    businessDate,
    journal: channel === 'CASH' ? 'CAISSE' : 'MOBILE',
    label: `Adhésion ${member.fullName}`,
    lines: [
      { account: CHANNEL_ACCOUNT[channel], debit: payment.amount, credit: 0 },
      { account: '7061', debit: 0, credit: payment.amount },
    ],
    createdBy: agent.id,
    sourcePaymentId: payment.id,
  });
  audit(data, agent, 'ENROLL_MEMBER', 'Member', member.id, now);
  if (replayKey) data.idempotency[replayKey] = { memberId: member.id, paymentId: payment.id };
  return { member, payment };
}

function replayEnrollment(data: MockData, key: string): EnrollmentResult | undefined {
  const ids = data.idempotency[key];
  if (!ids) return undefined;
  const member = data.members.find((m) => m.id === ids.memberId);
  const payment = data.payments.find((p) => p.id === ids.paymentId);
  return member && payment ? { member, payment } : undefined;
}

/**
 * The agent scans the QR code of a blank card to associate it with a registered member:
 * card UNASSIGNED → ACTIVE, member CARD_TO_ASSIGN → ACTIVE, then the "account active" SMS.
 * Only the QR token is accepted (no typed number).
 */
export function assignCard(
  data: MockData,
  agent: User,
  memberId: string,
  qrToken: string | undefined,
  now: Date,
): CardAssignResult {
  const member = data.members.find((m) => m.id === memberId);
  if (!member) throw fail(404, 'MEMBER_NOT_FOUND', 'Marchand introuvable.');
  if (agent.role === 'AGENT' && member.agentId !== agent.id) {
    throw fail(403, 'NOT_YOUR_MERCHANT', 'Ce marchand est suivi par un autre agent.');
  }
  if (member.status !== 'CARD_TO_ASSIGN') {
    throw fail(409, 'INVALID_STATUS', 'Ce marchand a déjà une carte.');
  }
  if (!qrToken?.trim()) {
    throw fail(422, 'QR_REQUIRED', 'Scannez le code QR de la carte.', { qrToken: ['Obligatoire'] });
  }
  const card = findCard(data, { qr: qrToken });
  if (!card) throw fail(404, 'CARD_NOT_FOUND', 'Ce code QR n’est pas une carte WASSIA.');
  if (card.status !== 'UNASSIGNED') {
    throw fail(409, 'CARD_ALREADY_USED', 'Cette carte est déjà utilisée. Prenez une carte vierge.');
  }
  const at = now.toISOString();
  card.status = 'ACTIVE';
  card.memberId = member.id;
  member.cardId = card.id;
  member.status = 'ACTIVE';
  member.updatedAt = at;
  sendSms(
    data,
    'ENROLLMENT',
    member.phone,
    { Numéro: member.accountNumber ?? '', Téléphone: '+225 07 07 07 07 07' },
    now,
  );
  audit(data, agent, 'ASSIGN_CARD', 'Card', card.id, now);
  return { member, card };
}

/** Day summary for an agent's home screen. */
export function agentToday(data: MockData, agent: User, now: Date): AgentToday {
  const day = now.toISOString().slice(0, 10);
  const onDay = (iso: string) => iso.slice(0, 10) === day;
  const mine = data.members.filter((m) => m.agentId === agent.id);
  const mineIds = new Set(mine.map((m) => m.id));
  const collected = data.payments.filter(
    (p) => p.agentId === agent.id && p.status === 'CONFIRMED' && onDay(p.createdAt),
  );
  const cash = collected.filter((p) => p.channel === 'CASH').reduce((s, p) => s + p.amount, 0);
  const remitted = data.remittances
    .filter((r) => r.fromUserId === agent.id && r.status === 'RECEIVED' && r.at && onDay(r.at))
    .reduce((s, r) => s + r.amount, 0);
  return {
    businessDate: day,
    cutoffTime: data.settings.cashCutoffTime,
    collected: collected.reduce((s, p) => s + p.amount, 0),
    deposits: collected.length,
    enrolled: mine.filter((m) => onDay(m.createdAt)).length,
    toRemit: Math.max(cash - remitted, 0),
    lateMembers: new Set(
      data.loans
        .filter((l) => mineIds.has(l.memberId) && (l.status === 'LATE_1' || l.status === 'LATE_2'))
        .map((l) => l.memberId),
    ).size,
    cardsToAssign: mine.filter((m) => m.status === 'CARD_TO_ASSIGN').length,
  };
}
