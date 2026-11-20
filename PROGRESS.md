# PROGRESS

| #   | Phase                                             | État                    |
| --- | ------------------------------------------------- | ----------------------- |
| 0   | Socle                                             | ✅ terminé (2026-11-09) |
| 1   | Faux back + auth                                  | ✅ terminé (2026-11-09) |
| 2   | Agent : inscription                               | ✅ terminé (2026-11-09) |
| 3   | Cartes & page du QR                               | ⬜                      |
| 4   | Agent : collecte (hors ligne)                     | ⬜                      |
| 5   | Back-office : supervision, enrôlements, marchands | ⬜                      |
| 6   | Caisse (clôture 3 niveaux)                        | ⬜                      |
| 7   | Crédit                                            | ⬜                      |
| 8   | Compta, rapports, admin, e2e                      | ⬜                      |

## Phase 0 — Socle (2026-11-09)

- **Fait** : spec réalignée sur la maquette (PWA unique, adhésion automatique, clôture en 3 niveaux, crédit inclus) ; Tailwind 4 + jetons de la charte (`src/styles.css`), polices auto-hébergées, logos SVG officiels ; ESLint + Prettier + Husky ; PWA (manifest, service worker) ; configs (7 rôles, workflows, grille crédit, navigation) ; pipes `fcfa`/`abidjanDate`/`maskName` ; `shared/ui` + `/dev/styleguide` ; shells back-office et agent responsive (vérifiés à 390, 820 et 1440 px).
- **Vérifié** : `npm run lint`, `npm test` (28 tests), `npm run build` (initial 365 kB) au vert.
- **Logos** : SVG officiels intégrés (logo horizontal blanc sur menu bleu marine, symbole couleur sur le rail agent, favicon), icônes PWA générées depuis le symbole carré.
- **Reste** : rien (l’utilisateur fictif a été remplacé par la connexion en Phase 1).
- **Hypothèses ajoutées** : A11 à A17 (voir `ASSUMPTIONS.md`).

## Phase 1 — Faux back + auth (2026-11-09)

- **Fait** : faux serveur `src/app/mocks/` (intercepteur sur les vrais chemins `/api/v1`, base en mémoire gardée dans le navigateur, données de départ déterministes : 12 utilisateurs, 120 marchands, 1 000 cartes, ~600 paiements dont 2 orphelins / 2 doublons / 1 en attente, 4 clôtures dont 1 avec écart, remises des agents du jour, grand livre équilibré avec une contre-écriture, 9 crédits à tous les statuts, gabarits et journal SMS) ; lenteur et erreurs simulées ; panneau « Démo » (profil, horloge simulée, lenteur, erreur, réinitialisation) ; `AuthService` (démo + interface Keycloak), `GET /me`, garde de connexion, page de connexion, déconnexion ; menu latéral plus compact.
- **Vérifié** : lint, 53 tests, build ; le faux serveur et le panneau ne sont pas dans le build de production ; captures à 390 et 1440 px.
- **Reste** : flux Keycloak réel (A18) ; les écrans métier arrivent à partir de la Phase 2.
- **Hypothèses ajoutées** : A18, A19.

## Phase 2 — Agent : inscription (2026-11-09, corrigée le 2026-11-10)

- **Fait** : accueil du jour de l'agent (compte à rebours 16 h 00, collecte, versements, inscrits, cartes à associer, retards, à remettre) ; inscription en 3 étapes : identité (contrôle du doublon de téléphone) → pièces et commerce (photos CNI + étalage) → **paiement des 1 000 F sur place** (espèces ou Wave confirmé par l'agent) et enregistrement ; puis **« Associer la carte » par scan du QR** d'une carte vierge (ou plus tard, depuis « Mes inscriptions » / l'accueil).
- **Corrections du 10/11 (règles client)** : membre enregistré seulement après paiement ; plus de SMS de paiement ni de brouillon ; carte associée **uniquement par scan du QR** (champ « numéro imprimé » supprimé, refusé aussi côté serveur) ; lecteur QR `jsqr` pour les téléphones sans lecteur natif ; caméra virtuelle dans le panneau Démo pour tester sans carte. Données de démo régénérées (version 3).
- **Vérifié** : lint, 81 tests, build ; parcours joués dans un navigateur (téléphone) : inscription → scan → carte activée, et inscription → « Associer plus tard » → carte à associer.
- **Reste** : mode hors connexion complet en Phase 4 ; la page du QR publique (Phase 3) sert aux versements d'épargne.
- **Hypothèses** : A20, A21, A24 ajoutées ; A2, A22, A23 confirmées ; A14 sans objet.

