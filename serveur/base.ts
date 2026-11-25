/**
 * La base D1 du serveur : une base SQLite chez Cloudflare, dans l'Union européenne (juridiction « eu », ADR 0005).
 * Le Worker y accède par un « binding » : un objet que Cloudflare lui passe (env.BASE), déclaré dans wrangler.jsonc.
 *
 * Plutôt que d'ajouter tous les types de Cloudflare au projet, on décrit ici les seules fonctions de D1 dont on se
 * sert : les tests peuvent ainsi les remplacer par une base SQLite en mémoire (voir api.test.ts).
 */
import { NOMBRE_DE_DUELS } from '../src/domaine/partie.ts'
import type { Effectifs } from '../src/domaine/rang-du-jour.ts'
import type { ComptesDesPaires } from '../src/domaine/taux-d-erreur.ts'

/** Une requête SQL préparée, à laquelle on attache des valeurs (bind) avant de l'exécuter. */
export type RequeteD1 = {
  bind: (...valeurs: (string | number)[]) => RequeteD1
  all: <T>() => Promise<{ results: T[] }>
}

/** Le strict nécessaire de D1. */
export type BaseD1 = {
  prepare: (sql: string) => RequeteD1
  /** Plusieurs requêtes d'un coup, dans une transaction : toutes passent, ou aucune. */
  batch: <T>(requetes: RequeteD1[]) => Promise<{ results: T[] }[]>
}

type Ligne = { score: number; joueurs: number }

const LIRE = 'SELECT score, joueurs FROM effectifs WHERE jour = ?'

// « INSERT … ON CONFLICT DO UPDATE » : la première fois, on crée la case du jour avec 1 joueur ; ensuite, on y
// ajoute 1. SQLite fait l'addition lui-même, d'un seul coup : deux joueurs qui finissent à la même seconde sont
// bien comptés tous les deux.
const AJOUTER = `INSERT INTO effectifs (jour, score, joueurs) VALUES (?, ?, 1)
  ON CONFLICT (jour, score) DO UPDATE SET joueurs = joueurs + 1`

/** Les lignes de la base (au plus 11, les scores absents n'en ont pas) mises en Effectifs : 11 cases, de 0 à 10. */
function enEffectifs(lignes: Ligne[]): Effectifs {
  const effectifs = Array<number>(NOMBRE_DE_DUELS + 1).fill(0)
  for (const { score, joueurs } of lignes) effectifs[score] = joueurs
  return effectifs
}

/** Les Effectifs d'un jour. */
export async function lireEffectifs(base: BaseD1, jour: string): Promise<Effectifs> {
  const { results } = await base.prepare(LIRE).bind(jour).all<Ligne>()
  return enEffectifs(results)
}

/** Ajoute un joueur dans la case de son score, puis relit les Effectifs du jour (une seule transaction). */
export async function compterUnJoueur(base: BaseD1, jour: string, score: number): Promise<Effectifs> {
  const [, lecture] = await base.batch<Ligne>([base.prepare(AJOUTER).bind(jour, score), base.prepare(LIRE).bind(jour)])
  return enEffectifs(lecture.results)
}

// --- Le Taux d'erreur (table « reponses », migration 0002, ADR 0006) ---

type LigneDePaire = { paire: string; reponses: number; fausses: number }

/** La lecture des comptes de quelques paires : « WHERE paire IN (?, ?, …) », un « ? » par paire. */
const lireLesPaires = (nombre: number) =>
  `SELECT paire, reponses, fausses FROM reponses WHERE paire IN (${Array(nombre).fill('?').join(', ')})`

// Comme pour les Effectifs : la première réponse crée la ligne de la paire, les suivantes s'y ajoutent, et SQLite
// fait l'addition lui-même. Le second « ? » vaut 1 pour une réponse fausse, 0 pour une bonne.
const AJOUTER_UNE_REPONSE = `INSERT INTO reponses (paire, reponses, fausses) VALUES (?, 1, ?)
  ON CONFLICT (paire) DO UPDATE SET reponses = reponses + 1, fausses = fausses + excluded.fausses`

const enComptes = (lignes: LigneDePaire[]): ComptesDesPaires =>
  Object.fromEntries(lignes.map(({ paire, reponses, fausses }) => [paire, { reponses, fausses }]))

/** Les comptes des paires demandées (celles jamais jouées n'y figurent pas). */
export async function lireComptes(base: BaseD1, cles: string[]): Promise<ComptesDesPaires> {
  if (cles.length === 0) return {}
  const { results } = await base.prepare(lireLesPaires(cles.length)).bind(...cles).all<LigneDePaire>()
  return enComptes(results)
}

/** La fin d'une Partie libre, en une seule transaction : ses 10 réponses comptées, puis les comptes à jour. */
export async function compterDesReponses(base: BaseD1, reponses: { cle: string; fausse: boolean }[]): Promise<ComptesDesPaires> {
  const cles = [...new Set(reponses.map((r) => r.cle))]
  const resultats = await base.batch<unknown>([
    ...reponses.map((r) => base.prepare(AJOUTER_UNE_REPONSE).bind(r.cle, r.fausse ? 1 : 0)),
    base.prepare(lireLesPaires(cles.length)).bind(...cles),
  ])
  return enComptes(resultats[resultats.length - 1].results as LigneDePaire[])
}

/**
 * La fin d'une Partie du jour, en une seule transaction : le joueur dans la case de son score, ses 10 réponses
 * dans les comptes de leurs paires, puis la relecture des Effectifs du jour et des comptes à jour.
 */
export async function compterUnePartieDuJour(
  base: BaseD1,
  jour: string,
  score: number,
  reponses: { cle: string; fausse: boolean }[],
): Promise<{ effectifs: Effectifs; paires: ComptesDesPaires }> {
  const cles = [...new Set(reponses.map((r) => r.cle))]
  const resultats = await base.batch<unknown>([
    base.prepare(AJOUTER).bind(jour, score),
    ...reponses.map((r) => base.prepare(AJOUTER_UNE_REPONSE).bind(r.cle, r.fausse ? 1 : 0)),
    base.prepare(LIRE).bind(jour),
    base.prepare(lireLesPaires(cles.length)).bind(...cles),
  ])
  const [effectifs, paires] = resultats.slice(-2)
  return { effectifs: enEffectifs(effectifs.results as Ligne[]), paires: enComptes(paires.results as LigneDePaire[]) }
}
