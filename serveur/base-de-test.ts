// La base D1 des tests du serveur qui tournent dans Node (api.test.ts, rappel.test.ts).
import { readdirSync, readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type { BaseD1, RequeteD1 } from './base.ts'

/**
 * Une base D1 de test : une vraie base SQLite en mémoire (node:sqlite), avec la même table que la vraie
 * (le fichier de migration est appliqué tel quel), derrière les quelques fonctions de D1 qu'utilise le serveur.
 */
export function baseDeTest(): BaseD1 & { sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:')
  // Toutes les migrations, dans l'ordre de leur numéro, comme Wrangler les applique à la vraie base.
  const dossier = new URL('../migrations/', import.meta.url)
  for (const fichier of readdirSync(dossier).filter((f) => f.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(fichier, dossier), 'utf8'))
  }
  const requete = (sql: string, valeurs: (string | number)[] = []): RequeteD1 => ({
    bind: (...v) => requete(sql, v),
    all: async <T,>() => ({ results: sqlite.prepare(sql).all(...valeurs) as T[] }),
  })
  return {
    sqlite,
    prepare: (sql) => requete(sql),
    // D1 enchaîne les requêtes d'un lot dans une transaction : toutes passent, ou aucune.
    batch: async (requetes) => {
      sqlite.exec('BEGIN')
      try {
        const resultats = []
        for (const r of requetes) resultats.push(await r.all())
        sqlite.exec('COMMIT')
        return resultats as never
      } catch (erreur) {
        sqlite.exec('ROLLBACK')
        throw erreur
      }
    },
  }
}