## Refactor qualité — revue de code (2026-11-10)

- **Fait (étapes 1–4 de la revue)** : un composant par fichier dans `shared/ui` et `core/layout` ; nouveaux `app-alert`, `app-link-tile`, `dom-events` (plus aucun `$any`) ; formatage pur déplacé dans `core/i18n/format` ; règles sorties des composants vers des fonctions pures testées (`cash-cutoff`, `membership`, « il y a… », pluriels, affichage des statuts) ; montant d'adhésion passé en paramètre (plus de « 1 000 F » en dur) ; feature `agent` restructurée en `data-access/ domain/ forms/ ui/ pages/`, Reactive Forms typés, stores par écran, plus aucun `subscribe` dans les composants agent.
- **Bug corrigé** : une réponse tardive de la vérification du téléphone pouvait bloquer un numéro corrigé (désormais `switchMap`, test ajouté).
- **Vérifié** : lint, 104 tests, build (initial 383 kB ; le chunk de l'inscription passe à 110 kB avec `@angular/forms`).
- **Reste (étapes 5–7)** : libellés vers `fr.ts` + `TitleStrategy`, `NavigationStore` pour les shells, `AgentHeader`, découpage du faux back par domaine (`seed.ts`, `handlers/`, `mocks/domain.ts`).

## Structure par fonctionnalité + correctifs de la revue (2026-11-14)

- **Structure** : `layout/` à la racine ; `shared/` découpé en `components/ directives/ pipes/ services/ utils/` ; `core/interceptors/` (auth + erreurs séparés), `core/services/` (toast, horloge, réseau), `auth.guard.ts` séparé ; feature `agent` en `pages/<page>/` (composant + store de la page) `components/ services/ models/` ; composants en `.component.ts` + `.component.html` (plus aucun template inline hors tests) ; alias `@core @shared @layout @features @env` ; ESLint interdit `../../../`, les imports entre features et les dépendances montantes (`core` → `shared`…). Écarts au guide du relecteur notés dans `docs/ARCHITECTURE.md`.
- **Correctifs** : téléphone et jeton QR sortis des URL (`POST /members/phone-check`, `POST /cards/lookup`) ; `POST /members` idempotent (`Idempotency-Key`) ; après 16 h 00 le paiement d'adhésion et son écriture sont rattachés à J+1 (`businessDate`, bandeau sur l'étape paiement) ; « Enregistrer » bloqué tant que le montant d'adhésion n'est pas chargé ; échec de la vérification du téléphone affiché (silence seulement hors connexion). Données de démo en version 4.
- **Vérifié** : lint, 119 tests, build (initial 383 kB).
- **Reste** : étapes 5–7 de la revue précédente ; appliquer le même rattachement J+1 aux versements (Phase 4) et à la caisse (Phase 6).
- **Hypothèses ajoutées** : A25.

## Design aligné sur la maquette (2026-11-14)

