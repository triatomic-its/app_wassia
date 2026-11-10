import {
  EnrollmentInput,
  formatPhone,
  hasErrors,
  phoneDigits,
  validateEnrollment,
} from '../core/domain/enrollment';
import {
  AgentToday,
  AppNotification,
  Card,
  EnrollmentResult,
  Member,
  Payment,
  PaymentChannel,
  SmsTemplate,
  User,
} from '../core/models';
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

export function membershipFee(data: MockData): number {
  return data.paymentTypes.find((t) => t.code === 'MEMBERSHIP')?.defaultAmount ?? 1000;
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
 * Registers a merchant (client rule, 2026-11-09): the agent has received the 1 000 F on the spot
 * (cash, or Wave confirmed by the agent) and hands over a blank QR card. Everything is checked
 * first; then the member, the payment, its ledger entry and the card are written together.
 */
export function enrollMember(
  data: MockData,
  agent: User,
  input: Partial<EnrollmentInput>,
  now: Date,
): EnrollmentResult {
  const errors = validateEnrollment(input);
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
  if (findByPhone(data, input.phone!)) {
    throw fail(409, 'PHONE_ALREADY_USED', 'Ce numéro est déjà enregistré pour un autre marchand.');
  }
  const card = findCard(data, { qr: input.cardQrToken, number: input.cardNumber });
  if (!card) throw fail(404, 'CARD_NOT_FOUND', 'Carte inconnue. Vérifiez le numéro imprimé.');
  if (card.status !== 'UNASSIGNED') {
    throw fail(409, 'CARD_ALREADY_USED', 'Cette carte est déjà utilisée. Prenez une carte vierge.');
  }

  const at = now.toISOString();
  const channel = input.paymentChannel!;
  const member: Member = {
    id: newId('m'),
    fullName: input.fullName!.trim(),
    phone: formatPhone(input.phone!),
    market: input.market!,
    trade: input.trade!.trim(),
    stall: input.stall?.trim() || undefined,
    idNumber: input.idNumber!.trim(),
    idDocUrl: input.idDocUrl,
    photoUrl: input.photoUrl,
    agentId: agent.id,
    status: 'ACTIVE',
    accountNumber: nextAccountNumber(data),
    cardId: card.id,
    savings: 0,
    dailyTarget: 500,
    createdAt: at,
    updatedAt: at,
  };
  const type = data.paymentTypes.find((t) => t.code === 'MEMBERSHIP')!;
  const payment: Payment = {
    id: newId('p'),
    memberId: member.id,
    typeId: type.id,
    amount: membershipFee(data),
    channel,
    status: 'CONFIRMED',
    externalRef: input.paymentRef?.trim() || newId(channel === 'WAVE' ? 'WV' : 'ESP'),
    agentId: agent.id,
    createdAt: at,
  };

  data.members.push(member);
  data.payments.push(payment);
  data.ledger.push({
    id: newId('e'),
    date: at,
    journal: channel === 'CASH' ? 'CAISSE' : 'MOBILE',
    label: `Adhésion ${member.fullName}`,
    lines: [
      { account: CHANNEL_ACCOUNT[channel], debit: payment.amount, credit: 0 },
      { account: '7061', debit: 0, credit: payment.amount },
    ],
    createdBy: agent.id,
    sourcePaymentId: payment.id,
  });
  card.status = 'ACTIVE';
  card.memberId = member.id;

  sendSms(
    data,
    'ENROLLMENT',
    member.phone,
    { Numéro: member.accountNumber ?? '', Téléphone: '+225 07 07 07 07 07' },
    now,
  );
  audit(data, agent, 'ENROLL_MEMBER', 'Member', member.id, now);
  return { member, card, payment };
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
  };
}
