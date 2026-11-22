/**
 * La base D1 du serveur : une base SQLite chez Cloudflare, dans l'Union européenne (juridiction « eu », ADR 0005).
 * Le Worker y accède par un « binding » : un objet que Cloudflare lui passe (env.BASE), déclaré dans wrangler.jsonc.
 *
 * Plutôt que d'ajouter tous les types de Cloudflare au projet, on décrit ici les seules fonctions de D1 dont on se
 * sert : les tests peuvent ainsi les remplacer par une base SQLite en mémoire (voir api.test.ts).
 */
import { NOMBRE_DE_DUELS } from '../src/domaine/partie.ts'
import type { Effectifs } from '../src/domaine/rang-du-jour.ts'

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
