import { computeLoanSchedule } from '../../core/config/loan.config';
import { billettageTotal } from '../../core/domain/cash';
import { seedMockData } from './seed';

const NOW = new Date('2026-11-09T14:30:00Z');

describe('seedMockData', () => {
  const data = seedMockData(NOW);

  it('is deterministic for a given seed and time', () => {
    expect(JSON.stringify(seedMockData(NOW))).toBe(JSON.stringify(data));
    expect(JSON.stringify(seedMockData(NOW, 42))).not.toBe(JSON.stringify(data));
  });

  it('has one user per role plus six agents', () => {
    expect(data.users).toHaveLength(12);
    expect(data.users.filter((u) => u.role === 'AGENT')).toHaveLength(6);
  });

  it('spreads 120 members over 3 markets, all paid and holding a card', () => {
    expect(data.members).toHaveLength(120);
    expect(new Set(data.members.map((m) => m.market))).toEqual(
      new Set(['Adjamé', 'Marcory', 'Yopougon']),
    );
    expect(new Set(data.members.map((m) => m.status))).toEqual(new Set(['ACTIVE', 'SUSPENDED']));
    for (const m of data.members) {
      expect(m.cardId).toBeTruthy();
      const membership = data.payments.filter(
        (p) => p.memberId === m.id && p.typeId === 'pt-membership',
      );
      expect(membership).toHaveLength(1);
      expect(membership[0].createdAt).toBe(m.createdAt);
    }
  });

  it('prints 1000 cards WAS-000001…001000 and links active members to an active card', () => {
    expect(data.cards).toHaveLength(1000);
    expect(data.cards[0].printedNumber).toBe('WAS-000001');
    expect(data.cards[999].printedNumber).toBe('WAS-001000');
    for (const m of data.members.filter((x) => x.status === 'ACTIVE')) {
      const card = data.cards.find((c) => c.id === m.cardId);
      expect(card?.status).toBe('ACTIVE');
      expect(card?.memberId).toBe(m.id);
    }
    expect(data.cards.filter((c) => c.status === 'BLOCKED').length).toBeGreaterThan(0);
  });

  it('never puts member data in the QR token', () => {
    for (const c of data.cards.slice(0, 50)) {
      expect(c.qrToken).toMatch(/^[A-Z2-9]{24}$/);
      expect(c.qrToken).not.toContain(c.printedNumber);
    }
  });

  it('has ~600 payments in integer FCFA, with 2 orphans, 2 duplicates and 1 pending cash', () => {
    expect(data.payments.length).toBeGreaterThan(500);
    expect(data.payments.length).toBeLessThan(750);
    expect(data.payments.every((p) => Number.isInteger(p.amount) && p.amount > 0)).toBe(true);
    expect(data.payments.filter((p) => p.status === 'ORPHAN')).toHaveLength(2);
    expect(data.payments.filter((p) => p.status === 'DUPLICATE')).toHaveLength(2);
    expect(data.payments.filter((p) => p.status === 'PENDING_CASH')).toHaveLength(1);
    expect(data.reconciliation).toHaveLength(4);
    expect(data.payments.every((p) => Date.parse(p.createdAt) <= NOW.getTime())).toBe(true);
  });

  it('computes savings from confirmed deposits only', () => {
    const m = data.members.find((x) => x.status === 'ACTIVE')!;
    const expected = data.payments
      .filter((p) => p.memberId === m.id && p.status === 'CONFIRMED' && p.typeId === 'pt-savings')
      .reduce((s, p) => s + p.amount, 0);
    expect(m.savings).toBe(expected);
  });

  it('keeps every ledger entry balanced and the reversal linked', () => {
    for (const e of data.ledger) {
      const debit = e.lines.reduce((s, l) => s + l.debit, 0);
      const credit = e.lines.reduce((s, l) => s + l.credit, 0);
      expect(debit).toBe(credit);
    }
    const reversal = data.ledger.find((e) => e.reversesEntryId);
    expect(reversal?.reason).toBeTruthy();
    expect(data.ledger.find((e) => e.id === reversal!.reversesEntryId)?.reversedByEntryId).toBe(
      reversal!.id,
    );
  });

  it('builds closures whose counted total matches the billettage, one with a justified variance', () => {
    const past = data.closures.filter((c) => c.status !== 'OPEN');
    expect(past).toHaveLength(3);
    for (const c of past) {
      expect(billettageTotal(c.billettage)).toBe(c.counted);
      expect(c.variance).toBe(c.counted - c.expected);
    }
    const withVariance = past.filter((c) => c.variance !== 0);
    expect(withVariance).toHaveLength(1);
    expect(withVariance[0].varianceReason).toBeTruthy();
    expect(data.closures.find((c) => c.status === 'OPEN')?.businessDate).toBe('2026-11-09');
  });

  it('has today’s agent remittances with received, pending and missing ones', () => {
    const today = data.remittances.filter((r) => r.closureId === 'cl-2026-11-09');
    expect(today).toHaveLength(6);
    expect(new Set(today.map((r) => r.status))).toEqual(
      new Set(['RECEIVED', 'PENDING', 'MISSING']),
    );
  });

  it('creates loans consistent with the official grid and approval tiers', () => {
    expect(new Set(data.loans.map((l) => l.status)).size).toBeGreaterThanOrEqual(7);
    for (const l of data.loans) {
      expect(l.total).toBe(computeLoanSchedule(l.amount, l.months).total);
      expect(l.monthly).toBe(computeLoanSchedule(l.amount, l.months).monthly);
    }
    const big = data.loans.find((l) => l.status === 'LATE_2')!;
    expect(big.approvals.map((a) => a.role).sort()).toEqual(['ACCOUNTANT', 'DG']);
    expect(data.members.find((m) => m.id === big.memberId)?.status).toBe('SUSPENDED');
  });

  it('ships the SMS templates', () => {
    expect(data.smsTemplates.map((t) => t.code)).toContain('DEPOSIT');
    expect(data.smsLog.length).toBeGreaterThan(0);
  });
});
