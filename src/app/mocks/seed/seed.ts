import { formatCardNumber, CARD_BATCH_SIZE } from '../../core/config/cards.config';
import { computeLoanSchedule, loanFee } from '../../core/config/loan.config';
import { DEFAULT_PAYMENT_TYPES } from '../../core/config/payment-types.config';
import { DEFAULT_SETTINGS } from '../../core/config/settings.defaults';
import { billettageTotal, emptyBillettage } from '../../core/domain/cash';
import {
  AppNotification,
  AuditLog,
  Billettage,
  Card,
  CashClosure,
  DENOMINATIONS,
  EnrollmentStatus,
  Fcfa,
  LedgerEntry,
  Loan,
  LoanDuration,
  LoanStatus,
  Member,
  Payment,
  PaymentChannel,
  PaymentType,
  ReconciliationItem,
  Remittance,
  Role,
  Settings,
  SmsTemplate,
  User,
} from '../../core/models';
import { Rng } from '../rng';
import { ACCOUNTS, FIRST_NAMES, LAST_NAMES, SMS_TEMPLATES, TRADES } from './reference';

export const MOCK_DATA_VERSION = 1;
export const DEFAULT_SEED = 20261109;

export interface MockData {
  version: number;
  seededAt: string;
  users: User[];
  members: Member[];
  cards: Card[];
  payments: Payment[];
  paymentTypes: PaymentType[];
  reconciliation: ReconciliationItem[];
  closures: CashClosure[];
  remittances: Remittance[];
  accounts: { code: string; label: string }[];
  ledger: LedgerEntry[];
  loans: Loan[];
  smsTemplates: SmsTemplate[];
  smsLog: AppNotification[];
  settings: Settings;
  audit: AuditLog[];
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(ms).toISOString();
/** Business date (Africa/Abidjan = UTC+0). */
const dateOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const STAFF: { id: string; fullName: string; role: Role }[] = [
  { id: 'u-dg', fullName: 'Yao Kouassi', role: 'DG' },
  { id: 'u-ddg', fullName: 'Moussa Diabaté', role: 'DEPUTY_DG' },
  { id: 'u-bm', fullName: 'Rokia Traoré', role: 'BRANCH_MANAGER' },
  { id: 'u-mgr', fullName: 'Aminata Coulibaly', role: 'MANAGER' },
  { id: 'u-acc', fullName: 'Serge Kouadio', role: 'ACCOUNTANT' },
  { id: 'u-cash', fullName: 'Mariam Sylla', role: 'CASHIER' },
];

const AGENTS = [
  { id: 'u-ag1', fullName: 'Koffi Amani', zone: 'Adjamé' },
  { id: 'u-ag2', fullName: 'Aïcha Diallo', zone: 'Adjamé' },
  { id: 'u-ag3', fullName: 'Moussa Bakayoko', zone: 'Marcory' },
  { id: 'u-ag4', fullName: 'Nadège Kouamé', zone: 'Marcory' },
  { id: 'u-ag5', fullName: 'Seydou Touré', zone: 'Yopougon' },
  { id: 'u-ag6', fullName: 'Fanta Camara', zone: 'Yopougon' },
];

const CHANNEL_ACCOUNT: Record<PaymentChannel, string> = {
  CASH: '571',
  WAVE: '5215',
  ORANGE: '5216',
  MTN: '5217',
  MOOV: '5218',
};

const REF_PREFIX: Record<PaymentChannel, string> = {
  CASH: 'ESP',
  WAVE: 'WV',
  ORANGE: 'OM',
  MTN: 'MTN',
  MOOV: 'MV',
};

function pickChannel(rng: Rng): PaymentChannel {
  const r = rng.next();
  if (r < 0.6) return 'CASH';
  if (r < 0.85) return 'WAVE';
  if (r < 0.93) return 'ORANGE';
  if (r < 0.97) return 'MTN';
  return 'MOOV';
}

/** Greedy note/coin split used to build realistic billettages. */
function greedyBillettage(amount: Fcfa): Billettage {
  const b = emptyBillettage();
  let rest = amount;
  for (const d of DENOMINATIONS) {
    const value = Number(d);
    b[d] = Math.floor(rest / value);
    rest -= b[d] * value;
  }
  return b;
}

/**
 * Builds the whole fake database, deterministically for a given seed and reference time.
 * Content follows CLAUDE.md §5 (seed data) adapted to the mockup decisions.
 */
export function seedMockData(now: Date, seed = DEFAULT_SEED): MockData {
  const rng = new Rng(seed);
  const nowMs = now.getTime();
  const today = dateOf(nowMs);
  const todayStart = Date.parse(`${today}T00:00:00Z`);

  // ---- Users ---------------------------------------------------------------
  const users: User[] = [
    ...STAFF.map((s, i) => ({ ...s, phone: `07 00 00 10 0${i}`, active: true })),
    ...AGENTS.map((a, i) => ({
      ...a,
      role: 'AGENT' as Role,
      phone: `07 00 00 20 0${i}`,
      active: true,
    })),
  ];

  // ---- Members ------------------------------------------------------------
  const statusFor = (i: number): EnrollmentStatus => {
    if (i < 6) return 'DRAFT';
    if (i < 16) return 'PAYMENT_PENDING';
    if (i < 20) return 'CARD_TO_ASSIGN';
    if (i === 119) return 'SUSPENDED';
    return 'ACTIVE';
  };

  const usedNames = new Set<string>();
  const members: Member[] = [];
  for (let i = 0; i < 120; i++) {
    let fullName: string;
    do {
      fullName = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    } while (usedNames.has(fullName));
    usedNames.add(fullName);

    const agent = AGENTS[i % AGENTS.length];
    const status = statusFor(i);
    const ageMs =
      status === 'DRAFT'
        ? rng.int(1, 20) * HOUR
        : status === 'PAYMENT_PENDING'
          ? // half of them waiting more than 24 h (reminder advised)
            (i % 2 === 0 ? rng.int(26, 60) : rng.int(2, 20)) * HOUR
          : status === 'CARD_TO_ASSIGN'
            ? rng.int(5, 30) * HOUR
            : rng.int(7, 56) * DAY;
    const createdMs = nowMs - ageMs;
    members.push({
      id: `m-${String(i + 1).padStart(3, '0')}`,
      fullName,
      phone: `0${rng.pick(['1', '5', '7'])} ${rng.int(10, 99)} ${rng.int(10, 99)} ${rng.int(10, 99)} ${rng.int(10, 99)}`,
      market: agent.zone,
      trade: rng.pick(TRADES),
      stall: `Allée ${rng.pick(['A', 'B', 'C', 'D', 'E'])}, étal ${rng.int(1, 40)}`,
      agentId: agent.id,
      status,
      statusReason:
        status === 'SUSPENDED' ? 'Épargne bloquée après le deuxième retard de crédit.' : undefined,
      accountNumber: status === 'DRAFT' ? undefined : `CPT-${String(i + 1).padStart(6, '0')}`,
      savings: 0,
      dailyTarget: rng.pick([500, 500, 1000, 1000, 2000]),
      createdAt: iso(createdMs),
      updatedAt: iso(createdMs),
    });
  }

  // ---- Cards ---------------------------------------------------------------
  const cards: Card[] = [];
  for (let n = 1; n <= CARD_BATCH_SIZE; n++) {
    cards.push({
      id: `c-${String(n).padStart(4, '0')}`,
      printedNumber: formatCardNumber(n),
      qrToken: rng.token(),
      status: 'UNASSIGNED',
    });
  }
  let nextCard = 0;
  for (const m of members) {
    if (m.status === 'ACTIVE' || m.status === 'SUSPENDED') {
      const card = cards[nextCard++];
      card.status = 'ACTIVE';
      card.memberId = m.id;
      m.cardId = card.id;
    }
  }
  // Three lost cards, blocked; their owners received the card above.
  for (let k = 0; k < 3; k++) {
    const card = cards[nextCard++];
    card.status = 'BLOCKED';
    card.memberId = members[20 + k].id;
  }

  // ---- Payments ------------------------------------------------------------
  const membershipType = DEFAULT_PAYMENT_TYPES.find((t) => t.code === 'MEMBERSHIP')!;
  const savingsType = DEFAULT_PAYMENT_TYPES.find((t) => t.code === 'SAVINGS')!;
  const payments: Payment[] = [];
  const addPayment = (p: Omit<Payment, 'id' | 'externalRef'> & { externalRef?: string }) => {
    const payment: Payment = {
      ...p,
      id: `p-${String(payments.length + 1).padStart(4, '0')}`,
      externalRef: p.externalRef ?? `${REF_PREFIX[p.channel]}-${rng.token(8)}`,
    };
    payments.push(payment);
    return payment;
  };

  for (const m of members) {
    if (m.status === 'DRAFT' || m.status === 'PAYMENT_PENDING') continue;
    const created = Date.parse(m.createdAt);
    const channel: PaymentChannel = rng.chance(0.5) ? 'WAVE' : 'CASH';
    addPayment({
      memberId: m.id,
      typeId: membershipType.id,
      amount: membershipType.defaultAmount!,
      channel,
      status: 'CONFIRMED',
      agentId: channel === 'CASH' ? m.agentId : undefined,
      createdAt: iso(Math.min(created + rng.int(1, 4) * HOUR, nowMs - HOUR)),
    });
    if (m.status === 'CARD_TO_ASSIGN') continue;

    const deposits = rng.int(2, 7);
    for (let k = 0; k < deposits; k++) {
      const at = created + rng.next() * (nowMs - created);
      const ch = pickChannel(rng);
      addPayment({
        memberId: m.id,
        typeId: savingsType.id,
        amount: rng.pick([500, 500, 1000, 1000, 1000, 2000, 2000, 5000]),
        channel: ch,
        status: 'CONFIRMED',
        agentId: ch === 'CASH' ? m.agentId : undefined,
        createdAt: iso(Math.min(at, nowMs - 10 * 60_000)),
      });
    }
  }

  // Today's field collection (feeds remittances and today's cash).
  const activeMembers = members.filter((m) => m.status === 'ACTIVE');
  const morning = Math.min(todayStart + 8 * HOUR, nowMs - HOUR);
  for (let k = 0; k < 30; k++) {
    const m = activeMembers[k * 3];
    addPayment({
      memberId: m.id,
      typeId: savingsType.id,
      amount: rng.pick([500, 1000, 1000, 2000]),
      channel: 'CASH',
      status: 'CONFIRMED',
      agentId: m.agentId,
      createdAt: iso(morning + rng.next() * Math.max(nowMs - morning - 5 * 60_000, 0)),
    });
  }

  // Anomalies for reconciliation: 2 orphans, 2 duplicates, 1 pending cash.
  const reconciliation: ReconciliationItem[] = [];
  for (let k = 0; k < 2; k++) {
    const orphan = addPayment({
      typeId: savingsType.id,
      amount: rng.pick([1000, 2000]),
      channel: 'WAVE',
      status: 'ORPHAN',
      createdAt: iso(nowMs - rng.int(1, 3) * DAY),
    });
    reconciliation.push({
      id: `r-${reconciliation.length + 1}`,
      kind: 'ORPHAN',
      paymentIds: [orphan.id],
      suggestedMemberId: rng.pick(activeMembers).id,
      resolved: false,
    });
  }
  const waveSavings = payments.filter((p) => p.channel === 'WAVE' && p.typeId === savingsType.id);
  for (let k = 0; k < 2; k++) {
    const original = waveSavings[k * 5];
    const duplicate = addPayment({
      ...original,
      status: 'DUPLICATE',
      createdAt: iso(Date.parse(original.createdAt) + 2 * 60_000),
    });
    reconciliation.push({
      id: `r-${reconciliation.length + 1}`,
      kind: 'DUPLICATE',
      paymentIds: [original.id, duplicate.id],
      resolved: false,
    });
  }
  addPayment({
    memberId: activeMembers[5].id,
    typeId: savingsType.id,
    amount: 2000,
    channel: 'CASH',
    status: 'PENDING_CASH',
    cashierId: 'u-cash',
    createdAt: iso(nowMs - 20 * 60_000),
  });

  payments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // Savings = confirmed savings deposits (the prepaid card balance, ASSUMPTION A13).
  const savingsById = new Map<string, number>();
  for (const p of payments) {
    if (p.status === 'CONFIRMED' && p.typeId === savingsType.id && p.memberId) {
      savingsById.set(p.memberId, (savingsById.get(p.memberId) ?? 0) + p.amount);
    }
  }
  for (const m of members) m.savings = savingsById.get(m.id) ?? 0;

  // ---- Loans ---------------------------------------------------------------
  const loanPlan: {
    status: LoanStatus;
    amount: Fcfa;
    months: LoanDuration;
    ageDays: number;
    paid: number;
  }[] = [
    { status: 'REQUESTED', amount: 250_000, months: 6, ageDays: 0, paid: 0 },
    { status: 'REQUESTED', amount: 500_000, months: 12, ageDays: 1, paid: 0 },
    { status: 'COMPLIANCE_OK', amount: 250_000, months: 12, ageDays: 2, paid: 0 },
    { status: 'COMPLIANCE_OK', amount: 1_000_000, months: 12, ageDays: 1, paid: 0 },
    { status: 'APPROVED', amount: 250_000, months: 6, ageDays: 3, paid: 0 },
    { status: 'REPAYING', amount: 500_000, months: 6, ageDays: 70, paid: 2 },
    { status: 'LATE_1', amount: 1_000_000, months: 12, ageDays: 100, paid: 2 },
    { status: 'LATE_2', amount: 5_000_000, months: 18, ageDays: 130, paid: 2 },
    { status: 'REPAID', amount: 250_000, months: 6, ageDays: 200, paid: 6 },
  ];
  const borrowers = members.filter((m) => m.savings > 0 && m.status === 'ACTIVE');
  const suspended = members.find((m) => m.status === 'SUSPENDED')!;
  const loans: Loan[] = loanPlan.map((plan, k) => {
    const member = plan.status === 'LATE_2' ? suspended : borrowers[k * 4];
    const schedule = computeLoanSchedule(plan.amount, plan.months);
    const approvals: Loan['approvals'] = [];
    const decided = ['APPROVED', 'REPAYING', 'LATE_1', 'LATE_2', 'REPAID'].includes(plan.status);
    const at = iso(nowMs - plan.ageDays * DAY + DAY);
    if (decided) {
      if (plan.amount <= 500_000) approvals.push({ role: 'BRANCH_MANAGER', userId: 'u-bm', at });
      else if (plan.amount <= 3_000_000) approvals.push({ role: 'DG', userId: 'u-dg', at });
      else {
        approvals.push({ role: 'DG', userId: 'u-dg', at });
        approvals.push({ role: 'ACCOUNTANT', userId: 'u-acc', at });
      }
    }
    return {
      id: `l-${k + 1}`,
      memberId: member.id,
      agentId: member.agentId,
      amount: plan.amount,
      months: plan.months,
      fee: loanFee(plan.amount) ?? 0,
      total: schedule.total,
      monthly: schedule.monthly,
      status: plan.status,
      statusReason:
        plan.status === 'LATE_2'
          ? 'Deux mensualités en retard : épargne bloquée.'
          : plan.status === 'LATE_1'
            ? 'Une mensualité en retard : relance envoyée.'
            : undefined,
      approvals,
      repaid:
        plan.status === 'REPAID'
          ? schedule.total
          : Math.min(plan.paid * schedule.monthly, schedule.total),
      createdAt: iso(nowMs - plan.ageDays * DAY - 2 * HOUR),
    };
  });

  // ---- Cash closures and remittances --------------------------------------
  const businessDays: number[] = [];
  for (let d = 1; businessDays.length < 3; d++) {
    const ms = todayStart - d * DAY;
    if (new Date(ms).getUTCDay() !== 0) businessDays.push(ms); // markets closed on Sunday
  }
  const cashOn = (dayMs: number) =>
    payments
      .filter(
        (p) =>
          p.channel === 'CASH' &&
          p.status === 'CONFIRMED' &&
          dateOf(Date.parse(p.createdAt)) === dateOf(dayMs),
      )
      .reduce((s, p) => s + p.amount, 0);

  const closures: CashClosure[] = [];
  const remittances: Remittance[] = [];
  const closurePlan = [
    { day: businessDays[2], status: 'CLOSED' as const, variance: 0 },
    { day: businessDays[1], status: 'CLOSED' as const, variance: -500 },
    { day: businessDays[0], status: 'CHECKED' as const, variance: 0 },
  ];
  for (const plan of closurePlan) {
    const expected = Math.max(cashOn(plan.day), 25_000);
    const billettage = greedyBillettage(expected + plan.variance);
    const counted = billettageTotal(billettage);
    const dayIso = (h: number, min = 0) => iso(plan.day + h * HOUR + min * 60_000);
    const closure: CashClosure = {
      id: `cl-${dateOf(plan.day)}`,
      businessDate: dateOf(plan.day),
      status: plan.status,
      expected,
      counted,
      variance: counted - expected,
      varianceReason:
        plan.variance !== 0
          ? 'Pièce de 500 F rendue en trop à un marchand ; signalé au comptable.'
          : undefined,
      billettage,
      countedBy: 'u-cash',
      countedAt: dayIso(16, 32),
      checkedBy: 'u-acc',
      checkedAt: dayIso(17, 5),
      closedBy: plan.status === 'CLOSED' ? 'u-dg' : undefined,
      closedAt: plan.status === 'CLOSED' ? dayIso(18, 10) : undefined,
    };
    closures.push(closure);
  }
  // One hand-over of a closed day's cash to accounting.
  remittances.push({
    id: 'rm-1',
    closureId: closures[0].id,
    amount: closures[0].counted,
    fromUserId: 'u-cash',
    toUserId: 'u-acc',
    status: 'RECEIVED',
    at: iso(businessDays[2] + 17 * HOUR + 30 * 60_000),
  });

  // Today's open closure and the agents' remittances (mockup: received / pending / missing).
  const todayClosure: CashClosure = {
    id: `cl-${today}`,
    businessDate: today,
    status: 'OPEN',
    expected: 0,
    counted: 0,
    variance: 0,
    billettage: emptyBillettage(),
  };
  const agentStatus: Remittance['status'][] = [
    'RECEIVED',
    'RECEIVED',
    'PENDING',
    'RECEIVED',
    'RECEIVED',
    'MISSING',
  ];
  AGENTS.forEach((agent, k) => {
    const amount = payments
      .filter(
        (p) =>
          p.agentId === agent.id &&
          p.channel === 'CASH' &&
          p.status === 'CONFIRMED' &&
          dateOf(Date.parse(p.createdAt)) === today,
      )
      .reduce((s, p) => s + p.amount, 0);
    remittances.push({
      id: `rm-${remittances.length + 1}`,
      closureId: todayClosure.id,
      amount,
      fromUserId: agent.id,
      toUserId: 'u-cash',
      status: agentStatus[k],
      at: agentStatus[k] === 'RECEIVED' ? iso(Math.min(todayStart + 15 * HOUR, nowMs)) : undefined,
    });
  });
  todayClosure.expected = remittances
    .filter((r) => r.closureId === todayClosure.id)
    .reduce((s, r) => s + r.amount, 0);
  closures.push(todayClosure);

  // ---- Ledger (append-only double entry) ----------------------------------
  const ledger: LedgerEntry[] = [];
  const addEntry = (e: Omit<LedgerEntry, 'id'>) => {
    const entry = { ...e, id: `e-${String(ledger.length + 1).padStart(4, '0')}` };
    ledger.push(entry);
    return entry;
  };
  const memberName = new Map(members.map((m) => [m.id, m.fullName]));
  for (const p of payments) {
    if (p.status !== 'CONFIRMED') continue;
    const isMembership = p.typeId === membershipType.id;
    addEntry({
      date: p.createdAt,
      journal: p.channel === 'CASH' ? 'CAISSE' : 'MOBILE',
      label:
        `${isMembership ? 'Adhésion' : 'Versement'} ${memberName.get(p.memberId ?? '') ?? ''}`.trim(),
      lines: [
        { account: CHANNEL_ACCOUNT[p.channel], debit: p.amount, credit: 0 },
        { account: isMembership ? '7061' : '4671', debit: 0, credit: p.amount },
      ],
      createdBy: p.agentId ?? p.cashierId ?? 'system',
      sourcePaymentId: p.id,
    });
  }
  // Mockup example: wrong amount, reversal, corrected entry.
  const victim = activeMembers[10];
  const wrongAt = todayStart + 13 * HOUR + 9 * 60_000;
  if (wrongAt < nowMs) {
    const wrong = addEntry({
      date: iso(wrongAt),
      journal: 'CAISSE',
      label: `Versement ${victim.fullName} · saisie erronée`,
      lines: [
        { account: '571', debit: 5000, credit: 0 },
        { account: '4671', debit: 0, credit: 5000 },
      ],
      createdBy: 'u-cash',
    });
    const reversal = addEntry({
      date: iso(wrongAt + 60_000),
      journal: 'CAISSE',
      label: `Contre-écriture de l'écriture ${wrong.id}`,
      lines: [
        { account: '571', debit: 0, credit: 5000 },
        { account: '4671', debit: 5000, credit: 0 },
      ],
      reversesEntryId: wrong.id,
      reason: 'Montant saisi 5 000 F au lieu de 500 F.',
      createdBy: 'u-acc',
    });
    wrong.reversedByEntryId = reversal.id;
    addEntry({
      date: iso(wrongAt + 2 * 60_000),
      journal: 'CAISSE',
      label: `Versement ${victim.fullName} · montant corrigé`,
      lines: [
        { account: '571', debit: 500, credit: 0 },
        { account: '4671', debit: 0, credit: 500 },
      ],
      createdBy: 'u-cash',
    });
  }

  // ---- SMS ------------------------------------------------------------------
  const smsLog: AppNotification[] = [];
  const recent = payments.filter((p) => p.status === 'CONFIRMED' && p.memberId).slice(-20);
  recent.forEach((p, k) => {
    const m = members.find((x) => x.id === p.memberId)!;
    smsLog.push({
      id: `sms-${k + 1}`,
      templateCode: 'DEPOSIT',
      to: m.phone,
      body: `GROUPE WASSIA : Cher(e) ${m.fullName}, versement de ${p.amount} FCFA reçu. Nouveau solde : ${m.savings} FCFA. Merci !`,
      sentAt: p.createdAt,
      status: k === 7 ? 'FAILED' : k >= 18 ? 'QUEUED' : 'SENT',
    });
  });

  // ---- Audit ----------------------------------------------------------------
  const audit: AuditLog[] = [
    {
      id: 'a-1',
      userId: 'u-dg',
      action: 'CLOSE_DAY',
      entity: 'CashClosure',
      entityId: closures[0].id,
      at: closures[0].closedAt!,
    },
    {
      id: 'a-2',
      userId: 'u-acc',
      action: 'REVERSE_ENTRY',
      entity: 'LedgerEntry',
      entityId: ledger[ledger.length - 2]?.id ?? '',
      at: ledger[ledger.length - 2]?.date ?? iso(nowMs),
    },
    {
      id: 'a-3',
      userId: 'u-bm',
      action: 'APPROVE_LOAN',
      entity: 'Loan',
      entityId: loans[4].id,
      at: loans[4].approvals[0]?.at ?? iso(nowMs),
    },
  ];

  return {
    version: MOCK_DATA_VERSION,
    seededAt: iso(nowMs),
    users,
    members,
    cards,
    payments,
    paymentTypes: DEFAULT_PAYMENT_TYPES.map((t) => ({ ...t })),
    reconciliation,
    closures,
    remittances,
    accounts: ACCOUNTS.map((a) => ({ ...a })),
    ledger,
    loans,
    smsTemplates: SMS_TEMPLATES.map((t) => ({ ...t, variables: [...t.variables] })),
    smsLog,
    settings: { ...DEFAULT_SETTINGS },
    audit,
  };
}
