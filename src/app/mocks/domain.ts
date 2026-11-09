import { DEFAULT_PAYMENT_TYPES } from '../core/config/payment-types.config';
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
 * the real server. Every function mutates `data` and must be called inside `MockDb.write()`.
 */

const CHANNEL_ACCOUNT: Record<PaymentChannel, string> = {
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

/**
 * Agent enrollment (mockup): once all required information is present and the phone is not
 * already used, the account is created automatically and a payment SMS is sent.
 */
export function createMember(
  data: MockData,
  agent: User,
  input: Partial<EnrollmentInput>,
  now: Date,
): Member {
  const errors = validateEnrollment(input);
  if (hasErrors(errors)) {
    throw fail(
      422,
      'ENROLLMENT_INCOMPLETE',
      'Certaines informations manquent.',
      Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, [v!]])),
    );
  }
  const existing = findByPhone(data, input.phone!);
  if (existing) {
    throw fail(409, 'PHONE_ALREADY_USED', 'Ce numéro est déjà enregistré pour un autre marchand.');
  }
  const at = now.toISOString();
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
    status: 'PAYMENT_PENDING',
    accountNumber: nextAccountNumber(data),
    savings: 0,
    dailyTarget: 500,
    createdAt: at,
    updatedAt: at,
  };
  data.members.push(member);
  const fee = membershipFee(data);
  sendSms(
    data,
    'PAYMENT_LINK',
    member.phone,
    { Nom: member.fullName, Montant: String(fee), Lien: `wassia.ci/pay/${member.accountNumber}` },
    now,
  );
  audit(data, agent, 'CREATE_ACCOUNT', 'Member', member.id, now);
  return member;
}

export function membershipFee(data: MockData): number {
  const type = data.paymentTypes.find((t) => t.code === 'MEMBERSHIP');
  return type?.defaultAmount ?? DEFAULT_PAYMENT_TYPES[0].defaultAmount ?? 1000;
}

/** Records the 1 000 F membership payment: PAYMENT_PENDING → CARD_TO_ASSIGN, with its ledger entry. */
export function confirmMembershipPayment(
  data: MockData,
  memberId: string,
  channel: PaymentChannel,
  now: Date,
  externalRef?: string,
): Payment {
  const member = data.members.find((m) => m.id === memberId);
  if (!member) throw fail(404, 'MEMBER_NOT_FOUND', 'Marchand introuvable.');
  if (member.status !== 'PAYMENT_PENDING') {
    throw fail(409, 'INVALID_STATUS', 'Ce marchand a déjà payé son adhésion.');
  }
  const type = data.paymentTypes.find((t) => t.code === 'MEMBERSHIP')!;
  const payment: Payment = {
    id: newId('p'),
    memberId,
    typeId: type.id,
    amount: membershipFee(data),
    channel,
    status: 'CONFIRMED',
    externalRef: externalRef ?? newId(channel === 'WAVE' ? 'WV' : 'ESP'),
    agentId: channel === 'CASH' ? member.agentId : undefined,
    createdAt: now.toISOString(),
  };
  data.payments.push(payment);
  data.ledger.push({
    id: newId('e'),
    date: payment.createdAt,
    journal: channel === 'CASH' ? 'CAISSE' : 'MOBILE',
    label: `Adhésion ${member.fullName}`,
    lines: [
      { account: CHANNEL_ACCOUNT[channel], debit: payment.amount, credit: 0 },
      { account: '7061', debit: 0, credit: payment.amount },
    ],
    createdBy: 'system',
    sourcePaymentId: payment.id,
  });
  member.status = 'CARD_TO_ASSIGN';
  member.updatedAt = payment.createdAt;
  audit(data, null, 'MEMBERSHIP_PAID', 'Member', member.id, now);
  return payment;
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

/** Agent associates a blank card after payment: card UNASSIGNED → ACTIVE, member CARD_TO_ASSIGN → ACTIVE. */
export function assignCard(
  data: MockData,
  agent: User,
  memberId: string,
  card: Card | undefined,
  now: Date,
): { member: Member; card: Card } {
  const member = data.members.find((m) => m.id === memberId);
  if (!member) throw fail(404, 'MEMBER_NOT_FOUND', 'Marchand introuvable.');
  if (agent.role === 'AGENT' && member.agentId !== agent.id) {
    throw fail(403, 'NOT_YOUR_MERCHANT', 'Ce marchand est suivi par un autre agent.');
  }
  if (member.status === 'PAYMENT_PENDING') {
    throw fail(409, 'PAYMENT_MISSING', 'Le marchand n’a pas encore payé ses 1 000 F.');
  }
  if (member.status !== 'CARD_TO_ASSIGN') {
    throw fail(409, 'INVALID_STATUS', 'Ce marchand a déjà une carte.');
  }
  if (!card) throw fail(404, 'CARD_NOT_FOUND', 'Carte inconnue. Vérifiez le numéro imprimé.');
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
  const collectedPayments = data.payments.filter(
    (p) => p.agentId === agent.id && p.status === 'CONFIRMED' && onDay(p.createdAt),
  );
  const collected = collectedPayments.reduce((s, p) => s + p.amount, 0);
  const remitted = data.remittances
    .filter((r) => r.fromUserId === agent.id && r.status === 'RECEIVED' && r.at && onDay(r.at))
    .reduce((s, r) => s + r.amount, 0);
  return {
    businessDate: day,
    cutoffTime: data.settings.cashCutoffTime,
    collected,
    deposits: collectedPayments.length,
    enrolled: mine.filter((m) => m.status !== 'DRAFT' && onDay(m.createdAt)).length,
    toRemit: Math.max(collected - remitted, 0),
    lateMembers: new Set(
      data.loans
        .filter((l) => mineIds.has(l.memberId) && (l.status === 'LATE_1' || l.status === 'LATE_2'))
        .map((l) => l.memberId),
    ).size,
    paymentPending: mine.filter((m) => m.status === 'PAYMENT_PENDING').length,
    cardsToAssign: mine.filter((m) => m.status === 'CARD_TO_ASSIGN').length,
  };
}
