/**
 * Wire types of the "Registre Wassia" API (OpenAPI 3.1, v0.1.0, `GET /openapi.json`).
 * Property names are the back end's (French) and must not be renamed: the screens use the
 * models of this folder, converted by `core/api/registre-mappers.ts`.
 */

import { Fcfa } from './common.model';

/** Fact hash: 64 hexadecimal characters. Every identifier of the registry is one. */
export type Hash = string;
/** `YYYY-MM-DD` (value date / business date). */
export type IsoDate = string;

// ---- Generic facts ----

export interface FaitEnregistre {
  fait: Hash;
}

/** `insere` is false when the same body already existed: a replay never duplicates a fact. */
export interface FaitIdempotent {
  fait: Hash;
  insere: boolean;
}

export interface Arete {
  role: string;
  predecesseur: Hash;
}

export interface Fait {
  fait: Hash;
  type: string;
  champs: Record<string, unknown>;
  predecesseurs: Arete[];
  auteur?: string | null;
  recuLe: string;
}

export interface FaitResume {
  fait: Hash;
  type: string;
  champs: Record<string, unknown>;
  auteur?: string | null;
  recuLe: string;
}

/** Body of `POST /faits` and `POST /faits/apercu`; `predecesseurs` maps a role to hashes. */
export interface NouveauFait {
  type: string;
  champs?: Record<string, unknown>;
  predecesseurs?: Record<string, Hash[]>;
  auteur?: string | null;
}

/** Error body of every 4xx answer. */
export interface Probleme {
  message: string;
}

export interface Sante {
  registre: string;
  types: number;
  faits: number;
}

// ---- Rules, rights ----

export interface Habilitation {
  roleCode: RegistreRole;
  action: string;
}

/** Business roles of the registry (`RoleMetier.code`). */
export type RegistreRole =
  'agent' | 'secretaire' | 'assistant' | 'chef_agence' | 'caissiere' | 'comptable' | 'dg';

/** Product rule in force (`RegleProduit`), read field by field with `GET /regles/{champ}`. */
export interface RegleProduit {
  code: string;
  partCashEnrolementFcfa: Fcfa;
  fraisOuvertureFcfa: Fcfa;
  soldePreleveSurEpargneFcfa: Fcfa;
  epargneMinimumFcfa: Fcfa;
  plafondCaisseFcfa: Fcfa;
  /** `HH:mm`, Abidjan time. */
  heureCoupureCaisse: string;
  joursDeGrace: number;
  penaliteRetardParJourFcfa: Fcfa;
  semainesObservationMin: number;
  delaiAnalysePretHeures: number;
  delaiAmiableJours: number;
}

export interface LigneBareme {
  code: string;
  montantFcfa: Fcfa;
  dureeMois: number;
  fraisFcfa: Fcfa;
  interetFcfa?: Fcfa | null;
  baremeCourant: boolean;
}

// ---- Enrollment ----

export interface ConsentementSaisi {
  finalite: string;
  versionDocument: string;
  accepte: boolean;
}

export interface EngagementSaisi {
  periodicite: string;
  montantMinFcfa: Fcfa;
  semainesMin: number;
  motif: string;
  accepte: boolean;
  montantPretViseFcfa?: Fcfa | null;
}

export interface ReferentSaisi {
  nom: string;
  lien: string;
  telephone: string;
  informe: boolean;
  activite?: string | null;
  domicile?: string | null;
}

export interface MobileMoneySaisi {
  operateur: string;
  numero: string;
}

export interface DossierSaisi {
  /** Opaque token of the person, created once per enrollment on the device (ASSUMPTION A28). */
  jeton: string;
  nom: string;
  prenoms: string;
  telephone: string;
  typePiece: string;
  numeroPiece: string;
  secteur: string;
  agence: string;
  marche: string;
  referent: ReferentSaisi;
  engagement: EngagementSaisi;
  consentements: ConsentementSaisi[];
  commune?: string | null;
  quartier?: string | null;
  pointRepere?: string | null;
  numeroEtale?: string | null;
  depuis?: IsoDate | null;
  photoRef?: string | null;
  mobileMoney?: MobileMoneySaisi | null;
}

export interface EnrolementDemande {
  agent: Hash;
  dossier: DossierSaisi;
}

/** `POST /enrolements` answer. A replay returns the same hashes. */
export interface Enrollement {
  personne: Hash;
  compte: Hash;
}

export interface StatutCompte {
  compte: Hash;
  statut: string;
}

export interface Solde {
  comptabilise: Fcfa;
  enAttente: Fcfa;
  annonce: Fcfa;
}

export interface Identite {
  personne: Hash;
  identite: Hash;
  nom: string;
  prenoms: string;
  commune?: string | null;
  quartier?: string | null;
  pointRepere?: string | null;
  photoRef?: string | null;
}

export interface Decision {
  compte: Hash;
  nature: string;
  decision: Hash;
  motif?: string | null;
}

export interface DecisionDemandee {
  nature: string;
  auteur?: Hash | null;
  motif?: string | null;
  preuve?: Hash | null;
  priors?: Hash[] | null;
}

export interface Eligibilite {
  eligible: boolean;
  motif: string;
}

// ---- Cards ----

export interface Carte {
  carte: Hash;
  jeton: string;
  statut: string;
  association?: Hash | null;
  compte?: Hash | null;
}

export interface Association {
  carte: Hash;
  compte: Hash;
  agent: Hash;
}

export interface ActivationCarte {
  association: Hash;
  preuve: Hash;
}

// ---- Money ----

/** Payment natures (`Aiguillage.nature`). */
export type NaturePaiement = 'ouverture_cash' | 'epargne' | 'remboursement' | 'frais_dossier_pret';

export interface Especes {
  compte: Hash;
  agent: Hash;
  nature: NaturePaiement;
  montantFcfa: Fcfa;
  /** Idempotency key, at least 8 characters, created on the device. */
  cle: string;
  dateValeur: IsoDate;
}

export interface Numerique {
  compte: Hash;
  operateur: string;
  /** Operator reference: the idempotency key of the payment. */
  reference: string;
  nature: NaturePaiement;
  montantFcfa: Fcfa;
  dateValeur: IsoDate;
  agent?: Hash | null;
}

export interface DateCaisse {
  dateValeur: IsoDate;
}

export interface PositionCaisse {
  totalFcfa: Fcfa;
  plafondFcfa: Fcfa;
  depasse: boolean;
}

export interface LigneJournal {
  ecriture: Hash;
  dateComptable: IsoDate;
  libelle: string;
  sens: string;
  montantFcfa: Fcfa;
  rang: number;
  compteCode: string;
  compteEpargne?: Hash | null;
  annulee: boolean;
}

export interface ResultatSync {
  ordre: number;
  insere: boolean;
  statut: string;
  fait?: Hash | null;
  message?: string | null;
}
