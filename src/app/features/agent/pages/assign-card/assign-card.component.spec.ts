import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { DEFAULT_PAYMENT_TYPES } from '@core/config/payment-types.config';
import { Card, Member, Payment } from '@core/models';
import { SIMULATED_QR_SCANS } from '@shared/components/card-scan/card-scan.component';
import { AgentApi } from '../../services/agent-api.service';
import { AssignCardPage } from './assign-card.component';

const member: Member = {
  id: 'm-1',
  fullName: 'Mariam Traoré',
  phone: '07 00 00 00 09',
  market: 'Marcory',
  trade: 'Vente de pagnes',
  agentId: 'u-ag1',
  status: 'CARD_TO_ASSIGN',
  accountNumber: 'CPT-000121',
  savings: 0,
  createdAt: '2026-11-10T09:00:00Z',
  updatedAt: '2026-11-10T09:00:00Z',
};
const membership: Payment = {
  id: 'p-1',
  memberId: 'm-1',
  typeId: 'pt-membership',
  amount: 1000,
  channel: 'WAVE',
  status: 'CONFIRMED',
  createdAt: '2026-11-10T09:00:00Z',
};
const blankCard: Card = {
  id: 'c-7',
  printedNumber: 'WAS-000007',
  qrToken: 'QR7',
  status: 'UNASSIGNED',
};

function render() {
  const scans = new Subject<string>();
  const api = {
    member: vi.fn(() => of({ member, card: null, payments: [membership], loans: [] })),
    paymentTypes: vi.fn(() => of([...DEFAULT_PAYMENT_TYPES])),
    lookupCard: vi.fn(() => of({ card: blankCard })),
    assignCard: vi.fn(() =>
      of({
        member: { ...member, status: 'ACTIVE' as const },
        card: { ...blankCard, status: 'ACTIVE' as const },
      }),
    ),
  };
  TestBed.configureTestingModule({
    imports: [AssignCardPage],
    providers: [
      provideRouter([]),
      { provide: AgentApi, useValue: api },
      { provide: SIMULATED_QR_SCANS, useValue: scans },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'm-1' })) } },
    ],
  });
  const fixture = TestBed.createComponent(AssignCardPage);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const text = () => (el.textContent ?? '').replace(/\s+/g, ' ');
  const assignButton = () =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Associer et remettre'));
  const scan = async (token: string) => {
    scans.next(token);
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, api, text, scan, assignButton };
}

describe('AssignCardPage', () => {
  it('shows the membership fee found by its payment type', async () => {
    const { fixture, text } = render();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(text()).toContain('Mariam Traoré est enregistré.');
    expect(text()).toMatch(/1.000.F reçus par Wave/);
  });

  it('only allows association once a blank card has been scanned', async () => {
    const { fixture, scan, text, assignButton, api } = render();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(assignButton()?.disabled).toBe(true);
    await scan('QR7');
    expect(api.lookupCard).toHaveBeenCalledWith('QR7');
    expect(text()).toContain('Carte WAS-000007 reconnue');
    assignButton()?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.assignCard).toHaveBeenCalledWith('m-1', 'QR7');
    expect(text()).toContain('Carte activée');
  });

  it('refuses a card that is already used', async () => {
    const { fixture, scan, text, assignButton, api } = render();
    api.lookupCard.mockReturnValue(of({ card: { ...blankCard, status: 'ACTIVE' } }));
    await fixture.whenStable();
    await scan('QR7');
    expect(text()).toContain('déjà utilisée');
    expect(assignButton()?.disabled).toBe(true);
  });

  it('explains an unknown QR code in plain French', async () => {
    const { fixture, scan, text, api } = render();
    api.lookupCard.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { code: 'CARD_NOT_FOUND', message: 'Ce code QR n’est pas une carte WASSIA.' },
          }),
      ),
    );
    await fixture.whenStable();
    await scan('XYZ');
    expect(text()).toContain('Ce code QR n’est pas une carte WASSIA.');
  });
});
