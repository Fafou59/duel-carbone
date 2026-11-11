/**
 * L'adresse publique du jeu, celle qu'on partage. On ne lit pas l'adresse de la page en cours :
 * depuis l'aperçu d'une branche ou depuis l'ordinateur du développeur, on partagerait un lien
 * qui ne mène pas à la version publique du jeu.
 * Adresse chez Cloudflare (ADR 0003), à mettre à jour au passage sur duelcarbone.fr (ticket #19).
 */
export const ADRESSE_DU_JEU = 'https://duel-carbone.fabien-lesage.workers.dev'

/** « J'ai fait 8/10 à Duel Carbone 🌍 Sauras-tu faire mieux ? https://… » */
export function texteDePartage(score: number, total: number): string {
  return `J'ai fait ${score}/${total} à Duel Carbone 🌍 Sauras-tu faire mieux ? ${ADRESSE_DU_JEU}`
}
