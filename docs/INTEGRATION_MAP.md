# Intégration du back « Registre Wassia »

> Depuis le 20/11/2026, **le back fait foi** (rôles, permissions, règles, workflows, statuts).
> Spec : `GET http://127.0.0.1:8080/openapi.json` (OpenAPI 3.1, v0.1.0). Interface : `/swagger-ui/`.
> Ce document dit, pour chaque appel du front, s'il va au vrai serveur ou reste sur le faux back.

## Principes du registre

- **Registre de faits, ajout seul.** Chaque opération ajoute un fait, identifié par son hachage (64 caractères hexadécimaux). Rien ne se modifie : une correction est un fait successeur, un retrait est une `Levee`.
- **Pas de préfixe** (`/enrolements`, pas `/api/v1/...`). Pas de pagination : les listes sont des tableaux.
- **Erreurs** : `{ "message": "…" }` avec 404, 409 (conflit), 422 (règle ou validation). Le front les convertit en `ApiError` (`core/api/error.model.ts`).
- **Pas d'authentification.** L'acteur est le hachage d'un fait `Utilisateur`, passé dans le corps (`auteur`, `agent`, `caissiere`, `comptable`, `directeur`, `demandeur`). C'est le service d'API qui le met, jamais le composant.
- **Idempotence** : les identités sont adressées par contenu (même corps ⇒ même hachage) ; `POST /especes` et les restitutions prennent une `cle` (≥ 8 caractères, créée sur le téléphone) ; `POST /numerique` est idempotent par `reference` opérateur.

## Côté front

