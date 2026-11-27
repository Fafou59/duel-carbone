/**
 * La petite phrase du téléphone au classement intermédiaire d'une Séance (PRD docs/prd-mode-animation.md, règle
 * « Phrases du téléphone ») : 9 phrases par catégorie de place, une pour chaque classement intermédiaire (après les
 * Duels 1 à 9).
 *
 * Pas de hasard : la phrase dépend de la catégorie de place et du moment de la Séance. Chaque classement a ainsi sa
 * phrase à lui, écrite pour son moment (le tout début, l'arrivée des Duels moyens puis difficiles, le Duel ultime
 * qui reste), et un Participant ne lit jamais deux fois la même : deux classements n'ont jamais la même phrase (deux
 * catégories peuvent partager une phrase au même classement, puisque chacun n'en lit qu'une).
 *
 * Les phrases tutoient, ne disent rien qu'on ne sache (ni écart de points, ni nombre de joueurs) et s'écrivent sans
 * accord de genre (« en tête », pas « seul » ni « bien placée ») : on ne sait rien du Participant. Elles suivent les
 * Difficultés d'une Partie (domaine/difficulte.ts) : Duels 1 à 3 faciles, 4 à 6 moyens, 7 à 9 difficiles, 10 ultime.
 */
import { NOMBRE_DE_DUELS } from './partie.ts'

export type CategorieDePlace = 'seul-en-tete' | 'en-tete-a-egalite' | 'podium' | 'milieu' | 'dernier'

/**
 * Où se trouve le Participant au Classement : sa place par palier de score (`rang`, ex aequo compris), combien de
 * Participants ont un moins bon score (`derriere`), et combien sont dans la Séance (`participants`).
 */
export type PlaceAuClassement = { rang: number; exAequo: boolean; derriere: number; participants: number }

/**
 * Les phrases du podium ne parlent que dans une salle plus grande que le podium : à 3, tout le monde y serait, et la
 * phrase ne voudrait plus rien dire.
 */
export const PARTICIPANTS_MIN_POUR_LE_PODIUM = 4

/**
 * La catégorie d'une place, dans cet ordre (PRD) :
 * - en tête (1er palier), seul ou à égalité ;
 * - dernier (dernier palier, ex aequo compris), avant le podium : dans une petite salle, le dernier palier peut être
 *   le 2e ou le 3e, et ses phrases d'encouragement lui vont mieux ;
 * - podium (2e et 3e paliers), à partir de 4 Participants ;
 * - milieu, tous les autres.
 */
export function categorieDePlace({ rang, exAequo, derriere, participants }: PlaceAuClassement): CategorieDePlace {
  if (rang === 1) return exAequo ? 'en-tete-a-egalite' : 'seul-en-tete'
  if (derriere === 0) return 'dernier'
  if (rang <= 3 && participants >= PARTICIPANTS_MIN_POUR_LE_PODIUM) return 'podium'
  return 'milieu'
}

/** Combien de classements intermédiaires dans une Séance : après chaque Duel, sauf le dernier. */
export const CLASSEMENTS_INTERMEDIAIRES = NOMBRE_DE_DUELS - 1

/** Les phrases de chaque catégorie, dans l'ordre des classements : la première après le Duel 1, la dernière après le Duel 9. */
export const PHRASES_DE_PLACE: Record<CategorieDePlace, readonly string[]> = {
  'seul-en-tete': [
    'Premier Duel, première place : joli départ !',
    'Tu mènes toujours. Garde le rythme !',
    'Les Duels faciles sont derrière toi, et tu mènes : place aux Duels moyens.',
    'Toujours en tête. Toute la salle te court après !',
    'En tête à mi-parcours : belle maîtrise des ordres de grandeur.',
    'Tu mènes, mais les Duels difficiles arrivent : garde la tête froide.',
    'Toujours devant : les Duels difficiles ne te font pas peur !',
    'Plus que deux Duels à tenir en tête. Ne lâche rien !',
    'Un seul Duel te sépare de la victoire : le Duel ultime !',
  ],
  'en-tete-a-egalite': [
    'Premier Duel, et vous êtes plusieurs en tête : tout commence !',
    'En tête, mais en bonne compagnie.',
    'Les Duels faciles sont passés : à toi de te détacher sur les moyens.',
    'Égalité au sommet ! Qui fera la différence ?',
    'À mi-parcours, la première place se partage encore.',
    'Coude à coude en tête : les Duels difficiles vont trancher.',
    'Toujours à égalité en tête : chaque réponse compte.',
    'Plus que deux Duels pour te détacher. C’est le moment !',
    'Égalité en tête avant le Duel ultime : tout se joue maintenant !',
  ],
  podium: [
    'Premier Duel, et déjà sur le podium !',
    'Sur le podium. Ne lâche rien !',
    'Les Duels faciles sont passés, et tu es sur le podium.',
    'Le podium te va bien. La tête n’est pas loin !',
    'Sur le podium à mi-parcours : la première place est à portée.',
    'Les Duels difficiles arrivent : c’est là que le podium se joue.',
    'Tu tiens ta place sur le podium. Garde le rythme !',
    'Plus que deux Duels : ta médaille est en jeu !',
    'Sur le podium avant le Duel ultime : tiens bon !',
  ],
  milieu: [
    'Ce n’est que le premier Duel : tout reste à jouer !',
    'Les chiffres surprennent tout le monde : accroche-toi !',
    'Les Duels faciles sont passés : la remontée commence maintenant.',
    'Chaque bonne réponse te fait gagner des places.',
    'Mi-parcours : une bonne série et tu remontes.',
    'Les Duels difficiles arrivent : de belles places à gagner.',
    'Rien n’est joué : une bonne réponse peut tout changer.',
    'Plus que deux Duels pour grimper au Classement !',
    'Le Duel ultime peut encore te faire gagner des places !',
  ],
  dernier: [
    'Ce n’est que le premier Duel : tout reste à jouer !',
    'Pas de panique : tout peut encore changer.',
    'Les ordres de grandeur, ça s’apprivoise : place aux Duels moyens.',
    'C’est en se trompant qu’on retient le mieux les ordres de grandeur.',
    'Mi-parcours : prépare ton grand retour !',
    'Courage : les Duels difficiles rebattent souvent les cartes.',
    'Tu ne pouvais pas deviner… mais maintenant, tu sais !',
    'Plus que deux Duels : chaque bonne réponse compte !',
    'Dernier Duel à venir : finis en beauté !',
  ],
}

/**
 * La phrase du classement intermédiaire qui suit le Duel `index` (0 pour le Duel 1, 8 pour le Duel 9), pour cette
 * catégorie de place. Hors de ces bornes (il n'y a pas de classement intermédiaire après le Duel 10), la plus
 * proche.
 */
export function phraseDePlace(categorie: CategorieDePlace, index: number): string {
  const phrases = PHRASES_DE_PLACE[categorie]
  return phrases[Math.min(phrases.length - 1, Math.max(0, index))]
}
