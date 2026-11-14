import { DEFAULT_PAYMENT_TYPES } from '../config/payment-types.config';
import { Payment } from '../models';
import { findMembershipPayment, membershipFeeOf } from './membership';

const payment = (id: string, typeId: string): Payment => ({
  id,
  typeId,
  amount: 1000,
  channel: 'CASH',
  status: 'CONFIRMED',
  createdAt: '2026-11-10T09:00:00Z',
});

describe('membership fee', () => {
  it('reads the amount set by the administration', () => {
    const types = DEFAULT_PAYMENT_TYPES.map((t) =>
      t.code === 'MEMBERSHIP' ? { ...t, defaultAmount: 1500 } : t,
    );
    expect(membershipFeeOf(types)).toBe(1500);
  });

  it('falls back to 1 000 F when nothing is configured', () => {
    expect(membershipFeeOf([])).toBe(1000);
  });

  it('finds the membership payment by its type, not by its position', () => {
    const payments = [payment('p-2', 'pt-savings'), payment('p-1', 'pt-membership')];
    expect(findMembershipPayment(payments, 'pt-membership')?.id).toBe('p-1');
    expect(findMembershipPayment(payments, undefined)).toBeUndefined();
  });
});
