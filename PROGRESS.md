# PROGRESS

| #   | Phase                                             | État                    |
| --- | ------------------------------------------------- | ----------------------- |
| 0   | Socle                                             | ✅ terminé (2026-11-09) |
| 1   | Faux back + auth                                  | ⬜                      |
| 2   | Agent : inscription                               | ⬜                      |
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
- **Reste** : `SessionStore` contient un utilisateur fictif tant que l'auth n'existe pas (Phase 1).
- **Hypothèses ajoutées** : A11 à A17 (voir `ASSUMPTIONS.md`).
