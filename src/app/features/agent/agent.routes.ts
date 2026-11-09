import { Routes } from '@angular/router';
import { comingSoonRoute } from '../../shared/ui/page';

export default [
  { path: '', pathMatch: 'full', redirectTo: 'accueil' },
  comingSoonRoute('accueil', 'Accueil du jour', 'Phase 2'),
  comingSoonRoute('collecte', 'Tournée de collecte', 'Phase 4'),
  comingSoonRoute('scanner', 'Scanner et encaisser', 'Phase 4'),
  comingSoonRoute('inscrire', 'Inscrire un marchand', 'Phase 2'),
  comingSoonRoute('credit', 'Demande de crédit', 'Phase 7'),
] satisfies Routes;
