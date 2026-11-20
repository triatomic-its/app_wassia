import { Role } from '../models';

/** Centralised French UI labels. Plain words, no technical jargon. */
export const FR = {
  app: {
    name: 'GROUPE WASSIA',
    tagline: 'Inclusion financière • Immobilier • Flottes GPS • Import-Export',
    /** ASSUMPTION A10: no licence number until a document is supplied. */
    iobNotice:
      'WASSIA intervient comme intermédiaire en opérations de banque (IOB). Elle ne se substitue pas à un établissement de crédit agréé.',
  },
  roles: {
    dg: 'Directeur général',
    chef_agence: "Chef d'agence",
    secretaire: 'Secrétaire',
    assistant: 'Assistant',
    comptable: 'Comptable',
    caissiere: 'Caissière',
    agent: 'Agent terrain',
  } satisfies Record<Role, string>,
  roleHints: {
    dg: 'Validation finale',
    chef_agence: "Valide les dossiers, prêts jusqu'à 500 000 F",
    secretaire: 'Saisit et vérifie les dossiers',
    assistant: 'Vérifie les pièces, étudie les prêts',
    comptable: 'Contrôle et rapprochement',
    caissiere: 'Encaissement et comptage',
    agent: 'Collecte sur le marché',
  } satisfies Record<Role, string>,
  layout: {
    connectedAs: 'Connecté en tant que',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    mainMenu: 'Menu principal',
    logout: 'Se déconnecter',
    readOnly: 'Vue en lecture seule',
    offline:
      'Pas de connexion internet. Vos saisies sont gardées et seront envoyées au retour du réseau.',
    online: 'En ligne',
    offlineShort: 'Hors connexion',
    skipToContent: 'Aller au contenu',
  },
  common: {
    retry: 'Réessayer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    close: 'Fermer',
    loading: 'Chargement…',
    comingSoon: 'Cet écran arrive bientôt.',
    errorGeneric: "Quelque chose n'a pas marché. Réessayez dans un instant.",
    reasonRequired: 'Expliquez la raison',
    required: 'Obligatoire',
  },
} as const;
