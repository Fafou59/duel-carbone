/**
 * L'image de partage au format Story (1080 × 1920 px) : ce qui est écrit et dessiné, et où (#79).
 *
 * Une Story (Instagram, Facebook, Snapchat, statut WhatsApp) n'accepte que des images : le texte de
 * « Défier mes proches » n'y passe pas. Cette image est dessinée sur l'appareil du joueur (src/navigateur/
 * image-de-partage.ts) ; ici, on ne fait que la mise en page, sous forme d'une liste d'éléments à dessiner
 * dans l'ordre. C'est une fonction pure : on peut la tester sans navigateur (jsdom ne sait pas dessiner).
 *
 * Choix de Fabien (maquette B) : le thème sombre du jeu, les icônes de la vitrine en filigrane, et au centre
 * une carte avec le score. Comme le texte de partage, l'image ne dévoile aucun Geste de la Partie : les icônes
 * du filigrane sont celles de la vitrine, toujours les mêmes, quelle que soit la Partie.
 */
import { COLONNE_DROITE, COLONNE_GAUCHE } from '../donnees/vitrine.ts'
import { ADRESSE_DU_JEU } from './partage.ts'
import { NOMBRE_DE_DUELS } from './partie.ts'
import { messageDeScore } from './recapitulatif.ts'

export const IMAGE_STORY = { largeur: 1080, hauteur: 1920 }

/**
 * La bande où rien d'important ne doit sortir : en haut, Instagram pose le nom du compte et la barre de
 * progression ; en bas, le champ « Envoyer un message ». On garde 250 px de marge de chaque côté.
 */
export const ZONE_SURE = { haut: 250, bas: IMAGE_STORY.hauteur - 250 }

/** Ce que montre l'image. Sans numéro, c'est une Partie libre. */
export type DonneesImage = {
  /** Le numéro du Duel du jour (absent pour une Partie libre). */
  numero?: number
  score: number
  /** Bonne réponse ou non, Duel par Duel : les mêmes cases que le texte de partage. */
  bonnes: readonly boolean[]
  /** La série de jours d'affilée (Duel du jour seulement). */
  serie?: number
}

/** Un élément à dessiner. Les positions sont en pixels de l'image ; un texte est placé par sa ligne de base. */
export type Element =
  | { sorte: 'rectangle'; x: number; y: number; largeur: number; hauteur: number; rayon: number; couleur: string; bordure?: string }
  | { sorte: 'filigrane'; id: string; x: number; y: number; taille: number; angle: number }
  | { sorte: 'logo'; x: number; y: number; taille: number }
  | {
      sorte: 'texte'
      texte: string
      x: number
      y: number
      taille: number
      graisse: number
      couleur: string
      alignement: 'center' | 'left' | 'right'
      /** Au-delà, le texte est resserré pour tenir (comme le fait fillText du Canvas). */
      largeurMax?: number
    }
  | { sorte: 'case'; x: number; y: number; cote: number; bonne: boolean }

/** Les couleurs du mode sombre (src/index.css) ; les cases gardent le vert et le rouge francs du mode clair. */
export const COULEURS = {
  fond: '#141816',
  carte: '#1E2421',
  ligne: '#333B36',
  encre: '#ECEFE9',
  discret: '#A7B0A8',
  marque: '#4FBF8C',
  surMarque: '#0D1411',
  bon: '#1B7A45',
  mauvais: '#B3261E',
}

/** L'opacité des icônes du filigrane : juste assez pour qu'on les devine. */
export const OPACITE_FILIGRANE = 0.12

const { largeur: L, hauteur: H } = IMAGE_STORY
const CENTRE = L / 2
const VITRINE = [...COLONNE_GAUCHE, ...COLONNE_DROITE]

/** Le filigrane : des icônes de la vitrine en quinconce sur toute l'image, légèrement penchées. */
function filigrane(): Element[] {
  const icones: Element[] = []
  for (let ligne = 0; ligne < 11; ligne++) {
    for (let colonne = 0; colonne < 6; colonne++) {
      icones.push({
        sorte: 'filigrane',
        // Un pas de 7 dans la liste : les icônes voisines ne se ressemblent pas (aliments, objets, trajets).
        id: VITRINE[(icones.length * 7) % VITRINE.length],
        x: colonne * 200 + (ligne % 2 ? 100 : 0) - 40,
        y: ligne * 185 - 30,
        taille: 120,
        angle: (ligne + colonne) % 2 ? -10 : 10,
      })
    }
  }
  return icones
}

