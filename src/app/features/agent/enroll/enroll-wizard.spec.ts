import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SessionStore } from '../../../core/auth/session.store';
import { AgentApi } from '../data/agent.api';
import { EnrollWizard } from './enroll-wizard';

function render() {
  localStorage.clear();
  const api = {
    checkPhone: vi.fn(() => of({ available: true })),
    membershipFee: vi.fn(() => of(1000)),
    enroll: vi.fn(),
    upload: vi.fn(),
    lookupCard: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [EnrollWizard],
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
  const fixture = TestBed.createComponent(EnrollWizard);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const type = (id: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const click = (label: string) => {
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!.click();
    fixture.detectChanges();
  };
  const component = fixture.componentInstance as unknown as {
    photo(field: 'idDocUrl' | 'photoUrl', p: { url: string; preview: string }): void;
  };
  const fillUntilPayment = () => {
    type('en-name', 'Mariam Traoré');
    type('en-phone', '0700000009');
    click('Continuer');
    component.photo('idDocUrl', { url: 'mock-upload://a', preview: '' });
    component.photo('photoUrl', { url: 'mock-upload://b', preview: '' });
    fixture.detectChanges();
    type('en-id', 'CI 1234 5678');
    type('en-trade', 'Vente de pagnes');
    click('Continuer');
  };
  /** Visible text with non-breaking spaces (money formatting) turned into plain spaces. */
  const text = () =>
    (el.textContent ?? '').replace(
      new RegExp('[' + String.fromCharCode(0xa0, 0x202f) + ']', 'g'),
      ' ',
    );
  return { fixture, el, type, click, api, fillUntilPayment, text };
}

describe('EnrollWizard', () => {
  it('starts on step 1 of 4 with the agent’s market preselected', () => {
    const { el } = render();
    expect(el.textContent).toContain('Identité du marchand');
    expect(el.textContent).toContain('Étape 1 sur 4');
    expect(el.querySelector<HTMLSelectElement>('#en-market')!.value).toBe('Marcory');
  });

  it('blocks "Continuer" and explains what is missing', () => {
    const { el, click } = render();
    click('Continuer');
    expect(el.textContent).toContain('Étape 1 sur 4');
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
    click('Continuer');
    expect(el.textContent).toContain('Choisissez : espèces ou Wave.');
  });

  it('requires the agent to confirm the cash was received', () => {
    const { el, click, fixture, fillUntilPayment, text } = render();
    fillUntilPayment();
    el.querySelector<HTMLInputElement>('input[value="CASH"]')!.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(text()).toContain('J’ai reçu 1 000 F en espèces');
    click('Continuer');
    expect(text()).toContain('Confirmez que vous avez reçu les 1 000 F.');
    const box = el.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    click('Continuer');
    expect(el.textContent).toContain('Carte et enregistrement');
  });

  it('asks for the Wave confirmation when paid by Wave', () => {
    const { el, fixture, fillUntilPayment } = render();
    fillUntilPayment();
    el.querySelector<HTMLInputElement>('input[value="WAVE"]')!.dispatchEvent(new Event('change'));
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
    const { el, type, fixture, api } = render();
    api.checkPhone.mockReturnValue(of({ available: false, existingName: 'K*** D***' }) as never);
    type('en-phone', '0700000009');
    el.querySelector<HTMLInputElement>('#en-phone')!.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(el.textContent).toContain('Déjà inscrit : K*** D***');
  });
});
