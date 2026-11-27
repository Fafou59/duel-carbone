/**
 * La petite phrase du téléphone au classement intermédiaire d'une Séance (PRD docs/prd-mode-animation.md, règle
 * « Phrases du téléphone ») : 10 phrases par catégorie de place, tirées sans répétition au cours d'une Séance.
 *
 * Une Séance compte au plus 9 classements intermédiaires (après les Duels 1 à 9) : avec 10 phrases par catégorie,
 * un Participant qui resterait toute la Séance dans la même catégorie ne lit jamais deux fois la même phrase.
 *
 * Les phrases tutoient, ne disent rien qu'on ne sache (ni écart de points, ni nombre de joueurs) et s'écrivent sans
 * accord de genre (« en tête », pas « seul » ni « bien placée ») : on ne sait rien du Participant.
 *
 * Fonctions pures : le hasard est injecté, comme pour le tirage des Duels.
 */
import type { SourceDeHasard } from './hasard.ts'

export type CategorieDePlace = 'seul-en-tete' | 'en-tete-a-egalite' | 'podium' | 'top-10' | 'milieu' | 'dernier'

/**
 * Où se trouve le Participant au Classement : sa place par palier de score (`rang`, ex aequo compris), et combien
 * de Participants ont un meilleur score (`devant`) ou un moins bon (`derriere`).
 */
export type PlaceAuClassement = { rang: number; exAequo: boolean; devant: number; derriere: number }

/**
 * La catégorie d'une place. Le podium (les trois premiers paliers, ceux des médailles) passe avant « dernier » :
 * dans une petite salle, le deuxième palier peut être le dernier, et il mérite alors sa médaille d'argent.
 * Le top 10 compte les Participants devant soi, comme les 10 lignes de l'écran projeté.
 */
export function categorieDePlace({ rang, exAequo, devant, derriere }: PlaceAuClassement): CategorieDePlace {
  if (rang === 1) return exAequo ? 'en-tete-a-egalite' : 'seul-en-tete'
  if (rang <= 3) return 'podium'
  if (derriere === 0) return 'dernier'
  if (devant < 10) return 'top-10'
  return 'milieu'
}

export const PHRASES_DE_PLACE: Record<CategorieDePlace, readonly string[]> = {
  'seul-en-tete': [
    'Tu mènes la Séance ! Garde la tête froide.',
    'Personne ne fait mieux que toi pour l’instant.',
    'En tête, et toute la salle te court après.',
    'La première place est à toi… jusqu’au prochain Duel ?',
    'Tu donnes le rythme : continue comme ça !',
    'Tu as une longueur d’avance. Ne la lâche pas !',
    'Le haut du Classement porte ton nom.',
    'Tu tiens la tête : chaque Duel compte pour la garder.',
    'Belle maîtrise des ordres de grandeur : tu mènes !',
    'Toute la salle regarde vers toi. Pas de pression !',
  ],
  'en-tete-a-egalite': [
    'En tête, mais en bonne compagnie.',
    'Tu partages la première place : le prochain Duel peut tout changer.',
    'Égalité au sommet ! Qui fera la différence ?',
    'Première place ex aequo : à toi de te détacher.',
    'Le sommet est partagé. Plus pour longtemps ?',
    'Vous êtes plusieurs en tête : chaque réponse compte.',
    'Coude à coude pour la première place !',
    'En tête à égalité : garde ton sang-froid.',
    'La première marche est encombrée : fais-toi de la place !',
    'Tu es dans le groupe de tête. Tiens bon !',
  ],
  podium: [
    'Sur le podium. Ne lâche rien !',
    'Une médaille se profile : continue !',
    'Le podium te va bien.',
    'Tu es sur le podium : la tête n’est pas loin.',
    'Encore un effort et la première place est à portée.',
    'Belle place sur le podium !',
    'Le podium, c’est bien ; le sommet, c’est mieux ?',
    'Tu tiens ta place sur le podium. Garde le rythme !',
    'Les premiers peuvent encore trembler !',
    'Sur le podium : les Duels les plus durs arrivent, tiens bon !',
  ],
  'top-10': [
    'Dans le top 10 : le podium n’est pas loin.',
    'Top 10 ! Le podium te tend les bras.',
    'Le podium est à portée de quelques bonnes réponses.',
    'Tu joues dans la cour des grands : top 10 !',
    'Top 10 : encore un petit effort pour une médaille.',
    'Tu es dans le haut du Classement. Continue !',
    'Dans le top 10, et les Duels les plus durs arrivent.',
    'Top 10 ! Chaque bonne réponse peut te faire grimper.',
    'Le podium te regarde. Va le chercher !',
    'Bonne place ! Les ordres de grandeur commencent à rentrer.',
  ],
  milieu: [
    'Encore quelques Duels pour grimper au Classement.',
    'Tout reste possible : les Duels les plus difficiles arrivent.',
    'Le milieu du peloton, c’est le meilleur endroit pour attaquer !',
    'Chaque bonne réponse te fait gagner des places.',
    'Les chiffres surprennent tout le monde : accroche-toi !',
    'Rien n’est joué : une bonne série et tu remontes.',
    'Tu es dans la course. Le prochain Duel est pour toi ?',
    'Une bonne réponse peut tout changer.',
    'Fie-toi aux ordres de grandeur… et à ton instinct !',
    'Un Duel à la fois : la remontée commence maintenant.',
  ],
  dernier: [
    'Pas de panique : tout peut encore changer.',
    'Les chiffres surprennent souvent : le prochain Duel est le bon !',
    'La remontée commence maintenant !',
    'C’est en se trompant qu’on retient le mieux les ordres de grandeur.',
    'Les ordres de grandeur, ça s’apprivoise : continue !',
    'Rien n’est perdu : une bonne réponse et tu remontes.',
    'Prépare ton grand retour !',
    'Courage ! Chaque Duel est une nouvelle chance.',
    'Tu ne pouvais pas deviner… mais maintenant, tu sais !',
    'Ici, on joue surtout pour apprendre : et tu apprends beaucoup !',
  ],
}

/**
 * Une phrase de la catégorie, tirée au hasard parmi celles que le Participant n'a pas encore lues dans cette Séance
 * (`dejaLues`). Si elles y sont toutes passées (impossible avec 9 classements, mais on ne plante pas), on reprend
 * parmi toutes.
 */
export function tirerUnePhrase(categorie: CategorieDePlace, dejaLues: readonly string[], hasard: SourceDeHasard): string {
  const toutes = PHRASES_DE_PLACE[categorie]
  const nouvelles = toutes.filter((phrase) => !dejaLues.includes(phrase))
  const possibles = nouvelles.length > 0 ? nouvelles : toutes
  return possibles[Math.min(possibles.length - 1, Math.floor(hasard() * possibles.length))]
}
