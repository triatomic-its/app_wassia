import { ROLES } from '../models';
import { formatCardNumber } from './cards.config';
import {
  LOAN_AMOUNTS,
  LOAN_DURATIONS,
  computeLoanSchedule,
  loanFee,
  requiredApprovals,
} from './loan.config';
import { BACKOFFICE_NAV } from './navigation.config';
import { PERMISSIONS, ROLE_PERMISSIONS, hasPermission, permissionsOf } from './permissions.config';
import {
  CLOSURE_WORKFLOW,
  ENROLLMENT_WORKFLOW,
  LOAN_WORKFLOW,
  PAYMENT_WORKFLOW,
  availableTransitions,
  canTransition,
} from './workflow.config';

describe('permission matrix', () => {
  it('only references known permissions', () => {
    for (const role of ROLES) {
      for (const p of ROLE_PERMISSIONS[role]) expect(PERMISSIONS).toContain(p);
    }
  });

  it('keeps the deputy DG read-only', () => {
    const actions = ROLE_PERMISSIONS.DEPUTY_DG.filter(
      (p) => !p.endsWith('.view') && p !== 'enrollment.monitor',
    );
    expect(actions).toEqual([]);
  });

  it('separates duties in the cash closure', () => {
    expect(hasPermission('CASHIER', 'cash.closure.count')).toBe(true);
    expect(hasPermission('CASHIER', 'cash.closure.check')).toBe(false);
    expect(hasPermission('ACCOUNTANT', 'cash.closure.check')).toBe(true);
    expect(hasPermission('ACCOUNTANT', 'cash.closure.close')).toBe(false);
    expect(hasPermission('DG', 'cash.closure.close')).toBe(true);
    expect(hasPermission('DG', 'cash.closure.count')).toBe(false);
  });

  it('lets only agents enroll merchants and collect in the field', () => {
    for (const role of ROLES) {
      expect(hasPermission(role, 'member.enroll')).toBe(role === 'AGENT');
      expect(hasPermission(role, 'collect.field')).toBe(role === 'AGENT');
    }
  });

  it('shows at most 7 menu entries per role', () => {
    for (const role of ROLES) {
      const perms = permissionsOf(role);
      expect(BACKOFFICE_NAV.filter((i) => perms.has(i.permission)).length).toBeLessThanOrEqual(7);
    }
  });
});

describe('workflow tables', () => {
  it('has no manual validation: only the card scan by the agent activates a member', () => {
    const manual = ENROLLMENT_WORKFLOW.filter((t) => t.actor !== 'SYSTEM');
    expect(manual.map((t) => t.from + '->' + t.to)).toEqual(['CARD_TO_ASSIGN->ACTIVE']);
    expect(
      availableTransitions(ENROLLMENT_WORKFLOW, 'CARD_TO_ASSIGN', permissionsOf('AGENT')),
    ).toHaveLength(1);
    expect(
      availableTransitions(ENROLLMENT_WORKFLOW, 'CARD_TO_ASSIGN', permissionsOf('DG')),
    ).toHaveLength(0);
  });

  it('walks the 3-level closure with one role per level', () => {
    expect(canTransition(CLOSURE_WORKFLOW, 'LOCKED', 'COUNTED', permissionsOf('CASHIER'))).toBe(
      true,
    );
    expect(canTransition(CLOSURE_WORKFLOW, 'COUNTED', 'CHECKED', permissionsOf('ACCOUNTANT'))).toBe(
      true,
    );
    expect(canTransition(CLOSURE_WORKFLOW, 'CHECKED', 'CLOSED', permissionsOf('DG'))).toBe(true);
    expect(canTransition(CLOSURE_WORKFLOW, 'COUNTED', 'CHECKED', permissionsOf('CASHIER'))).toBe(
      false,
    );
    expect(canTransition(CLOSURE_WORKFLOW, 'LOCKED', 'CLOSED', permissionsOf('DG'))).toBe(false);
  });

  it('never exposes SYSTEM transitions as buttons', () => {
    expect(availableTransitions(CLOSURE_WORKFLOW, 'OPEN', permissionsOf('DG'))).toEqual([]);
    expect(canTransition(CLOSURE_WORKFLOW, 'OPEN', 'LOCKED', 'SYSTEM')).toBe(true);
  });

  it('requires a reason for every rejection, dispute, suspension and reversal', () => {
    const all = [
      ...ENROLLMENT_WORKFLOW,
      ...CLOSURE_WORKFLOW,
      ...PAYMENT_WORKFLOW,
      ...LOAN_WORKFLOW,
    ];
    for (const t of all) {
      if (['REJECTED', 'TO_CORRECT', 'DISPUTED', 'REVERSED', 'SUSPENDED'].includes(t.to)) {
        expect(t.reasonRequired, `${t.from}->${t.to}`).toBe(true);
      }
    }
  });

  it('never deletes a payment: cancellation goes to REVERSED', () => {
    expect(PAYMENT_WORKFLOW.some((t) => t.from === 'CONFIRMED' && t.to === 'REVERSED')).toBe(true);
  });
});

describe('loan grid', () => {
  it('matches the official grid totals and monthly instalments', () => {
    expect(computeLoanSchedule(250_000, 6)).toEqual({
      total: 270_000,
      monthly: 45_000,
      last: 45_000,
    });
    expect(computeLoanSchedule(250_000, 12)).toEqual({
      total: 295_000,
      monthly: 24_583,
      last: 24_587,
    });
    expect(computeLoanSchedule(250_000, 18).monthly).toBe(17_777);
    expect(computeLoanSchedule(500_000, 12).monthly).toBe(49_166);
    expect(computeLoanSchedule(1_000_000, 18).monthly).toBe(71_111);
    expect(computeLoanSchedule(5_000_000, 12).monthly).toBe(491_666);
    expect(computeLoanSchedule(10_000_000, 18)).toMatchObject({
      total: 12_800_000,
      monthly: 711_111,
    });
  });

  it('always sums instalments back to the total', () => {
    for (const { amount } of LOAN_AMOUNTS) {
      for (const months of LOAN_DURATIONS) {
        const s = computeLoanSchedule(amount, months);
        expect(s.monthly * (months - 1) + s.last).toBe(s.total);
        expect(Number.isInteger(s.monthly)).toBe(true);
      }
    }
  });

  it('rejects non-integer amounts', () => {
    expect(() => computeLoanSchedule(1000.5, 6)).toThrow(RangeError);
  });

  it('returns the file fee from the grid', () => {
    expect(loanFee(3_000_000)).toBe(50_000);
    expect(loanFee(123)).toBeUndefined();
  });

  it('applies approval tiers (gaps per ASSUMPTION A11)', () => {
    expect(requiredApprovals(250_000)).toEqual(['loan.approve.tier1']);
    expect(requiredApprovals(500_000)).toEqual(['loan.approve.tier1']);
    expect(requiredApprovals(750_000)).toEqual(['loan.approve.tier2']);
    expect(requiredApprovals(3_000_000)).toEqual(['loan.approve.tier2']);
    expect(requiredApprovals(5_000_000)).toEqual([
      'loan.approve.tier3.dg',
      'loan.approve.tier3.accounting',
    ]);
  });
});

describe('card numbers', () => {
  it('uses the WAS-000000 format', () => {
    expect(formatCardNumber(124)).toBe('WAS-000124');
    expect(formatCardNumber(1000)).toBe('WAS-001000');
  });
});
