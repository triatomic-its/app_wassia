import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { CollectTarget, DepositResult } from '@core/models';
import { SIMULATED_QR_SCANS } from '@shared/components/card-scan/card-scan.component';
import { AgentApi } from '../../services/agent-api.service';
import { CollectPage } from './collect.component';

const NBSP = new RegExp('[' + String.fromCharCode(0xa0, 0x202f) + ']', 'g');

const TARGET: CollectTarget = {
  member: {
    id: 'acc-1',
    fullName: 'Mariam TRAORÉ',
    phone: '07 00 00 00 01',
    market: 'Adjamé',
    trade: 'Commerce',
    agentId: 'ag-1',
    status: 'PENDING_VALIDATION',
    savings: 0,
    createdAt: '2026-11-20T10:00:00Z',
    updatedAt: '2026-11-20T10:00:00Z',
  },
  card: { id: 'card-1', printedNumber: 'WAS-000124', status: 'ASSIGNED' },
  balance: { booked: 0, pending: 12_500, total: 12_500 },
};

const result = (amount: number, channel: 'CASH' | 'WAVE'): DepositResult => ({
  payment: {
    id: 'p-1',
    memberId: 'acc-1',
    typeId: 'pt-savings',
    amount,
    channel,
    status: channel === 'CASH' ? 'PENDING_CASH' : 'CONFIRMED',
    createdAt: '2026-11-20T13:18:00Z',
  },
  balance: { booked: 0, pending: 12_500 + amount, total: 12_500 + amount },
});

function render() {
  const scans = new Subject<string>();
  const api = {
    cutoffTime: vi.fn(() => of('16:00')),
    findByCard: vi.fn(() => of(TARGET)),
    deposit: vi.fn(() => of(result(1000, 'CASH'))),
  };
  TestBed.configureTestingModule({
    imports: [CollectPage],
    providers: [
      provideRouter([]),
      { provide: AgentApi, useValue: api },
      { provide: SIMULATED_QR_SCANS, useValue: scans },
    ],
  });
  const fixture = TestBed.createComponent(CollectPage);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const text = () => (el.textContent ?? '').replace(NBSP, ' ').replace(/\s+/g, ' ');
  const scan = (token = 'qr-token') => {
    scans.next(token);
    fixture.detectChanges();
  };
  const click = (label: string) => {
    const button = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.replace(NBSP, ' ').trim().startsWith(label),
    );
    if (!button) throw new Error(`No button: ${label}`);
    button.click();
    fixture.detectChanges();
  };
  const pick = (name: string, value: string) => {
    const radio = el.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
    if (!radio) throw new Error(`No radio ${name}=${value}`);
    radio.click();
    fixture.detectChanges();
  };
  const type = (id: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(`#${id}`);
    if (!input) throw new Error(`No input #${id}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  return { api, el, text, scan, click, pick, type };
}

describe('CollectPage', () => {
  it('finds the merchant from the card and shows their savings', () => {
    const { api, text, scan } = render();
    expect(text()).toContain('Scanner la carte du marchand');
    scan('qr-abc');
    expect(api.findByCard).toHaveBeenCalledWith('qr-abc');
    expect(text()).toContain('Mariam TRAORÉ');
    expect(text()).toContain('WAS-000124 · Épargne 12 500 F');
    expect(text()).toContain('En attente de validation');
    expect(text()).toContain('Enregistrer 1 000 F');
  });

  it('records 1 000 F in cash by default and shows the receipt', () => {
    const { api, text, scan, click } = render();
    scan();
    click('Enregistrer');
    expect(api.deposit).toHaveBeenCalledWith(
      { memberId: 'acc-1', amount: 1000, channel: 'CASH', reference: undefined },
      expect.any(String),
    );
    expect(text()).toContain('Versement enregistré');
    expect(text()).toContain('13 500 F');
    expect(text()).toContain('comptés après la validation de la caisse');
  });

  it('takes a typed amount and refuses a decimal one', () => {
    const { api, text, scan, click, pick, type } = render();
    scan();
    pick('co-amount', 'other');
    type('co-other', '1500,5');
    click('Enregistrer');
    expect(text()).toContain('sans virgule');
    expect(api.deposit).not.toHaveBeenCalled();
    type('co-other', '5 000');
    click('Enregistrer');
    expect(api.deposit).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5000 }),
      expect.any(String),
    );
  });

  it('needs the Wave reference', () => {
    const { api, text, scan, click, pick, type } = render();
    api.deposit.mockReturnValue(of(result(1000, 'WAVE')));
    scan();
    pick('co-channel', 'WAVE');
    click('Enregistrer');
    expect(text()).toContain('Écrivez la référence du paiement Wave.');
    type('co-ref', 'T-ABCD1234');
    click('Enregistrer');
    expect(api.deposit).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'WAVE', reference: 'T-ABCD1234' }),
      expect.any(String),
    );
  });

  it('retries a failed deposit with the same key, and uses a new key for the next card', () => {
    const { api, scan, click } = render();
    api.deposit
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
      .mockReturnValue(of(result(1000, 'CASH')));
    scan();
    click('Enregistrer');
    click('Enregistrer');
    click('Scanner une autre carte');
    scan();
    click('Enregistrer');
    const keys = api.deposit.mock.calls.map((c) => (c as unknown as [unknown, string])[1]);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('explains a card that is not associated yet', () => {
    const { api, text, scan } = render();
    api.findByCard.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: {
              code: 'CARD_NOT_ASSIGNED',
              message: 'Cette carte n’est associée à aucun marchand.',
            },
          }),
      ),
    );
    scan();
    expect(text()).toContain('Cette carte n’est associée à aucun marchand.');
  });
});
