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

/*
 * Le partage en image (#79), pour les Stories : Instagram, Facebook, Snapchat et les statuts WhatsApp
 * n'acceptent que des images. Sur téléphone, le menu de partage reçoit le fichier ; ailleurs, on l'enregistre
 * (téléchargement) et le joueur l'ajoute à sa Story depuis sa galerie.
 */

export type EnvironnementImage = Omit<Environnement, 'writeText'> & {
  /** Le menu de partage accepterait-il ces données ? (navigator.canShare, absent des vieux navigateurs.) */
  canShare?: (donnees: ShareData) => boolean
  /** Télécharge le fichier sur l'appareil. */
  enregistrer?: (fichier: File) => void
}

export type ResultatPartageImage = 'partage' | 'annule' | 'enregistre' | 'echec'

const fichierPng = (contenu: BlobPart[], nom: string) => new File(contenu, nom, { type: 'image/png' })

/**
 * Le menu de partage acceptera-t-il une image ? Sur téléphone seulement, comme pour le texte : sur ordinateur,
 * le menu de Windows ou de macOS est peu pratique, on préfère enregistrer l'image.
 */
export function peutPartagerUnFichier(env: EnvironnementImage = environnementImageReel()): boolean {
  if (!env.tactile || !env.share || !env.canShare) return false
  try {
    return env.canShare({ files: [fichierPng([], 'essai.png')] })
  } catch {
    return false
  }
}

/**
 * Partage l'image (déjà en préparation : Safari n'ouvre le menu de partage que juste après le toucher du bouton,
 * on ne peut pas attendre qu'elle soit dessinée) ou, à défaut, l'enregistre.
 */
export async function partagerImage(
  image: Promise<Blob>,
  nom: string,
  env: EnvironnementImage = environnementImageReel(),
): Promise<ResultatPartageImage> {
  const resultat = await partagerOuEnregistrer(image, nom, env)
  // Comme pour le texte : on compte un partage abouti (menu de partage ou enregistrement), pas une annulation.
  if (resultat === 'partage' || resultat === 'enregistre') mesurer('partage/image')
  return resultat
}

async function partagerOuEnregistrer(image: Promise<Blob>, nom: string, env: EnvironnementImage): Promise<ResultatPartageImage> {
  let fichier: File
  try {
    fichier = fichierPng([await image], nom)
  } catch {
    return 'echec'
  }
  if (peutPartagerUnFichier(env) && env.canShare!({ files: [fichier] })) {
    try {
      // L'image seule, sans texte : dans une Story, le texte serait perdu (l'adresse du jeu est sur l'image),
      // et certaines applications traiteraient alors le partage comme un texte, sans proposer la Story.
      await env.share!({ files: [fichier] })
      return 'partage'
    } catch (erreur) {
      if (erreur instanceof Error && erreur.name === 'AbortError') return 'annule'
      // Toute autre panne : on se rabat sur l'enregistrement.
    }
  }
  if (!env.enregistrer) return 'echec'
  try {
    env.enregistrer(fichier)
    return 'enregistre'
  } catch {
    return 'echec'
  }
}

/** Télécharge un fichier : un lien « download » vers son contenu, cliqué par le code, puis oublié. */
function enregistrer(fichier: File): void {
  const adresse = URL.createObjectURL(fichier)
  const lien = Object.assign(document.createElement('a'), { href: adresse, download: fichier.name })
  document.body.append(lien)
  lien.click()
  lien.remove()
  // On laisse au navigateur le temps de lancer le téléchargement avant de libérer la mémoire.
  setTimeout(() => URL.revokeObjectURL(adresse), 60_000)
}

function environnementImageReel(): EnvironnementImage {
  return {
    ...environnementReel(),
    canShare: navigator.canShare ? (donnees) => navigator.canShare(donnees) : undefined,
    enregistrer,
  }
}
