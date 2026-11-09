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

## Phase 2 — Agent : inscription (2026-11-09)

- **Fait** : accueil du jour de l'agent (compte à rebours 16 h 00, collecte, versements, inscrits, cartes à associer, retards, à remettre) ; inscription en 3 étapes (identité avec contrôle du doublon de téléphone, photos CNI + commerce, vérification) avec brouillon gardé sur l'appareil ; compte créé automatiquement + SMS ; « Mes inscriptions » ; association d'une carte vierge (scan QR si le téléphone le permet, sinon numéro imprimé) ; titre et flèche retour dans la barre de l'agent ; panneau Démo : simuler le paiement de 1 000 F et prochaine carte vierge. Faux serveur : 6 nouveaux services avec leurs règles et erreurs.
- **Vérifié** : lint, 71 tests, build ; parcours complet joué dans un navigateur (téléphone) : inscription → paiement simulé → carte associée ; captures 390 et 820 px.
- **Reste** : le vrai paiement des 1 000 F par la page du QR / Wave arrive en Phase 3 ; mode hors connexion complet en Phase 4.
- **Hypothèses ajoutées** : A20 à A23.