- **Fait** : écrans repris de la maquette « Wassia — Application » (artefact `MTr7qrzYBU83A3K33XVY8b`), **sans changer la logique** (services, stores, routes, textes, ids et specs identiques).
  - Tokens (`styles.css`) : neutres de la maquette (`#F2F4F7`, `#101828`, `#475467`, `#D0D5DD`, `#EAECF0`), tuiles douces (vert, bleu, or, bandeau 16 h), couleurs back-office, rayons (champ 14, bouton 16, carte 20, panneau 8), ombres, Poppins 800 et Open Sans 700, utilitaires `press`, `skew-band`, `bg-scan-radial`.
  - Composants partagés : boutons 56 px avec ombre verte, champs 54 px avec halo vert, cartes à ombre légère, raccourcis avec tuile d'icône et « Voir › », viseur de scan sombre à coins verts.
  - Agent : accueil avec en-tête bleu nuit à bande oblique, avatar doré et carte résumé qui le chevauche (`AgentHeader.useHero()`, présentation seule) ; écrans d'étape avec barre blanche, retour vert et titre centré ; barre d'onglets avec bouton « Scanner » doré ; inscription (sur-titre « Étape x sur 3 », tuiles photo, choix espèces/Wave, barre d'actions collante) ; associer la carte et « Carte activée ».
  - Connexion : fond bleu nuit à bandes vert et or, feuille blanche en bas.
  - Back-office : menu bleu marine repliable (256 px / 84 px, actif à liseré doré), barre haute blanche avec avatar et rôle, en-têtes de tableau en majuscules.
- **Vérifié** : lint, 119 tests, build (initial 395 kB) ; captures à 390 px (connexion, accueil, inscription, mes inscriptions, associer la carte) et 1440 px (connexion, back-office).
- **Reste** : les écrans back-office de la maquette (Supervision, Caisse…) seront construits dans ce style à leurs phases.

## Intégration du back « Registre Wassia » — étapes 0 et 1 (2026-11-20)

- **Décision** : le back fait foi partout (rôles, habilitations, règles, workflows) ; mode hybride (ce que le registre expose est branché, le reste reste sur le faux back) ; connexion de dev par choix d'un utilisateur du registre. Bandeau ajouté en tête de `CLAUDE.md`.
- **Fait** : `docs/INTEGRATION_MAP.md` (correspondance appel par appel, demandes au back) ; `environment.useRegistre` / `registreBaseUrl` ; proxy `/registre` → `http://127.0.0.1:8080` (`proxy.conf.json`) ; `RegistreClient`, `REGISTRE` (tous les chemins de la spec), types `core/models/registre.model.ts` ; erreurs `{message}` du registre (409/422) converties en `ApiError` ; `isApiUrl` reconnaît le registre.
- **Vérifié** : lint, 128 tests, build ; proxy testé contre le serveur local (`/sante`, `/caisse/date`).
- **Reste** : étape 2 (rôles du back, habilitations, connexion par utilisateur du registre, script de seed), puis référentiel et parcours agent. **Bloquant côté back** : vues `/comptes`, `/cartes`, `/identites`, `/decisions`, `/habilitations`, `/baremes` en « erreur du registre », `/regles/{champ}` « registre indisponible ».
- **Hypothèses** : A26 à A30 ajoutées ; A1, A2, A4, A5, A11, A15, A17 remplacées par le registre.

## Intégration du registre — étape 2 : rôles, permissions, connexion (2026-11-20)

- **Fait** : rôles = codes du back (`agent, secretaire, assistant, chef_agence, caissiere, comptable, dg` ; plus de Directeur adjoint ni de Gestionnaire) ; permissions des écrans **dérivées des habilitations du back** (`PERMISSION_RULES` + `derivePermissions`, repli sur la copie du 20/11 tant que `GET /habilitations` est en erreur, sans toast) ; `RegistreAuthService` (choix d'un utilisateur du registre, hachage gardé en mémoire + onglet), `RegistreDirectory`, `ActorService` ; écran de connexion piloté par `AuthService.profiles()` (squelette, état vide « Réessayer ») ; faux back relié à la session du registre (mode hybride) ; `npm run seed:registre` (12 utilisateurs, 50 cartes vierges, rejouable).
- **Vérifié** : lint, 135 tests, build (initial 404 kB) ; dans le navigateur contre le serveur local : 12 comptes listés, agent → accueil agent, session gardée au rechargement, DG → supervision (390 et 1440 px).
- **Reste** : étape 3 (règle produit, référentiel, date de caisse), puis parcours agent (étape 4).
- **Hypothèses** : A31, A32 ajoutées.

## Intégration du registre — étape 3 : règle produit, référentiel, date de caisse (2026-11-20)

- **Fait** : `ProductRulesService` (10 champs de `RegleProduit` via `GET /regles/{champ}`, lus une fois par session, types vérifiés, nouvel essai après un échec ; `cashDate()` via `GET /caisse/date`) ; `ReferenceService` (agences, marchés → agence, pôles, secteurs → pôle, libellés `Descriptif`) ; montant d'adhésion et heure de coupure des écrans agent lus depuis le registre (`AgentApi.membershipFee()` / `cutoffTime()`, composants inchangés).
- **Vérifié** : lint, 142 tests, build (initial 407 kB) ; navigateur : bandeau 16 h 00 et règles chargées une seule fois, aucun échec ; référentiel construit sur les vraies données (2 agences, 3 marchés, 5 pôles, 16 secteurs).
- **Reste** : étape 4, parcours agent sur le registre (formulaire `DossierSaisi` avec marchés et secteurs du référentiel, `POST /enrolements`, `/especes` avec la date de caisse, association de carte).
- **Hypothèses** : A33 ajoutée. À noter : dans le registre, le marché d'Adjamé est rattaché à l'agence de Treichville.
