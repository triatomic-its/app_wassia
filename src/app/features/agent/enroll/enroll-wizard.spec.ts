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
    createMember: vi.fn(),
    upload: vi.fn(),
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
  };
  const click = (label: string) => {
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!.click();
    fixture.detectChanges();
  };
  return { fixture, el, type, click, api };
}

describe('EnrollWizard', () => {
  it('starts on step 1 with the agent’s market preselected', () => {
    const { el } = render();
    expect(el.textContent).toContain('Identité du marchand');
    expect(el.textContent).toContain('Étape 1 sur 3');
    expect(el.querySelector<HTMLSelectElement>('#en-market')!.value).toBe('Marcory');
  });

  it('blocks "Continuer" and explains what is missing', () => {
    const { el, click } = render();
    click('Continuer');
    expect(el.textContent).toContain('Étape 1 sur 3');
    expect(el.textContent).toContain('Écrivez le nom et les prénoms.');
    expect(el.textContent).toContain('Écrivez le numéro de téléphone.');
  });

  it('moves to the documents step when identity is valid, and keeps a draft', () => {
    const { el, type, click, fixture } = render();
    type('en-name', 'Mariam Traoré');
    type('en-phone', '0700000009');
    fixture.detectChanges();
    click('Continuer');
    expect(el.textContent).toContain('Pièces et commerce');
    expect(el.textContent).toContain("Pièce d'identité (CNI)");
    const draft = JSON.parse(localStorage.getItem('wassia.agent.draft.u-ag1')!);
    expect(draft).toMatchObject({ fullName: 'Mariam Traoré', phone: '0700000009', step: 1 });
  });

  it('requires both photos on step 2', () => {
    const { el, type, click, fixture } = render();
    type('en-name', 'Mariam Traoré');
    type('en-phone', '0700000009');
    fixture.detectChanges();
    click('Continuer');
    click('Continuer');
    expect(el.textContent).toContain('Prenez la photo de la pièce d’identité.');
    expect(el.textContent).toContain('Prenez la photo de l’étalage ou du commerce.');
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
