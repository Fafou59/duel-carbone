/**
 * Le serveur de Duel Carbone : le code du Worker Cloudflare qui sert déjà le jeu (wrangler.jsonc, « main »).
 *
 * Les fichiers du jeu (pages, code, icônes) sont toujours servis directement par Cloudflare, gratuitement, sans
 * passer par ici. Seules les adresses /api/… appellent ce code (« run_worker_first » dans wrangler.jsonc).
 * Voir l'ADR 0005 : un serveur sur le Worker, avec D1 dans l'UE, sans identité.
 */
import { traiterRequete, type Environnement } from './api.ts'

export default {
  fetch: (requete: Request, env: Environnement): Promise<Response> => traiterRequete(requete, env),
}
