import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { SessionStore } from '@core/auth/session.store';
import { DEFAULT_PAYMENT_TYPES } from '@core/config/payment-types.config';
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
    paymentTypes: vi.fn(() => of([...DEFAULT_PAYMENT_TYPES])),
    today: vi.fn(() => of({ cutoffTime: '16:00' })),
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
      role: 'AGENT',
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
  const fillUntilPayment = () => {
    type('en-name', 'Mariam Traoré');
    type('en-phone', '0700000009');
    click('Continuer');
    store.form.controls.idDocUrl.setValue('mock-upload://a');
    store.form.controls.photoUrl.setValue('mock-upload://b');
    fixture.detectChanges();
    type('en-id', 'CI 1234 5678');
    type('en-trade', 'Vente de pagnes');
    click('Continuer');
  };
  /** Visible text with non-breaking spaces (money formatting) turned into plain spaces. */
  const text = () => (el.textContent ?? '').replace(NON_BREAKING_SPACES, ' ');
  return { fixture, el, query, type, click, api, fillUntilPayment, text };
}

describe('EnrollPage', () => {
  it('starts on step 1 of 3 with the agent’s market preselected', () => {
    const { el, query } = render();
    expect(el.textContent).toContain('Identité du marchand');
    expect(el.textContent).toContain('Étape 1 sur 3');
    expect(query<HTMLSelectElement>('#en-market').value).toBe('Marcory');
  });

  it('blocks "Continuer" and explains what is missing', () => {
    const { el, click } = render();
    click('Continuer');
    expect(el.textContent).toContain('Étape 1 sur 3');
    expect(el.textContent).toContain('Écrivez le nom et les prénoms.');
    expect(el.textContent).toContain('Écrivez le numéro de téléphone.');
  });

  it('requires both photos on step 2', () => {
    const { el, type, click } = render();
    type('en-name', 'Mariam Traoré');
    type('en-phone', '0700000009');
    click('Continuer');
    click('Continuer');
    expect(el.textContent).toContain('Prenez la photo de la pièce d’identité.');
    expect(el.textContent).toContain('Prenez la photo de l’étalage ou du commerce.');
  });

  it('asks for the 1 000 F before going further', () => {
    const { el, click, fillUntilPayment, text } = render();
    fillUntilPayment();
    expect(el.textContent).toContain('Paiement de l’adhésion');
    expect(text()).toContain('1 000 F');
    click('Enregistrer le membre');
    expect(el.textContent).toContain('Choisissez : espèces ou Wave.');
  });

  it('requires the cash confirmation, then registers and opens the card scan', () => {
    const { query, click, fixture, fillUntilPayment, text, api } = render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    api.enroll.mockReturnValue(of({ member: { id: 'm-new' }, payment: {} }));
    fillUntilPayment();
    query<HTMLInputElement>('input[value="CASH"]').dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(text()).toContain('J’ai reçu 1 000 F en espèces');
    click('Enregistrer le membre');
    expect(text()).toContain('Confirmez que vous avez reçu les 1 000 F.');
    expect(api.enroll).not.toHaveBeenCalled();
    const box = query<HTMLInputElement>('input[type="checkbox"]');
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    click('Enregistrer le membre');
    expect(api.enroll).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentChannel: 'CASH',
        paymentConfirmed: true,
        phone: '07 00 00 00 09',
      }),
      expect.any(String),
    );
    expect(navigate).toHaveBeenCalledWith(['/agent/inscriptions', 'm-new', 'carte']);
  });

  it('asks for the Wave confirmation when paid by Wave', () => {
    const { el, query, fixture, fillUntilPayment } = render();
    fillUntilPayment();
    query<HTMLInputElement>('input[value="WAVE"]').dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(el.textContent).toContain('J’ai vu la confirmation du paiement Wave');
    expect(el.querySelector('#en-ref')).not.toBeNull();
  });

  it('keeps nothing on the device', () => {
    const { type } = render();
    type('en-name', 'Mariam Traoré');
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
    const { el, query, type, fixture, api, click } = render();
    const late = new Subject<PhoneCheck>();
    api.checkPhone.mockReturnValue(late);
    type('en-name', 'Mariam Traoré');
    type('en-phone', '0700000009');
    query<HTMLInputElement>('#en-phone').dispatchEvent(new Event('blur'));
    type('en-phone', '0700000010');
    late.next({ available: false, existingName: 'K*** D***' });
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Déjà inscrit');
    click('Continuer');
    expect(el.textContent).toContain('Étape 2 sur 3');
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

  it('does not offer "Enregistrer" until the configured fee is known', () => {
    const { el, fillUntilPayment } = render((api) => api.paymentTypes.mockReturnValue(NEVER));
    fillUntilPayment();
    const save = [...el.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Enregistrer le membre',
    );
    expect(save?.disabled).toBe(true);
    expect(el.querySelector('app-payment-step')).toBeNull();
  });

  it('sends the same idempotency key when the agent retries after a failure', () => {
    const { query, click, fixture, fillUntilPayment, api } = render();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    api.enroll
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })))
      .mockReturnValueOnce(of({ member: { id: 'm-new' }, payment: {} }));
    fillUntilPayment();
    query<HTMLInputElement>('input[value="CASH"]').dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const box = query<HTMLInputElement>('input[type="checkbox"]');
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    fixture.detectChanges();
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
