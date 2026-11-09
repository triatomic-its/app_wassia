import { ROLE_PERMISSIONS } from '../../core/config/permissions.config';
import { FR } from '../../core/i18n/fr';
import { ROLES } from '../../core/models';
import { MockContext, MockRoute, fail, matchesText, paginate } from '../http';

/** Agents only see their own merchants and collections. */
function scopeToAgent<T extends { agentId?: string }>(ctx: MockContext, items: T[]): T[] {
  return ctx.user?.role === 'AGENT' ? items.filter((i) => i.agentId === ctx.user!.id) : items;
}

function filterBy<T>(items: T[], ctx: MockContext, fields: (keyof T & string)[]): T[] {
  return items.filter((item) =>
    fields.every((f) => {
      const wanted = ctx.query.get(f);
      return wanted === null || wanted === '' || String(item[f]) === wanted;
    }),
  );
}

const VIEW_MEMBERS = [
  'enrollment.monitor',
  'merchants.view',
  'member.enroll',
  'collect.counter',
  'loan.view',
] as const;

/** All mock endpoints (Phase 1: identity and read access to the seeded data). */
export const MOCK_ROUTES: readonly MockRoute[] = [
  {
    method: 'GET',
    pattern: '/me',
    access: 'user',
    handler: (ctx) => ({ user: ctx.user, permissions: [...ctx.permissions] }),
  },
  {
    method: 'GET',
    pattern: '/roles',
    access: 'user',
    handler: () =>
      ROLES.map((role) => ({
        role,
        label: FR.roles[role],
        hint: FR.roleHints[role],
        permissions: ROLE_PERMISSIONS[role],
      })),
  },
  {
    method: 'GET',
    pattern: '/users',
    access: 'user',
    handler: (ctx) => {
      const users = ctx.db.snapshot.users.filter(
        (u) =>
          (!ctx.query.get('role') || u.role === ctx.query.get('role')) &&
          matchesText([u.fullName, u.zone], ctx.query.get('q')),
      );
      return paginate(
        users,
        ctx.query.has('sort') ? ctx.query : ctx.query.set('sort', 'fullName,asc'),
      );
    },
  },
  {
    method: 'GET',
    pattern: '/settings',
    access: 'user',
    handler: (ctx) => ctx.db.snapshot.settings,
  },
  {
    method: 'GET',
    pattern: '/payment-types',
    access: 'user',
    handler: (ctx) => ctx.db.snapshot.paymentTypes,
  },
  {
    method: 'GET',
    pattern: '/members',
    access: VIEW_MEMBERS,
    handler: (ctx) => {
      const { members, cards } = ctx.db.snapshot;
      const cardNumber = new Map(cards.map((c) => [c.id, c.printedNumber]));
      const q = ctx.query.get('q');
      const items = filterBy(scopeToAgent(ctx, members), ctx, [
        'status',
        'market',
        'agentId',
      ]).filter((m) =>
        matchesText([m.fullName, m.phone, m.accountNumber, cardNumber.get(m.cardId ?? '')], q),
      );
      return paginate(items, ctx.query);
    },
  },
  {
    method: 'GET',
    pattern: '/members/:id',
    access: VIEW_MEMBERS,
    handler: (ctx) => {
      const { members, cards, payments, loans } = ctx.db.snapshot;
      const member = scopeToAgent(ctx, members).find((m) => m.id === ctx.params['id']);
      if (!member) throw fail(404, 'MEMBER_NOT_FOUND', 'Marchand introuvable.');
      return {
        member,
        card: cards.find((c) => c.id === member.cardId) ?? null,
        payments: payments
          .filter((p) => p.memberId === member.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 20),
        loans: loans.filter((l) => l.memberId === member.id),
      };
    },
  },
  {
    method: 'GET',
    pattern: '/cards',
    access: ['cards.manage', 'card.assign', 'merchants.view', 'enrollment.monitor'],
    handler: (ctx) => {
      const items = filterBy([...ctx.db.snapshot.cards], ctx, ['status', 'memberId']).filter((c) =>
        matchesText([c.printedNumber], ctx.query.get('q')),
      );
      return paginate(
        items,
        ctx.query.has('sort') ? ctx.query : ctx.query.set('sort', 'printedNumber,asc'),
      );
    },
  },
  {
    method: 'GET',
    pattern: '/payments',
    access: [
      'collect.field',
      'collect.counter',
      'cash.view',
      'ledger.view',
      'reconciliation',
      'merchants.view',
      'supervision.view',
    ],
    handler: (ctx) =>
      paginate(
        filterBy(scopeToAgent(ctx, [...ctx.db.snapshot.payments]), ctx, [
          'status',
          'channel',
          'memberId',
          'typeId',
          'agentId',
        ]),
        ctx.query,
      ),
  },
  {
    method: 'GET',
    pattern: '/loans',
    access: ['loan.view', 'loan.request'],
    handler: (ctx) =>
      paginate(
        filterBy(scopeToAgent(ctx, [...ctx.db.snapshot.loans]), ctx, ['status', 'memberId']),
        ctx.query,
      ),
  },
];
