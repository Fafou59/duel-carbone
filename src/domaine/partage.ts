import { NOMBRE_DE_DUELS } from './partie.ts'

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

/** L'accroche du Duel du jour n° numero : la liste dans l'ordre (la n° 1 le premier jour), puis on reboucle. */
export function accrocheDuJour(numero: number, accroches: readonly string[]): string {
  const n = accroches.length
  // ((x % n) + n) % n : un reste toujours positif, même avant le premier jour.
  return accroches[(((numero - 1) % n) + n) % n]
}

/**
 * Le texte de partage du Duel du jour, comme Wordle : l'accroche du jour, le score, une case par Duel
 * (🟩 bonne réponse, 🟥 ratée) et le lien. Aucun nom de Geste ni marque de Duel thématique : on ne gâche
 * pas la Partie des autres.
 *
 *     C'est l'heure du Duel Carbone ! ⚔️
 *     Duel Carbone du jour n° 12 : 8/10
 *     🟩🟩🟩🟩🟥🟩🟩🟥🟩🟩
 *     https://…
 */
export function texteDePartageDuJour({
  numero,
  score,
  bonnes,
  accroches,
}: {
  numero: number
  score: number
  /** Bonne réponse ou non, Duel par Duel (vide si on ne le sait pas : la grille est alors omise). */
  bonnes: readonly boolean[]
  accroches: readonly string[]
}): string {
  const grille = bonnes.map((bonne) => (bonne ? '🟩' : '🟥')).join('')
  return [accrocheDuJour(numero, accroches), `Duel Carbone du jour n° ${numero} : ${score}/${NOMBRE_DE_DUELS}`, grille, ADRESSE_DU_JEU]
    .filter(Boolean)
    .join('\n')
}
