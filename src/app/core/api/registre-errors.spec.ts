import { translateRegistreRefusal } from './registre-errors';

describe('registry refusals in plain French', () => {
  it('recognises a phone or an ID document already used', () => {
    const phone = translateRegistreRefusal(
      409,
      'hm_conflict: un AncrageTelephone courant existe déjà (1b29) pour cette clé.',
    );
    expect(phone).toMatchObject({ code: 'PHONE_ALREADY_USED' });
    expect(phone.message).not.toMatch(/Ancrage|hm/);
    expect(translateRegistreRefusal(409, 'hm_conflict: un AncragePiece courant').details).toEqual({
      idNumber: ['Cette pièce d’identité est déjà enregistrée pour un autre marchand.'],
    });
  });

  it('recognises a card already associated or unknown', () => {
    expect(translateRegistreRefusal(409, 'un AssociationCarte existe déjà').code).toBe(
      'CARD_ALREADY_USED',
    );
    expect(
      translateRegistreRefusal(422, 'hm: prédécesseur f39b introuvable pour le rôle carte').code,
    ).toBe('CARD_UNKNOWN');
  });

  it('keeps readable business messages, hides technical ones', () => {
    expect(translateRegistreRefusal(422, 'hm: au moins un consentement est requis').message).toBe(
      'Au moins un consentement est requis',
    );
    const technical = translateRegistreRefusal(422, 'hm: hachage invalide pour Activite.secteur');
    expect(technical.message).not.toMatch(/hachage|Activite/);
  });
});
