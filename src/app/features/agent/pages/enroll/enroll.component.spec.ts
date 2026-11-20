import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { SessionStore } from '@core/auth/session.store';
import { PhoneCheck } from '@core/models';
import { ClockService } from '@core/services/clock.service';
import { AgentApi } from '../../services/agent-api.service';
import { EnrollmentStore } from './enroll.store';
import { EnrollPage } from './enroll.component';

const NON_BREAKING_SPACES = new RegExp('[' + String.fromCharCode(0xa0, 0x202f) + ']', 'g');

type ApiStub = ReturnType<typeof createApi>;

function createApi() {
  return {
    checkPhone: vi.fn(() => of<PhoneCheck>({ available: true })),
    membershipFee: vi.fn(() => of(1_000)),
    cutoffTime: vi.fn(() => of('16:00')),
    enrollmentOptions: vi.fn(() =>
      of({
        markets: [
          { value: 'Adjamé', label: 'Adjamé' },
          { value: 'Marcory', label: 'Marcory' },
        ],
        sectors: [{ value: 'commerce', label: 'Commerce général' }],
        minimumSavings: 2_000,
      }),
    ),
    enroll: vi.fn(),
    upload: vi.fn(),
  };
}

function render(configure?: (api: ApiStub) => void) {
  localStorage.clear();
  const api = createApi();
  configure?.(api);
  TestBed.configureTestingModule({
    imports: [EnrollPage],
    providers: [provideRouter([]), { provide: AgentApi, useValue: api }],
  });
  TestBed.inject(SessionStore).setSession(
    {
      id: 'u-ag1',
      fullName: 'Koffi Amani',
      phone: '',
      role: 'agent',
      active: true,
      zone: 'Marcory',
    },
    ['member.enroll'],
  );
  const fixture = TestBed.createComponent(EnrollPage);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const store = fixture.debugElement.injector.get(EnrollmentStore);
  const query = <T extends Element>(selector: string): T => {
    const found = el.querySelector<T>(selector);
    if (!found) throw new Error(`Not found: ${selector}`);
    return found;
  };
  const type = (id: string, value: string) => {
    const input = query<HTMLInputElement>(`#${id}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const click = (label: string) => {
    const button = [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
    if (!button) throw new Error(`No button: ${label}`);
    button.click();
    fixture.detectChanges();
  };
  const choose = (id: string, value: string) => {
    const select = query<HTMLSelectElement>(`#${id}`);
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  /** Ticks the checkbox whose label contains this text. */
  const tick = (label: string) => {
    const box = [...el.querySelectorAll('label')]
      .find((l) => l.textContent?.includes(label))
      ?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!box) throw new Error(`No checkbox: ${label}`);
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const fillIdentity = () => {
    type('en-last-name', 'TRAORÉ');
    type('en-first-names', 'Mariam');
    type('en-phone', '0700000009');
  };
  const fillUntilPayment = () => {
    fillIdentity();
    click('Continuer');
    store.form.controls.idDocUrl.setValue('mock-upload://a');
    store.form.controls.photoUrl.setValue('mock-upload://b');
    fixture.detectChanges();
    type('en-id', 'CI 1234 5678');
    choose('en-sector', 'commerce');
    click('Continuer');
    type('en-ref-name', 'Fatou Traoré');
    type('en-ref-link', 'sœur');
    type('en-ref-phone', '0500000009');
    tick("sait qu'elle");
    type('en-savings', '2 000');
    type('en-goal', 'Acheter du stock');
    tick("s'engage");
    click('Continuer');
  };
  /** Visible text with non-breaking spaces (money formatting) turned into plain spaces. */
  const text = () => (el.textContent ?? '').replace(NON_BREAKING_SPACES, ' ');
  return { fixture, el, query, type, click, tick, api, fillIdentity, fillUntilPayment, text };
}

describe('EnrollPage', () => {
  it('starts on step 1 of 4 with the agent’s market preselected', () => {
    const { el, query } = render();
    expect(el.textContent).toContain('Identité du marchand');
    expect(el.textContent).toContain('Étape 1 sur 4');
    expect(query<HTMLSelectElement>('#en-market').value).toBe('Marcory');
  });

  it('blocks "Continuer" and explains what is missing', () => {
    const { el, click } = render();
    click('Continuer');
    expect(el.textContent).toContain('Étape 1 sur 4');
    expect(el.textContent).toContain('Écrivez le nom.');
    expect(el.textContent).toContain('Écrivez les prénoms.');
    expect(el.textContent).toContain('Écrivez le numéro de téléphone.');
  });

  it('requires both photos on step 2', () => {
    const { el, click, fillIdentity } = render();
    fillIdentity();
    click('Continuer');
    click('Continuer');
    expect(el.textContent).toContain('Prenez la photo de la pièce d’identité.');
    expect(el.textContent).toContain('Prenez la photo de l’étalage ou du commerce.');
  });

  it('asks for the 1 000 F before going further', () => {
    const { el, click, fillUntilPayment, text } = render();
    fillUntilPayment();
    expect(el.textContent).toContain('Paiement et accord');
    expect(text()).toContain('1 000 F');
    click('Enregistrer le membre');
    expect(el.textContent).toContain('Choisissez : espèces ou Wave.');
  });

  it('requires the cash confirmation, then registers and opens the card scan', () => {
    const { query, click, tick, fixture, fillUntilPayment, text, api } = render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    api.enroll.mockReturnValue(of({ member: { id: 'm-new' }, payment: {} }));
    fillUntilPayment();
    query<HTMLInputElement>('input[value="CASH"]').dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(text()).toContain('J’ai reçu 1 000 F en espèces');
    click('Enregistrer le membre');
    expect(text()).toContain('Confirmez que vous avez reçu les 1 000 F.');
    expect(api.enroll).not.toHaveBeenCalled();
    tick('J’ai reçu');
    click('Enregistrer le membre');
    expect(text()).toContain('Le marchand doit donner son accord.');
    expect(api.enroll).not.toHaveBeenCalled();
    tick('Le marchand accepte');
    click('Enregistrer le membre');
    expect(api.enroll).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentChannel: 'CASH',
        paymentConfirmed: true,
        phone: '07 00 00 00 09',
        lastName: 'TRAORÉ',
        firstNames: 'Mariam',
        sector: 'commerce',
        trade: 'Commerce général',
        referentPhone: '05 00 00 00 09',
        savingsAmount: 2_000,
        consentAccepted: true,
      }),
      expect.any(String),
    );
    expect(navigate).toHaveBeenCalledWith(['/agent/inscriptions', 'm-new', 'carte']);
  });

  it('asks for the Wave confirmation and its reference when paid by Wave', () => {
    const { el, query, fixture, fillUntilPayment } = render();
    fillUntilPayment();
    query<HTMLInputElement>('input[value="WAVE"]').dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(el.textContent).toContain('J’ai vu la confirmation du paiement Wave');
    expect(el.querySelector('#en-ref')).not.toBeNull();
  });

  it('keeps nothing on the device', () => {
    const { fillIdentity } = render();
    fillIdentity();
    expect(Object.keys(localStorage).filter((k) => k.includes('draft'))).toEqual([]);
  });

  it('flags a phone number already registered', () => {
    const { el, query, type, fixture, api } = render();
    api.checkPhone.mockReturnValue(of({ available: false, existingName: 'K*** D***' }));
    type('en-phone', '0700000009');
    query<HTMLInputElement>('#en-phone').dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(el.textContent).toContain('Déjà inscrit : K*** D***');
  });

  it('ignores a late answer for a number the agent has since corrected', () => {
    const { el, query, type, fixture, api, click, fillIdentity } = render();
    const late = new Subject<PhoneCheck>();
    api.checkPhone.mockReturnValue(late);
    fillIdentity();
    query<HTMLInputElement>('#en-phone').dispatchEvent(new Event('blur'));
    type('en-phone', '0700000010');
    late.next({ available: false, existingName: 'K*** D***' });
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Déjà inscrit');
    click('Continuer');
    expect(el.textContent).toContain('Étape 2 sur 4');
  });

  it('shows a failed phone check, but stays silent when offline', () => {
    const { el, query, type, fixture, api } = render();
    api.checkPhone.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: { message: 'Panne.' } })),
    );
    type('en-phone', '0700000009');
    query<HTMLInputElement>('#en-phone').dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(el.textContent).toContain("vérifié à l'enregistrement");

    api.checkPhone.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    type('en-phone', '0700000010');
    query<HTMLInputElement>('#en-phone').dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(el.textContent).not.toContain("vérifié à l'enregistrement");
  });

  it('shows nothing to fill in until the fee in force is known', () => {
    const { el } = render((api) => api.membershipFee.mockReturnValue(NEVER));
    expect(el.querySelector('#en-last-name')).toBeNull();
    const next = [...el.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Continuer',
    );
    expect(next?.disabled).toBe(true);
  });

  it('sends the same idempotency key when the agent retries after a failure', () => {
    const { query, click, tick, fixture, fillUntilPayment, api } = render();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    api.enroll
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
      .mockReturnValueOnce(of({ member: { id: 'm-new' }, payment: {} }));
    fillUntilPayment();
    query<HTMLInputElement>('input[value="CASH"]').dispatchEvent(new Event('change'));
    fixture.detectChanges();
    tick('J’ai reçu');
    tick('Le marchand accepte');
    click('Enregistrer le membre');
    click('Enregistrer le membre');
    expect(api.enroll).toHaveBeenCalledTimes(2);
    const [first, second] = api.enroll.mock.calls as unknown as [unknown, string][];
    expect(first[1]).toBeTruthy();
    expect(second[1]).toBe(first[1]);
  });

  it('warns that a payment made after 16:00 counts tomorrow', () => {
    const at17 = new Date();
    at17.setUTCHours(17, 0, 0, 0);
    const { text, fillUntilPayment, fixture } = render();
    TestBed.inject(ClockService).setOffset(at17.getTime() - Date.now());
    fillUntilPayment();
    fixture.detectChanges();
    expect(text()).toContain('Il est plus de 16 h 00 : ce paiement sera compté demain.');
  });
});

describe('EnrollPage — lists from the server', () => {
  it('waits for the markets and the rules, and offers a retry when they fail', async () => {
    const failing = new Subject<never>();
    TestBed.configureTestingModule({
      imports: [EnrollPage],
      providers: [
        provideRouter([]),
        {
          provide: AgentApi,
          useValue: {
            membershipFee: () => of(1_000),
            cutoffTime: () => of('16:00'),
            checkPhone: () => of({ available: true }),
            enrollmentOptions: () => failing,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(EnrollPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#en-last-name')).toBeNull();
    failing.error(new HttpErrorResponse({ status: 0 }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('Impossible de préparer');
  });
});
