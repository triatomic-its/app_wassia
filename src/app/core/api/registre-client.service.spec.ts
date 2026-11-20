import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { isApiUrl, isRegistreUrl } from '../interceptors/api-url';
import { REGISTRE } from './registre-endpoints';
import { RegistreClient } from './registre-client.service';

describe('RegistreClient', () => {
  let client: RegistreClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(RegistreClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('calls the registry base URL, not the mock /api/v1 prefix', () => {
    client.get(REGISTRE.cashDate).subscribe();
    const req = http.expectOne(`${environment.registreBaseUrl}/caisse/date`);
    expect(req.request.method).toBe('GET');
    req.flush({ dateValeur: '2026-11-20' });
  });

  it('posts an empty JSON object when no body is given', () => {
    client.post(REGISTRE.accountNumber('abc')).subscribe();
    const req = http.expectOne(`${environment.registreBaseUrl}/comptes/abc/numero`);
    expect(req.request.body).toEqual({});
    req.flush({ fait: 'f'.repeat(64) });
  });

  it('encodes hashes used as path segments', () => {
    expect(REGISTRE.fact('a/b')).toBe('/faits/a%2Fb');
  });

  it('recognises registry URLs as our own API', () => {
    const url = `${environment.registreBaseUrl}/sante`;
    expect(isRegistreUrl(url)).toBe(true);
    expect(isApiUrl(url)).toBe(true);
    expect(isApiUrl('https://example.org/x')).toBe(false);
  });
});
