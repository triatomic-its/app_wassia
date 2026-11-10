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
