/**
 * Le serveur de Duel Carbone : le code du Worker Cloudflare qui sert déjà le jeu (wrangler.jsonc, « main »).
 *
 * Les fichiers du jeu (pages, code, icônes) sont toujours servis directement par Cloudflare, gratuitement, sans
 * passer par ici. Seules les adresses /api/… appellent ce code (« run_worker_first » dans wrangler.jsonc), et
 * l'adresse courte d'une Séance, /rejoindre, qu'il renvoie vers la page du téléphone (/#rejoindre).
 * Voir l'ADR 0005 (un serveur sur le Worker, avec D1 dans l'UE, sans identité), l'ADR 0007 (les Séances du Mode
 * animation, un Durable Object par Séance) et l'ADR 0008 (le Rappel du matin).
 *
 * Trois façons d'appeler ce code :
 * - fetch : une adresse demandée par le navigateur (/api/…, /rejoindre) ;
 * - scheduled : la tâche planifiée du matin (« triggers.crons » de wrangler.jsonc), qui prépare le Rappel ;
 * - queue : un lot de la file du Rappel (« queues.consumers »), qui envoie 25 Rappels.
 */
import { ancreDuCheminCourt } from '../src/domaine/adresse-courte.ts'
import { traiterRequete, type Environnement } from './api.ts'
import { envoyerLesLots, planifierLeRappel, traiterLeRappel, type EnvironnementDuRappel, type Lot } from './rappel.ts'
import { traiterUneSeance, type EnvironnementDesSeances } from './seance-api.ts'

// Cloudflare trouve la classe du Durable Object parmi ce qu'exporte le Worker (wrangler.jsonc, « exports »).
export { Seance } from './seance.ts'

type Tout = Environnement & EnvironnementDesSeances & EnvironnementDuRappel

/**
 * duelcarbone.fr/rejoindre (et /rejoindre/<code>), l'adresse à taper sous le QR code : une redirection vers la page
 * du téléphone, /#rejoindre. Le jeu ne connaît que les ancres ; c'est le navigateur qui garde l'ancre en suivant.
 */
function redirigerLAdresseCourte(requete: Request): Response | null {
  const adresse = new URL(requete.url)
  const ancre = ancreDuCheminCourt(adresse.pathname)
  return ancre ? Response.redirect(`${adresse.origin}/${adresse.search}${ancre}`, 302) : null
}

export default {
  fetch: async (requete: Request, env: Tout, ctx: ExecutionContext): Promise<Response> =>
    redirigerLAdresseCourte(requete) ??
    (await traiterLeRappel(requete, env, ctx)) ??
    (await traiterUneSeance(requete, env)) ??
    traiterRequete(requete, env),

  // L'heure prévue de la tâche (et non l'heure exacte du lancement) : un Cron parti avec un peu de retard reste
  // celui de 7 h.
  scheduled: async (tache: ScheduledController, env: Tout): Promise<void> => {
    await planifierLeRappel(env, new Date(tache.scheduledTime))
  },

  queue: async (lot: MessageBatch<Lot>, env: Tout): Promise<void> => {
    await envoyerLesLots(lot.messages, env)
  },
}
