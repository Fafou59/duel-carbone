/**
 * Les Conseils de fin de Partie (issue 88) : une action concrète et chiffrée, liée à un Geste de la Partie,
 * proposée comme une suggestion (« Et si… »), avec un lien « En savoir plus » vers une page de l'ADEME.
 *
 * Un Conseil est rangé en trois morceaux, pour pouvoir changer l'un sans toucher aux autres :
 * - le texte, écrit maison (les actions de Nos Gestes Climat sont des articles, pas des phrases à reprendre : issue 126) ;
 * - les chiffres, jamais écrits en dur : calculés à partir des valeurs de l'Instantané, pour ne jamais
 *   contredire un Duel ;
 * - le lien.
 *
 * Fonctions pures : on leur donne l'Instantané, les Conseils, la Partie et le hasard.
 */
import type { Instantane } from '../donnees/referentiel.ts'
import type { SourceDeHasard } from './hasard.ts'

/**
 * Combien de Parties on se souvient des Conseils vus : un Conseil ne revient pas avant 10 Parties.
 * 10 depuis l'issue 126 (5 avant) : les Conseils amenés par beaucoup de Gestes (« repas végétarien ») revenaient
 * plus souvent que les autres. Sur 2 000 Parties simulées, le plus vu passe de 9,5 % à 7 % des Parties.
 */
export const CONSEILS_RECENTS = 10

/** Ce qu'un Conseil peut lire de l'Instantané, par le slug d'un Équivalent ADEME (en kg CO2e par unité). */
export type Valeurs = {
  /** L'empreinte totale d'une unité de l'Équivalent (1 kg, 1 km, 1 repas, 1 objet…). */
  valeur: (slug: string) => number
  /** Une étape de sa Répartition (« Construction », « Transport »…). */
  etape: (slug: string, libelle: string) => number
  /** Toutes ses étapes avant usage : sa fabrication, transport et emballage compris (sans usage ni fin de vie). */
  fabrication: (slug: string) => number
}

/**
 * Un chiffre du texte : son calcul, et le pas auquel on l'arrondit (10 : « 430 » ; 0,1 : « 4,7 »).
 * Le pas dit aussi au lecteur la précision qu'on revendique : « environ 430 kg » plutôt que « 428,5 kg ».
 */
export type Chiffre = { calcul: (v: Valeurs) => number; arrondi: number }

export type Conseil = {
  /** Identifiant stable, retenu dans la mémoire du navigateur (les Conseils récents). */
  id: string
  /** Le texte, avec ses chiffres en repères : « Environ {economie} kg CO2e de moins par an. » */
  texte: string
  chiffres: Record<string, Chiffre>
  /**
   * Les chiffres tels qu'ils ont été relus, arrondis (« 430 »). Un test les recalcule : si un import ADEME les
   * change, il nomme le Conseil à relire, car le texte autour du chiffre peut ne plus tenir (« plus que… »).
   */
  relu: Record<string, string>
  /** La page de l'ADEME vers laquelle mène « En savoir plus », et son titre (question de FAQ ou action). */
  lien: { url: string; titre: string }
  /** Les Gestes (identifiants du catalogue) qui amènent ce Conseil quand ils sont dans la Partie. */
  declencheurs: string[]
}

/** Les valeurs de l'Instantané, prêtes pour les calculs des Conseils. Une faute de slug lève une erreur. */
export function valeursDe(instantane: Instantane): Valeurs {
  const equivalent = (slug: string) => {
    const e = instantane.equivalents.find((x) => x.slug === slug)
    if (!e) throw new Error(`Conseil : Équivalent « ${slug} » absent de l'Instantané.`)
    return e
  }
  return {
    valeur: (slug) => equivalent(slug).valeur,
    etape: (slug, libelle) => {
      const etape = equivalent(slug).etapes.find((e) => e.libelle === libelle)
      if (!etape) throw new Error(`Conseil : étape « ${libelle} » absente de l'Équivalent « ${slug} ».`)
      return etape.valeur
    },
    fabrication: (slug) => equivalent(slug).etapes.reduce((total, e) => total + e.valeur, 0),
  }
}

