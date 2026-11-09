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
    DG: 'Directeur général',
    DEPUTY_DG: 'Directeur adjoint',
    BRANCH_MANAGER: "Chef d'agence",
    MANAGER: 'Gestionnaire',
    ACCOUNTANT: 'Comptable',
    CASHIER: 'Caissière',
    AGENT: 'Agent terrain',
  } satisfies Record<Role, string>,
  roleHints: {
    DG: 'Validation finale',
    DEPUTY_DG: 'Consultation seulement',
    BRANCH_MANAGER: "Peut approuver jusqu'à 500 000 F",
    MANAGER: 'Suit les enrôlements',
    ACCOUNTANT: 'Contrôle et rapprochement',
    CASHIER: 'Encaissement et comptage',
    AGENT: 'Collecte sur le marché',
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
