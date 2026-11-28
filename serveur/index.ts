/**
 * Le serveur de Duel Carbone : le code du Worker Cloudflare qui sert déjà le jeu (wrangler.jsonc, « main »).
 *
 * Les fichiers du jeu (pages, code, icônes) sont toujours servis directement par Cloudflare, gratuitement, sans
 * passer par ici. Seules les adresses /api/… appellent ce code (« run_worker_first » dans wrangler.jsonc).
 * Voir l'ADR 0005 (un serveur sur le Worker, avec D1 dans l'UE, sans identité), l'ADR 0007 (les Séances du Mode
 * animation, un Durable Object par Séance) et l'ADR 0008 (le Rappel du matin).
 *
 * Trois façons d'appeler ce code :
 * - fetch : une adresse /api/… demandée par le jeu ;
 * - scheduled : la tâche planifiée du matin (« triggers.crons » de wrangler.jsonc), qui prépare le Rappel ;
 * - queue : un lot de la file du Rappel (« queues.consumers »), qui envoie 25 Rappels.
 */
import { traiterRequete, type Environnement } from './api.ts'
import { envoyerLesLots, planifierLeRappel, traiterLeRappel, type EnvironnementDuRappel, type Lot } from './rappel.ts'
import { traiterUneSeance, type EnvironnementDesSeances } from './seance-api.ts'

// Cloudflare trouve la classe du Durable Object parmi ce qu'exporte le Worker (wrangler.jsonc, « exports »).
export { Seance } from './seance.ts'

type Tout = Environnement & EnvironnementDesSeances & EnvironnementDuRappel

export default {
  fetch: async (requete: Request, env: Tout, ctx: ExecutionContext): Promise<Response> =>
    (await traiterLeRappel(requete, env, ctx)) ?? (await traiterUneSeance(requete, env)) ?? traiterRequete(requete, env),

  scheduled: async (_tache: ScheduledController, env: Tout): Promise<void> => {
    await planifierLeRappel(env)
  },

  queue: async (lot: MessageBatch<Lot>, env: Tout): Promise<void> => {
    await envoyerLesLots(lot.messages, env)
  },
}