/** Les chiffres d'un Conseil, calculés puis arrondis et écrits à la française (« 1 350 », « 0,06 »). */
export function chiffresDuConseil(conseil: Conseil, valeurs: Valeurs): Record<string, string> {
  return Object.fromEntries(
    Object.entries(conseil.chiffres).map(([nom, { calcul, arrondi }]) => {
      const decimales = Math.max(0, -Math.floor(Math.log10(arrondi)))
      const arrondie = Math.round(calcul(valeurs) / arrondi) * arrondi
      return [nom, new Intl.NumberFormat('fr-FR', { maximumFractionDigits: decimales }).format(arrondie)]
    }),
  )
}

/** Le texte affiché : ses repères {nom} remplacés par les chiffres du moment. */
export function redigerConseil(conseil: Conseil, valeurs: Valeurs): string {
  const chiffres = chiffresDuConseil(conseil, valeurs)
  return conseil.texte.replace(/\{(\w+)\}/g, (repere, nom: string) => chiffres[nom] ?? repere)
}

/** Ce que l'écran de fin affiche d'un Conseil : son texte rédigé, et son lien. */
export type ConseilAffiche = { id: string; texte: string; lien: Conseil['lien'] }

export function conseilAffiche(conseil: Conseil, valeurs: Valeurs): ConseilAffiche {
  return { id: conseil.id, texte: redigerConseil(conseil, valeurs), lien: conseil.lien }
}

/** Le site de l'ADEME vers lequel mène le lien, lu dans son adresse : « Nos Gestes Climat » ou « Impact CO2 ». */
export function siteDuLien(url: string): string {
  return new URL(url).hostname.endsWith('nosgestesclimat.fr') ? 'Nos Gestes Climat' : 'Impact CO2'
}

/**
 * Le Conseil de fin de Partie, en trois temps (issue 88) :
 * 1. un Conseil lié à une erreur du joueur : un Geste d'un Duel raté est l'un de ses déclencheurs ;
 * 2. sinon, un Conseil lié à un Geste de la Partie ;
 * 3. sinon, un Conseil au hasard.
 * Jamais un Conseil vu dans les dernières Parties (`recents`), sauf s'il n'en reste aucun autre.
 */
export function choisirConseil({
  conseils,
  gestesDeLaPartie,
  gestesRates,
  recents,
  hasard,
}: {
  conseils: Conseil[]
  gestesDeLaPartie: string[]
  /** Les deux Gestes de chaque Duel raté. */
  gestesRates: string[]
  recents: string[]
  hasard: SourceDeHasard
}): Conseil {
  const nouveaux = conseils.filter((c) => !recents.includes(c.id))
  const possibles = nouveaux.length > 0 ? nouveaux : conseils
  const lieA = (gestes: string[]) => possibles.filter((c) => c.declencheurs.some((id) => gestes.includes(id)))
  const candidats = [lieA(gestesRates), lieA(gestesDeLaPartie), possibles].find((liste) => liste.length > 0) ?? []
  const choisi = candidats[Math.floor(hasard() * candidats.length)]
  if (!choisi) throw new Error('Aucun Conseil à proposer : le catalogue des Conseils est vide.')
  return choisi
}

/**
 * Le Conseil de fin d'une Séance (Mode animation, PRD section 5), choisi par l'ordinateur de l'Animateur : le premier
 * Conseil lié au Duel le plus raté par la salle, sinon au suivant, et ainsi de suite ; sinon, comme en fin de
 * Partie. `gestesDesDuels` : les deux Gestes de chaque Duel, du plus raté au moins raté. Jamais l'un des Conseils
 * récents de cet ordinateur, sauf s'il n'en reste aucun autre (un groupe qui enchaîne les Séances voit autre chose).
 */
export function choisirConseilDeSeance({
  conseils,
  gestesDesDuels,
  recents,
  hasard,
}: {
  conseils: Conseil[]
  gestesDesDuels: [string, string][]
  recents: string[]
  hasard: SourceDeHasard
}): Conseil {
  const nouveaux = conseils.filter((c) => !recents.includes(c.id))
  const possibles = nouveaux.length > 0 ? nouveaux : conseils
  for (const gestes of gestesDesDuels) {
    const lie = possibles.find((c) => c.declencheurs.some((id) => gestes.includes(id)))
    if (lie) return lie
  }
  return choisirConseil({ conseils: possibles, gestesDeLaPartie: [], gestesRates: [], recents: [], hasard })
}
