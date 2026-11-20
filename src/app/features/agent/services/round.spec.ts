import { EnrollmentStatus, Payment } from '@core/models';
import { QueuedDeposit } from '../models/offline.model';
import type { MemberDetail } from './agent-api.service';
import { buildRound, filterRound } from './round';

const TODAY = '2026-11-20';

const savings = (amount: number, businessDate: string): Payment => ({
  id: `p-${amount}-${businessDate}`,
  typeId: 'pt-savings',
  amount,
  channel: 'CASH',
  status: 'PENDING_CASH',
  createdAt: `${businessDate}T10:00:00Z`,
  businessDate,
});

function detail(
  id: string,
  name: string,
  payments: Payment[] = [],
  status: EnrollmentStatus = 'PENDING_VALIDATION',
  stall?: string,
): MemberDetail {
  return {
    member: {
      id,
      fullName: name,
      phone: '',
      market: '',
      trade: '',
      stall,
      agentId: 'ag',
      status,
      savings: 0,
      createdAt: '',
      updatedAt: '',
    },
    card:
      status === 'CARD_TO_ASSIGN'
        ? null
        : { id: `c-${id}`, printedNumber: `WAS-00000${id}`, qrToken: '', status: 'ASSIGNED' },
    payments,
    loans: [],
  };
}

const queued = (memberId: string, amount: number): QueuedDeposit => ({
  key: `k-${memberId}`,
  memberId,
  agentId: 'ag',
  amount,
  dateValeur: TODAY,
  createdAt: '',
  fullName: '',
  printedNumber: '',
  state: 'pending',
});

describe('buildRound', () => {
  const members = [
    detail('1', 'Awa Koné', [savings(1000, TODAY), savings(500, '2026-11-19')]),
    detail('2', 'Yao Bamba'),
    detail('3', 'Fatou Yéo', [
      { ...savings(1000, TODAY), typeId: 'pt-membership' }, // the opening fee is not savings
    ]),
    detail('4', 'Sans Carte', [], 'CARD_TO_ASSIGN'),
    detail('5', 'Ibrahim Touré'),
  ];

  it('lists merchants with a card, today’s savings only, those still to visit first', () => {
    const round = buildRound(members, TODAY, []);
    expect(round.map((e) => [e.member.fullName, e.state, e.paidToday])).toEqual([
      ['Fatou Yéo', 'todo', 0],
      ['Ibrahim Touré', 'todo', 0],
      ['Yao Bamba', 'todo', 0],
      ['Awa Koné', 'paid', 1000],
    ]);
  });

  it('counts a deposit still on the phone as paid, waiting to be sent', () => {
    const round = buildRound(members, TODAY, [queued('2', 700)]);
    const yao = round.find((e) => e.member.id === '2');
    expect(yao).toMatchObject({ state: 'paid', paidToday: 0, waitingSync: 700 });
  });
});

describe('filterRound', () => {
  const round = buildRound(
    [
      detail('1', 'Awa Koné', [savings(1000, TODAY)], 'ACTIVE', 'Allée B, étal 12'),
      detail('2', 'Yao Bamba'),
    ],
    TODAY,
    [],
  );

  it('filters by state', () => {
    expect(filterRound(round, 'paid', '').map((e) => e.member.id)).toEqual(['1']);
    expect(filterRound(round, 'todo', '').map((e) => e.member.id)).toEqual(['2']);
  });

  it('searches name, stall or card number, without caring about accents or case', () => {
    expect(filterRound(round, 'all', 'kone').map((e) => e.member.id)).toEqual(['1']);
    expect(filterRound(round, 'all', 'étal 12').map((e) => e.member.id)).toEqual(['1']);
    expect(filterRound(round, 'all', 'was-000002').map((e) => e.member.id)).toEqual(['2']);
    expect(filterRound(round, 'all', 'personne')).toEqual([]);
  });
});
