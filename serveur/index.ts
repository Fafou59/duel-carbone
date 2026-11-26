/**
 * Le serveur de Duel Carbone : le code du Worker Cloudflare qui sert déjà le jeu (wrangler.jsonc, « main »).
 *
 * Les fichiers du jeu (pages, code, icônes) sont toujours servis directement par Cloudflare, gratuitement, sans
 * passer par ici. Seules les adresses /api/… appellent ce code (« run_worker_first » dans wrangler.jsonc).
 * Voir l'ADR 0005 : un serveur sur le Worker, avec D1 dans l'UE, sans identité.
 */
import { traiterRequete, type Environnement } from './api.ts'

export { Seance } from './seance.ts'

type EnvironnementComplet = Environnement & { SEANCE: DurableObjectNamespace }

export default {
  fetch: async (requete: Request, env: EnvironnementComplet): Promise<Response> => {
    // SONDE TEMPORAIRE (lot 1, étape 1) : la juridiction « eu » des Durable Objects sur le plan gratuit.
    if (new URL(requete.url).pathname === '/api/seance/sonde') {
      try {
        const objet = env.SEANCE.jurisdiction('eu').getByName('sonde')
        return await objet.fetch(requete)
      } catch (panne) {
        return Response.json({ erreur: String(panne) }, { status: 500 })
      }
    }
    return traiterRequete(requete, env)
  },
}
