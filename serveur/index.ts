/**
 * Le serveur de Duel Carbone : le code du Worker Cloudflare qui sert déjà le jeu (wrangler.jsonc, « main »).
 *
 * Les fichiers du jeu (pages, code, icônes) sont toujours servis directement par Cloudflare, gratuitement, sans
 * passer par ici. Seules les adresses /api/… appellent ce code (« run_worker_first » dans wrangler.jsonc).
 * Voir l'ADR 0005 (un serveur sur le Worker, avec D1 dans l'UE, sans identité) et l'ADR 0007 (les Séances du Mode
 * animation, un Durable Object par Séance).
 */
import { traiterRequete, type Environnement } from './api.ts'
import { traiterUneSeance, type EnvironnementDesSeances } from './seance-api.ts'
import { traiterLeRappel, type Contexte, type EnvironnementDuRappel } from './rappel-prototype.ts'

// Cloudflare trouve la classe du Durable Object parmi ce qu'exporte le Worker (wrangler.jsonc, « exports »).
export { Seance } from './seance.ts'

export default {
  fetch: async (
    requete: Request,
    env: Environnement & EnvironnementDesSeances & EnvironnementDuRappel,
    ctx: Contexte,
  ): Promise<Response> =>
    // PROTOTYPE (ticket 144) : les adresses /api/rappel/… passent d'abord par le Rappel du matin.
    (await traiterLeRappel(requete, env, ctx)) ?? (await traiterUneSeance(requete, env)) ?? traiterRequete(requete, env),
}
