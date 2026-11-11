/**
 * Partager un texte avec les outils du navigateur : le menu de partage natif sur téléphone,
 * le presse-papiers sur ordinateur.
 *
 * Le navigateur est passé en paramètre (« Environnement ») plutôt que lu directement :
 * les tests peuvent ainsi simuler un téléphone, un ordinateur, une annulation ou une panne.
 */
import { mesurer } from './mesure.ts'

export type Environnement = {
  /** Écran tactile comme principal moyen de pointer (téléphone, tablette). */
  tactile: boolean
  share?: (donnees: ShareData) => Promise<void>
  writeText?: (texte: string) => Promise<void>
}

export type ResultatPartage = 'partage' | 'annule' | 'copie' | 'echec'

export async function partager(texte: string, env: Environnement = environnementReel()): Promise<ResultatPartage> {
  const resultat = await partagerOuCopier(texte, env)
  // Mesure d'audience : un partage compte s'il a abouti (menu de partage ou copie), pas s'il est annulé ou échoue.
  if (resultat === 'partage' || resultat === 'copie') mesurer('partage')
  return resultat
}

async function partagerOuCopier(texte: string, env: Environnement): Promise<ResultatPartage> {
  // Sur ordinateur, Windows et macOS proposent aussi un menu de partage, mais peu pratique :
  // on lui préfère la copie, plus attendue. Le menu natif est réservé aux appareils tactiles.
  if (env.tactile && env.share) {
    try {
      // Le lien est dans le texte : certaines applications ignorent le champ « url » séparé.
      await env.share({ text: texte })
      return 'partage'
    } catch (erreur) {
      // Le joueur a fermé le menu : ce n'est pas une erreur, on ne fait rien.
      if (erreur instanceof Error && erreur.name === 'AbortError') return 'annule'
      // Toute autre panne : on se rabat sur la copie.
    }
  }
  if (!env.writeText) return 'echec'
  try {
    await env.writeText(texte)
    return 'copie'
  } catch {
    return 'echec'
  }
}

function environnementReel(): Environnement {
  return {
    tactile: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    share: navigator.share ? (donnees) => navigator.share(donnees) : undefined,
    writeText: navigator.clipboard ? (texte) => navigator.clipboard.writeText(texte) : undefined,
  }
}