/** Les cases ✓/✗, centrées sur une ligne. */
function grille(bonnes: readonly boolean[], y: number): Element[] {
  const cote = 66
  const ecart = 12
  const debut = CENTRE - (bonnes.length * cote + (bonnes.length - 1) * ecart) / 2
  return bonnes.map((bonne, i) => ({ sorte: 'case', x: debut + i * (cote + ecart), y, cote, bonne }))
}

/** Au-delà de ce nombre de caractères, le message de fin passe sur deux lignes. */
const LIGNE_MAX = 38

/**
 * Coupe une phrase en deux lignes : de préférence après une ponctuation (« Pas mal ! » / « Quelques pièges… »),
 * sinon à l'espace le plus proche du milieu, jamais devant « : », « ! » ou « ? » (espace insécable en français).
 * Sans mesurer le texte (la mise en page reste une fonction pure) : compter les caractères suffit pour des
 * phrases courtes, à une taille de police connue.
 */
export function couperEnDeux(contenu: string): [string, string] {
  const coupes = [...contenu.matchAll(/ (?![:;!?»])/g)].map((m) => m.index)
  const enDeux = (i: number): [string, string] => [contenu.slice(0, i), contenu.slice(i + 1)]
  const apresPonctuation = coupes.find((i) => /[.!?:]$/.test(contenu.slice(0, i)) && enDeux(i).every((l) => l.length <= LIGNE_MAX))
  if (apresPonctuation !== undefined) return enDeux(apresPonctuation)
  const milieu = contenu.length / 2
  return enDeux(coupes.reduce((meilleure, i) => (Math.abs(i - milieu) < Math.abs(meilleure - milieu) ? i : meilleure)))
}

/** Le message de fin : une ligne s'il tient (46 px), sinon deux lignes un peu plus petites (42 px). */
function message(score: number): Element[] {
  const contenu = messageDeScore(score, NOMBRE_DE_DUELS)
  if (contenu.length <= 34) return [texte(contenu, 1105, 46, 600, COULEURS.encre)]
  return couperEnDeux(contenu).map((ligne, i) => texte(ligne, 1092 + i * 50, 42, 600, COULEURS.encre, { largeurMax: 820 }))
}

const texte = (
  contenu: string,
  y: number,
  taille: number,
  graisse: number,
  couleur: string,
  autres: Partial<Extract<Element, { sorte: 'texte' }>> = {},
): Element => ({ sorte: 'texte', texte: contenu, x: CENTRE, y, taille, graisse, couleur, alignement: 'center', ...autres })

export function miseEnPageDeLImage({ numero, score, bonnes, serie = 0 }: DonneesImage): Element[] {
  const c = COULEURS
  const duJour = numero !== undefined
  const avecSerie = duJour && serie > 0
  return [
    { sorte: 'rectangle', x: 0, y: 0, largeur: L, hauteur: H, rayon: 0, couleur: c.fond },
    ...filigrane(),
    { sorte: 'logo', x: CENTRE - 100, y: 270, taille: 200 },
    texte('Duel Carbone', 580, 92, 800, c.encre),
    // La carte du score.
    // Sans série (Partie libre, ou première fois), la carte s'arrête sous les cases, sans vide en bas.
    { sorte: 'rectangle', x: 90, y: 650, largeur: 900, hauteur: avecSerie ? 740 : 660, rayon: 48, couleur: c.carte, bordure: c.ligne },
    texte(duJour ? `Duel du jour n° ${numero}` : 'Partie libre', 760, 54, 700, c.marque),
    // Le score en grand, puis « /10 » plus petit : les deux se touchent un peu à droite du centre.
    texte(String(score), 1010, 280, 900, c.encre, { x: CENTRE + 40, alignement: 'right' }),
    texte(`/${NOMBRE_DE_DUELS}`, 1010, 110, 800, c.encre, { x: CENTRE + 40, alignement: 'left' }),
    ...message(score),
    ...grille(bonnes, 1185),
    ...(avecSerie
      ? [texte(`🔥 Série : ${serie} jour${serie > 1 ? 's' : ''} d’affilée`, 1328, 42, 600, c.discret)]
      : []),
    // Sous la carte : l'invitation, et l'adresse du jeu dans une pastille (le lien n'est pas cliquable dans une Story).
    texte('Sauras-tu faire mieux ?', 1490, 56, 800, c.encre),
    { sorte: 'rectangle', x: 240, y: 1540, largeur: 600, hauteur: 110, rayon: 55, couleur: c.marque },
    texte(new URL(ADRESSE_DU_JEU).hostname, 1617, 62, 800, c.surMarque),
  ]
}
