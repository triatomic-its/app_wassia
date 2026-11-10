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

- **Fait** : accueil du jour de l'agent (compte à rebours 16 h 00, collecte, versements, inscrits, retards, à remettre) ; inscription en 4 étapes : identité (contrôle du doublon de téléphone) → pièces et commerce (photos CNI + étalage) → **paiement des 1 000 F sur place** (espèces ou Wave confirmé par l'agent) → **carte remise** (scan QR ou numéro imprimé) et enregistrement ; « Mes inscriptions ».
- **Correction du 10/11 (règle client)** : le membre n'existe qu'une fois payé et équipé de sa carte. Supprimés : statuts « paiement en attente » / « carte à associer », SMS de paiement, brouillon sur l'appareil, écran d'association séparé, bouton « Payer » du panneau Démo. Le faux serveur enregistre membre + paiement + écriture comptable + carte en une seule opération. Données de démo régénérées (version 2).
- **Vérifié** : lint, 77 tests, build ; parcours joués dans un navigateur (téléphone), en espèces et par Wave ; les 1 000 F en espèces s'ajoutent au montant à remettre à la caissière.
- **Reste** : mode hors connexion complet en Phase 4 ; la page du QR publique (Phase 3) sert désormais aux versements d'épargne, plus à l'adhésion.
- **Hypothèses** : A20, A21, A23, A24 ajoutées ; A2 et A22 confirmées ; A14 sans objet.
