import { Hash } from '../models/registre.model';

const seg = (value: Hash): string => encodeURIComponent(value);

/**
 * Paths of the "Registre Wassia" API, relative to `environment.registreBaseUrl`.
 * Source of truth: `GET /openapi.json` on the back end.
 */
export const REGISTRE = {
  health: '/sante',
  catalogue: '/catalogue',
  facts: '/faits',
  fact: (fact: Hash) => `/faits/${seg(fact)}`,
  factPreview: '/faits/apercu',
  rule: (field: string) => `/regles/${seg(field)}`,
  rules: '/regles',
  habilitations: '/habilitations',
  userRoles: (user: Hash) => `/utilisateurs/${seg(user)}/roles`,
  scales: '/baremes',
  scaleInForce: '/baremes/vigueur',

  enrollments: '/enrolements',
  accounts: '/comptes',
  account: (account: Hash) => `/comptes/${seg(account)}`,
  accountActivation: (account: Hash) => `/comptes/${seg(account)}/activation`,
  accountDecisions: (account: Hash) => `/comptes/${seg(account)}/decisions`,
  accountEligibility: (account: Hash) => `/comptes/${seg(account)}/eligibilite`,
  accountOpeningFee: (account: Hash) => `/comptes/${seg(account)}/frais-ouverture`,
  accountNumber: (account: Hash) => `/comptes/${seg(account)}/numero`,
  accountLoans: (account: Hash) => `/comptes/${seg(account)}/prets`,
  accountRefunds: (account: Hash) => `/comptes/${seg(account)}/restitutions`,
  accountBalance: (account: Hash) => `/comptes/${seg(account)}/solde`,
  identities: '/identites',
  decisions: '/decisions',
  consultations: '/consultations',

  cards: '/cartes',
  cardAssociations: '/cartes/associations',
  cardActivations: '/cartes/activations',
  cardBlocks: '/cartes/blocages',
  cardReplacements: '/cartes/remplacements',

  cash: '/especes',
  digital: '/numerique',
  sync: '/synchronisations',
  cashDate: '/caisse/date',
  cashPosition: '/caisse/position',
  days: '/journees',
  dayClosures: (day: Hash) => `/journees/${seg(day)}/clotures`,
  closureValidation: (closure: Hash) => `/clotures/${seg(closure)}/validation`,
  validationVisa: (validation: Hash) => `/validations/${seg(validation)}/visa`,
  journal: '/journal',
  reversal: (entry: Hash) => `/ecritures/${seg(entry)}/contre-passages`,
  postCollection: (collection: Hash) => `/encaissements/${seg(collection)}/comptabiliser`,

  loanStudies: (request: Hash) => `/demandes/${seg(request)}/etudes`,
  loanDecisions: (request: Hash) => `/demandes/${seg(request)}/decisions`,
  loanDisbursements: (request: Hash) => `/demandes/${seg(request)}/decaissements`,
  lateInstalment: (instalment: Hash) => `/echeances/${seg(instalment)}/retards`,
  loanClosure: (loan: Hash) => `/prets/${seg(loan)}/cloture`,

  conflicts: '/conflits',
  releases: '/levees',
  integrity: '/integrite',
  notifications: '/notifications',
  notificationDeliveries: (notification: Hash) => `/notifications/${seg(notification)}/delivrances`,
} as const;
