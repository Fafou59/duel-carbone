/**
 * Le serveur de Duel Carbone : le code du Worker Cloudflare qui sert déjà le jeu (wrangler.jsonc, « main »).
 *
 * Les fichiers du jeu (pages, code, icônes) sont toujours servis directement par Cloudflare, gratuitement, sans
 * passer par ici. Seules les adresses /api/… appellent ce code (« run_worker_first » dans wrangler.jsonc), et
 * l'adresse courte d'une Séance, /rejoindre, qu'il renvoie vers la page du téléphone (/#rejoindre).
 * Voir l'ADR 0005 (un serveur sur le Worker, avec D1 dans l'UE, sans identité) et l'ADR 0007 (les Séances du Mode
 * animation, un Durable Object par Séance).
 */
import { ancreDuCheminCourt } from '../src/domaine/adresse-courte.ts'
import { traiterRequete, type Environnement } from './api.ts'
import { traiterUneSeance, type EnvironnementDesSeances } from './seance-api.ts'

// Cloudflare trouve la classe du Durable Object parmi ce qu'exporte le Worker (wrangler.jsonc, « exports »).
export { Seance } from './seance.ts'

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
  fetch: async (requete: Request, env: Environnement & EnvironnementDesSeances): Promise<Response> =>
    redirigerLAdresseCourte(requete) ?? (await traiterUneSeance(requete, env)) ?? traiterRequete(requete, env),
}