| Élément                      | Où                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| URL du registre              | `environment.registreBaseUrl` (`/registre` en dev, relayé par `proxy.conf.json` vers `http://127.0.0.1:8080`)    |
| Activation                   | `environment.useRegistre` (`false` ⇒ tout reste sur le faux back)                                                |
| Connexion                    | `core/auth/auth.registre.ts` (choix d'un utilisateur du registre), acteur via `core/auth/actor.service.ts`       |
| Faux back en mode hybride    | `mocks/registre-bridge.interceptor.ts` : passe le rôle du registre au faux back (`Bearer mock.<rôle>`)           |
| Données de test              | `npm run seed:registre` : 12 utilisateurs (un par rôle + 6 agents) et 50 cartes vierges `WAS-000001…`, rejouable |
| Client HTTP                  | `core/api/registre-client.service.ts`                                                                            |
| Chemins                      | `core/api/registre-endpoints.ts`                                                                                 |
| Types de la spec             | `core/models/registre.model.ts`                                                                                  |
| Conversion registre → écrans | `core/api/registre-mappers.ts`                                                                                   |

Le faux back n'intercepte que `environment.apiBaseUrl` (`/api/v1`) : les appels au registre passent toujours au vrai serveur. C'est le **mode hybride**.

## Correspondance des appels

Légende : ✅ branché · 🔜 à brancher (étape indiquée) · 🟡 reste sur le faux back (absent du registre).

### Identité, rôles, permissions

| Front (faux back)               | Registre                                                      | État             | Écart                                                                                                                                                                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /me`                       | —                                                             | ✅               | Pas de `/me` : `RegistreDirectory` lit `Utilisateur`, `AttributionRole` (rôle le plus récent) et `Identite` via `GET /faits` ; `RegistreAuthService`                                                                                                                                                 |
| `GET /roles`                    | `GET /faits?type=RoleMetier`                                  | ✅               | Codes : `agent, secretaire, assistant, chef_agence, caissiere, comptable, dg` (pas de Directeur adjoint ni de Gestionnaire)                                                                                                                                                                          |
| `GET/POST/PATCH /users`         | `POST /faits` (`Utilisateur`), `POST /utilisateurs/{u}/roles` | 🔜 étapes 2 et 8 | Pas de liste d'utilisateurs (demandée)                                                                                                                                                                                                                                                               |
| Matrice `permissions.config.ts` | `GET /habilitations`                                          | ✅               | Permissions UI dérivées des actions du back (`PERMISSION_RULES`, `derivePermissions`) ; la vue étant en erreur, elles sont relues depuis les faits `Habilitation` (moins les `Levee`), une fois par session ; la copie du 20/11 (`ROLE_ACTIONS_SNAPSHOT`) ne sert que si le registre est injoignable |

### Référentiel et règles

| Front                               | Registre                                                             | État                         | Écart                                                                                                                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /settings`                     | `GET /regles/{champ}`                                                | ✅                           | `ProductRulesService` (`core/services`) : 10 règles lues une fois par session, types vérifiés. Montant d'adhésion et heure de coupure des écrans agent branchés (`AgentApi.membershipFee()`, `cutoffTime()`) |
| `GET /payment-types`                | `Aiguillage` (natures × canaux) + `RegleProduit`                     | 🟡 → étape 4                 | Le montant d'adhésion vient déjà de la règle ; les natures (`ouverture_cash, epargne, remboursement, frais_dossier_pret`) serviront aux encaissements                                                        |
| Marchés (config)                    | `GET /faits?type=Marche`, `Agence`, `Pole`, `Secteur` + `Descriptif` | ✅ (service) · écran étape 4 | `ReferenceService` : libellés, marché → agence, secteur → pôle. Branché sur le formulaire à l'étape 4 (le faux back attend encore « Adjamé »)                                                                |
| Date de caisse (horloge + J+1)      | `GET /caisse/date`                                                   | ✅ (service) · usage étape 4 | `ProductRulesService.cashDate()` : le serveur applique la coupure ; servira de `dateValeur` aux encaissements                                                                                                |
| Grille de crédit (`loan.config.ts`) | `GET /baremes`, `POST /baremes/vigueur`                              | 🔜 étape 7                   | Deux grilles, aucune choisie d'office                                                                                                                                                                        |
| Seuils d'approbation                | `SeuilValidation`                                                    | 🔜 étape 7                   | 250k–500k `chef_agence` ; 1M–3M `dg` (48 h) ; 5M–10M `dg` + `comptable`                                                                                                                                      |

### Parcours agent

| Front                                      | Registre                                                                                                                                                                  | État            | Écart                                                                                                                                                                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /members` (inscription + paiement)   | `POST /enrolements` → `POST /especes` (`ouverture_cash`) ou `POST /numerique` (Wave) → `POST /comptes/{c}/numero` puis `GET /faits/{fait}` (numéro `WS-AAAA-NNNNNN`)      | ✅              | `RegistreAgentApi.enroll` : formulaire en 4 étapes aligné sur `DossierSaisi` (`registre-dossier.ts`). Marché, agence, secteur et consentements envoyés en **hachages**. Rejeu sûr : jeton de personne et clé d’espèces dérivés de la clé d’idempotence. Espèces « en attente » jusqu’au visa |
| `POST /members/phone-check`                | —                                                                                                                                                                         | ✅ (sans appel) | Pas de vérification anticipée : le registre refuse un téléphone déjà ancré à l’envoi (409), traduit en « Ce numéro est déjà enregistré… » sur l’étape 1                                                                                                                                      |
| `POST /uploads`                            | —                                                                                                                                                                         | 🟡              | Photos encore envoyées au faux back ; la référence est transmise en `photoRef`. Endpoint d’envoi demandé                                                                                                                                                                                     |
| `POST /cards/lookup`                       | `POST /faits/apercu` (`CarteQr {jeton}`) + `GET /faits/{hash}` (404 = carte inconnue) + faits `AssociationCarte`                                                          | ✅              | Numéro imprimé lu dans les `Descriptif` des cartes (une fois par session). A29                                                                                                                                                                                                               |
| `POST /cards/assign`                       | `POST /cartes/associations {carte, compte, agent}`                                                                                                                        | ✅              | Membre « En attente de validation » : le compte et la carte ne deviennent actifs qu’après le visa de la clôture (activation par le back)                                                                                                                                                     |
| `GET /members?status=…` (mes inscriptions) | faits `CompteEpargne`, `Identite`, `AncrageTelephone`, `AncragePiece`, `NumeroCompte`, `Activite`, `AssociationCarte`, `ActivationCarte`, `EncaissementEspeces/Numerique` | ✅ (palliatif)  | Reconstruit depuis les faits (`registre-members.ts`) tant que `/comptes`, `/identites`, `/cartes` sont en erreur. A35                                                                                                                                                                        |
| `GET /members/{id}`                        | idem                                                                                                                                                                      | ✅ (palliatif)  | Idem ; les inscriptions de la session sont gardées en mémoire                                                                                                                                                                                                                                |
| `GET /agent/today`                         | —                                                                                                                                                                         | 🟡              | Demandé                                                                                                                                                                                                                                                                                      |

### Collecte, caisse, compta (étapes 5 et 6)

| Front                                   | Registre                                                             |
| --------------------------------------- | -------------------------------------------------------------------- |
| Versement terrain                       | `POST /especes` (`epargne`, `cle` = clé de la file hors ligne)       |
| Paiement Mobile Money                   | `POST /numerique` (comptabilisé tout de suite)                       |
| Synchronisation hors ligne              | `POST /synchronisations` (lot de `NouveauFait`)                      |
| Solde                                   | `GET /comptes/{c}/solde` (`comptabilise`, `enAttente`, `annonce`)    |
| Position et plafond de caisse           | `GET /caisse/position?agence=&date=`                                 |
| Ouvrir la journée                       | `POST /journees`                                                     |
| Clôture niveau 1 (caissière, par agent) | `POST /journees/{j}/clotures`                                        |
| Niveau 2 (comptable)                    | `POST /clotures/{c}/validation`                                      |
| Niveau 3 (DG)                           | `POST /validations/{v}/visa` — les espèces passent au journal        |
| Activation du compte                    | `POST /comptes/{c}/activation` après le visa des 1 000 F             |
| Frais d'ouverture restants              | `POST /comptes/{c}/frais-ouverture` (4 000 F prélevés sur l'épargne) |
| Journal                                 | `GET /journal?compte=`                                               |
| Contre-écriture                         | `POST /ecritures/{e}/contre-passages`                                |
| Comptabiliser un encaissement           | `POST /encaissements/{e}/comptabiliser`                              |
| Restitution d'épargne                   | `POST /comptes/{c}/restitutions`                                     |

### Dossiers et crédit (étape 7)

| Front                                                  | Registre                                 |
| ------------------------------------------------------ | ---------------------------------------- |
| Vérification, correction, validation, rejet du dossier | `POST /comptes/{c}/decisions` (`nature`) |
| Éligibilité                                            | `GET /comptes/{c}/eligibilite`           |
| Demande de prêt                                        | `POST /comptes/{c}/prets`                |
| Étude (régularité, viabilité, sérieux)                 | `POST /demandes/{d}/etudes`              |
| Signature d'accord ou de refus                         | `POST /demandes/{d}/decisions`           |
| Décaissement                                           | `POST /demandes/{d}/decaissements`       |
| Retard (pénalité, puis blocage au 2ᵉ)                  | `POST /echeances/{e}/retards`            |
| Prêt soldé                                             | `POST /prets/{p}/cloture`                |

### Administration, conflits, notifications (étape 8)

| Front             | Registre                                                     |
| ----------------- | ------------------------------------------------------------ |
| Habilitations     | `GET/POST /habilitations`, retrait par `POST /levees`        |
| Règles            | `POST /regles` (successeur de la règle en vigueur)           |
| Réconciliation    | `GET /conflits`, `POST /levees`                              |
| Notifications SMS | `POST /notifications`, `POST /notifications/{n}/delivrances` |
| Journal d'audit   | `GET /faits`, `POST /consultations`, `GET /integrite`        |

### Restent sur le faux back (absents du registre)

Tableaux de bord et KPI, supervision des agents (temps réel), suivi des enrôlements, liste des marchands, liste des paiements, rapports, gabarits SMS, page publique `/pay/:token`, webhook Wave, lots et planche d'impression de cartes (création possible via `POST /faits` `CarteQr`).

## Demandes à l'équipe back

**Bloquant (20/11/2026)** : sur le serveur local, ces vues répondent `{"message":"erreur du registre"}` : `GET /comptes`, `/cartes`, `/identites`, `/decisions`, `/conflits`, `/habilitations`, `/baremes`. `GET /regles/{champ}` répond `registre indisponible`. `/faits`, `/catalogue`, `/caisse/date`, `/journal`, `/sante` fonctionnent.

**Constaté le 20/11/2026** : le registre accepte d’associer une **deuxième carte au même compte** (`POST /cartes/associations` répond 200). Le front ne le fait jamais, mais le serveur devrait le refuser.

À exposer ou préciser :

1. Authentification : comment un jeton (Keycloak) sera relié à un `Utilisateur` ; en attendant, `GET /utilisateurs` avec identifiant et rôle courant.
2. Liste des comptes filtrable par agent, marché et statut, avec nom, téléphone masqué, numéro de compte et date (sert « Mes inscriptions », le suivi des enrôlements, les marchands). Pagination.
3. Valeurs possibles de `StatutCompte.statut` et de `DecisionDossier.nature`.
4. Format attendu de `preuve` (`POST /comptes/{c}/activation`, `POST /cartes/activations`).
5. Sens du champ `jeton` de `DossierSaisi` (hypothèse A28).
6. Recherche d'une carte par jeton (hypothèse A29), et numéro imprimé `WAS-…` d'une carte.
7. Envoi des photos (CNI, étal) : endpoint d'upload.
8. Accueil du jour de l'agent, KPI, liste des encaissements, page publique de paiement, webhook Wave.
