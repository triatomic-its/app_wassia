import { Fait } from '@core/models/registre.model';
import { RegistreMemberFacts, buildAgentMembers } from './registre-members';

const h = (c: string) => c.repeat(64);
let n = 0;
const fact = (
  type: string,
  champs: Record<string, unknown>,
  preds: Record<string, string>,
  recuLe = '2026-11-20T10:00:00Z',
): Fait => ({
  fait: `${type}-${++n}`,
  type,
  champs,
  recuLe,
  predecesseurs: Object.entries(preds).map(([role, predecesseur]) => ({ role, predecesseur })),
});

const AGENT = h('g');
const account = (id: string, person: string, agent = AGENT, at = '2026-11-20T10:00:00Z'): Fait => ({
  ...fact('CompteEpargne', {}, { personne: person, agent, marche: h('m') }, at),
  fait: id,
});

function facts(over: Partial<RegistreMemberFacts> = {}): RegistreMemberFacts {
  return {
    accounts: [
      account(h('1'), h('p'), AGENT, '2026-11-20T09:00:00Z'),
      account(h('2'), h('q'), AGENT, '2026-11-20T11:00:00Z'),
      account(h('3'), h('r'), h('o')),
    ],
    identities: [fact('Identite', { nom: 'KONÉ', prenoms: 'Awa' }, { personne: h('p') })],
    phones: [fact('AncrageTelephone', { numero: '0700000001' }, { personne: h('p') })],
    idDocuments: [],
    numbers: [fact('NumeroCompte', { valeur: 'WS-2026-000001' }, { compte: h('1') })],
    activities: [],
    associations: [],
    cardActivations: [],
    cash: [
      fact(
        'EncaissementEspeces',
        { nature: 'ouverture_cash', montantFcfa: 1000 },
        { compte: h('1'), agent: AGENT },
      ),
    ],
    digital: [],
    ...over,
  };
}

const LABELS = {
  markets: new Map([[h('m'), 'Marché d’Adjamé']]),
  sectors: new Map<string, string>(),
  cardNumbers: new Map([[h('c'), 'WAS-000001']]),
};

describe('buildAgentMembers', () => {
  it('lists only the agent’s merchants, newest first, with name, phone and account number', () => {
    const list = buildAgentMembers(facts(), AGENT, LABELS);
    expect(list.map((d) => d.member.id)).toEqual([h('2'), h('1')]);
    expect(list[1].member).toMatchObject({
      fullName: 'Awa KONÉ',
      phone: '07 00 00 00 01',
      market: 'Marché d’Adjamé',
      accountNumber: 'WS-2026-000001',
      status: 'CARD_TO_ASSIGN',
    });
    expect(list[1].payments[0]).toMatchObject({
      amount: 1000,
      channel: 'CASH',
      status: 'PENDING_CASH',
    });
  });

  it('waits for validation once a card is associated, and is active once the card is activated', () => {
    const link = fact('AssociationCarte', {}, { carte: h('c'), compte: h('1'), agent: AGENT });
    const pending = buildAgentMembers(facts({ associations: [link] }), AGENT, LABELS);
    const awa = pending.find((d) => d.member.id === h('1'))!;
    expect(awa.member.status).toBe('PENDING_VALIDATION');
    expect(awa.card).toMatchObject({ printedNumber: 'WAS-000001', status: 'ASSIGNED' });

    const activation = fact('ActivationCarte', {}, { association: link.fait });
    const active = buildAgentMembers(
      facts({ associations: [link], cardActivations: [activation] }),
      AGENT,
      LABELS,
    );
    expect(active.find((d) => d.member.id === h('1'))!.member.status).toBe('ACTIVE');
  });

  it('ignores an account replaced by a successor', () => {
    const successor = {
      ...account(h('9'), h('p')),
      predecesseurs: [
        ...account(h('9'), h('p')).predecesseurs,
        { role: 'prior', predecesseur: h('1') },
      ],
    };
    const list = buildAgentMembers(
      facts({ accounts: [...facts().accounts, successor] }),
      AGENT,
      LABELS,
    );
    expect(list.map((d) => d.member.id)).not.toContain(h('1'));
  });
});
