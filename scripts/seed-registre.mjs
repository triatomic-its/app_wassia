#!/usr/bin/env node
/**
 * Development only: creates demo staff and blank QR cards in the "Registre Wassia" back end.
 * Never bundled in the app. Idempotent: identities are content-addressed, so a replay
 * returns the same hashes and adds nothing.
 *
 * Usage: npm run seed:registre [-- --url http://127.0.0.1:8080] [-- --cards 50]
 */
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = arg('url', process.env.REGISTRE_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const CARD_COUNT = Number(arg('cards', '50'));
const AUTHOR = 'seed-demo';

/** Demo staff: one per business role of the registry, plus five more field agents. */
const STAFF = [
  { login: 'dg.kouassi', role: 'dg', nom: 'Kouassi', prenoms: 'Yao' },
  { login: 'comptable.kouadio', role: 'comptable', nom: 'Kouadio', prenoms: 'Serge' },
  { login: 'caisse.sylla', role: 'caissiere', nom: 'Sylla', prenoms: 'Mariam' },
  { login: 'chef.traore', role: 'chef_agence', nom: 'Traoré', prenoms: 'Rokia' },
  { login: 'secretaire.coulibaly', role: 'secretaire', nom: 'Coulibaly', prenoms: 'Aminata' },
  { login: 'assistant.diabate', role: 'assistant', nom: 'Diabaté', prenoms: 'Moussa' },
  { login: 'agent.kone', role: 'agent', nom: 'Koné', prenoms: 'Ibrahim' },
  { login: 'agent.bamba', role: 'agent', nom: 'Bamba', prenoms: 'Awa' },
  { login: 'agent.ouattara', role: 'agent', nom: 'Ouattara', prenoms: 'Seydou' },
  { login: 'agent.yeo', role: 'agent', nom: 'Yéo', prenoms: 'Fatou' },
  { login: 'agent.toure', role: 'agent', nom: 'Touré', prenoms: 'Karim' },
  { login: 'agent.nguessan', role: 'agent', nom: 'N’Guessan', prenoms: 'Adjoua' },
];

/** Stable opaque token: same input, same token, so the seed can be replayed. */
const token = (label) => createHash('sha256').update(`wassia-demo:${label}`).digest('hex').slice(0, 32);

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const error = new Error(`${method} ${path} → ${res.status} ${data?.message ?? text}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

const assert = (type, champs, predecesseurs = {}) =>
  call('POST', '/faits', { type, champs, predecesseurs, auteur: AUTHOR }).then((r) => r.fait);

async function factsOfType(type) {
  return call('GET', `/faits?type=${encodeURIComponent(type)}&limite=1000`);
}

async function main() {
  const health = await call('GET', '/sante');
  console.log(`Registre « ${health.registre} » : ${health.faits} faits.`);

  const roles = Object.fromEntries((await factsOfType('RoleMetier')).map((f) => [f.champs.code, f.fait]));

  // Current role of each user: AttributionRole facts naming that user.
  const attributions = new Map();
  for (const a of await factsOfType('AttributionRole')) {
    const fact = await call('GET', `/faits/${a.fait}`);
    const user = fact.predecesseurs.find((p) => p.role === 'utilisateur')?.predecesseur;
    if (user) attributions.set(user, fact);
  }

  for (const s of STAFF) {
    const personne = await assert('Personne', { jeton: token(`personne:${s.login}`) });
    await assert('Identite', { nom: s.nom, prenoms: s.prenoms }, { personne: [personne] }).catch(
      (e) => (e.status === 409 ? null : Promise.reject(e)),
    );
    const utilisateur = await assert('Utilisateur', { identifiant: s.login }, { personne: [personne] });
    if (!roles[s.role]) throw new Error(`Rôle inconnu du registre : ${s.role}`);
    if (!attributions.has(utilisateur)) {
      await call('POST', `/utilisateurs/${utilisateur}/roles`, { role: roles[s.role] });
    }
    console.log(`  ${s.role.padEnd(12)} ${s.login.padEnd(22)} ${utilisateur}`);
  }

  let created = 0;
  for (let n = 1; n <= CARD_COUNT; n++) {
    const printed = `WAS-${String(n).padStart(6, '0')}`;
    const carte = await call('POST', '/faits', {
      type: 'CarteQr',
      champs: { jeton: token(`carte:${printed}`) },
      auteur: AUTHOR,
    });
    if (carte.insere) {
      created++;
      await assert('Descriptif', { texte: printed }, { sujet: [carte.fait] });
    }
  }
  console.log(`Cartes vierges : ${created} créées, ${CARD_COUNT - created} déjà présentes.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
