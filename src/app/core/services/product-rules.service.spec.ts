import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { PRODUCT_RULES_SNAPSHOT } from '../config/product-rules.defaults';
import { ProductRulesService, toRules } from './product-rules.service';

describe('product rules', () => {
  it('maps registry values and refuses a value of the wrong type', () => {
    expect(toRules(['membershipCashFee', 'cutoffTime'], [1_500, '15:30'])).toEqual({
      ...PRODUCT_RULES_SNAPSHOT,
      membershipCashFee: 1_500,
      cutoffTime: '15:30',
    });
    expect(() => toRules(['membershipCashFee'], [1000.5])).toThrow('REGISTRE_RULE_INVALID');
    expect(() => toRules(['cutoffTime'], [16])).toThrow('REGISTRE_RULE_INVALID');
  });

  describe('with the registry', () => {
    let http: HttpTestingController;
    let service: ProductRulesService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      http = TestBed.inject(HttpTestingController);
      service = TestBed.inject(ProductRulesService);
    });

    afterEach(() => http.verify());

    const answerAll = (overrides: Record<string, unknown> = {}) => {
      for (const req of http.match((r) => r.url.includes('/regles/'))) {
        const field = req.request.url.split('/').pop() ?? '';
        const defaults: Record<string, unknown> = {
          partCashEnrolementFcfa: 1_000,
          heureCoupureCaisse: '16:00',
        };
        req.flush(overrides[field] ?? defaults[field] ?? 0);
      }
    };

    it('reads each rule once and shares the result', async () => {
      const first = firstValueFrom(service.rules());
      const second = firstValueFrom(service.rules());
      answerAll({ partCashEnrolementFcfa: 2_000 });
      expect((await first).membershipCashFee).toBe(2_000);
      expect((await second).membershipCashFee).toBe(2_000);
      expect(http.match((r) => r.url.includes('/regles/'))).toHaveLength(0);
    });

    it('tries again after a failure instead of keeping it', async () => {
      const failed = firstValueFrom(service.rules());
      http
        .match((r) => r.url.includes('/regles/'))[0]
        .flush({ message: 'registre indisponible' }, { status: 422, statusText: 'KO' });
      await expect(failed).rejects.toBeTruthy();
      http.match((r) => r.url.includes('/regles/')).forEach((r) => r.flush(0));

      const retried = firstValueFrom(service.rules());
      answerAll();
      expect((await retried).cutoffTime).toBe('16:00');
    });

    it('takes the business date from the server (it applies the 16:00 cut-off)', async () => {
      const date = firstValueFrom(service.cashDate());
      http
        .expectOne(`${environment.registreBaseUrl}/caisse/date`)
        .flush({ dateValeur: '2026-11-21' });
      expect(await date).toBe('2026-11-21');
    });
  });
});
