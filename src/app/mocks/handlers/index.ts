import { ROLE_PERMISSIONS } from '@core/config/permissions.config';
import { FR } from '@core/i18n/fr';
import { ROLES } from '@core/models';
import { EnrollmentInput } from '@core/domain/enrollment';
import { maskName } from '@core/i18n/format/mask-name';
import { agentToday, assignCard, enrollMember, findByPhone, findCard } from '../domain';
import { MockContext, MockRoute, fail, matchesText, paginate, requireUser } from '../http';
import { MockData } from '../seed/seed';

/** Agents only see their own merchants and collections. */
function scopeToAgent<T extends { agentId?: string }>(ctx: MockContext, items: T[]): T[] {
  const user = ctx.user;
  return user?.role === 'AGENT' ? items.filter((i) => i.agentId === user.id) : items;
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

/** All mock endpoints. */
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
    pattern: '/agent/today',
    access: ['collect.field'],
    handler: (ctx) => agentToday(ctx.db.snapshot as MockData, requireUser(ctx), ctx.now),
  },
  {
    // POST so the phone number never appears in a URL (server logs, proxies, history).
    method: 'POST',
    pattern: '/members/phone-check',
    access: ['member.enroll'],
    handler: (ctx) => {
      const body = (ctx.body ?? {}) as { phone?: string };
      const existing = findByPhone(ctx.db.snapshot as MockData, body.phone ?? '');
      return existing
        ? { available: false, existingName: maskName(existing.fullName) }
        : { available: true };
    },
  },
  {
    method: 'POST',
    pattern: '/members',
    access: ['member.enroll'],
    status: 201,
    handler: (ctx) =>
      ctx.db.write((data) =>
        enrollMember(
          data,
          requireUser(ctx),
          (ctx.body ?? {}) as Partial<EnrollmentInput>,
          ctx.now,
          ctx.headers.get('Idempotency-Key') ?? undefined,
        ),
      ),
  },
  {
    method: 'POST',
    pattern: '/uploads',
    access: 'user',
    status: 201,
    // Simulated upload: the file stays on the device, only a reference is stored.
    handler: () => ({
      url: 'mock-upload://' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    }),
  },
  {
    // POST so the card's secret QR token never appears in a URL.
    method: 'POST',
    pattern: '/cards/lookup',
    access: ['card.assign', 'cards.manage'],
    handler: (ctx) => {
      const body = (ctx.body ?? {}) as { qrToken?: string; number?: string };
      const card = findCard(ctx.db.snapshot as MockData, {
        qr: body.qrToken,
        number: body.number,
      });
      if (!card) throw fail(404, 'CARD_NOT_FOUND', 'Ce code QR n’est pas une carte WASSIA.');
      return { card: { id: card.id, printedNumber: card.printedNumber, status: card.status } };
    },
  },
  {
    method: 'POST',
    pattern: '/cards/assign',
    access: ['card.assign'],
    handler: (ctx) => {
      const body = (ctx.body ?? {}) as { memberId?: string; qrToken?: string };
      return ctx.db.write((data) =>
        assignCard(data, requireUser(ctx), body.memberId ?? '', body.qrToken, ctx.now),
      );
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
