/**
 * Le calendrier des Parties du jour : les 10 Duels de chaque jour, tirés à l'avance par un script
 * (npm run calendrier) et enregistrés dans src/donnees/calendrier.json. Tout le monde lit le même
 * fichier : deux appareils obtiennent donc la même Partie le même jour, sans serveur.
 *
 * Pourquoi à l'avance, plutôt que tirer la Partie à l'ouverture du jeu avec la date pour graine ?
 * Parce que le catalogue et les règles évoluent : tirée à la volée, la Partie du jour changerait
 * en cours de journée à chaque mise à jour. Ici, le jour en cours et les jours passés ne bougent jamais.
 */
import { cleDePaire, type Duel } from './duel.ts'
import { genererPartie, type Coefficients } from './generateur.ts'
import type { GesteCalcule } from './geste.ts'
import { fnv1a } from './hachage.ts'
import { hasardReproductible } from './hasard.ts'
import { decalerJour, joursEntre } from './jour.ts'
import type { DuelDePartie } from './partie.ts'
import { doitForcerUnDuelThematique, redigerTexte, type DuelThematique } from './thematiques.ts'

/**
 * Le fichier du calendrier. Chaque jour est une liste de 10 Duels écrits « idA>idB »
 * (dans l'ordre d'affichage) : court à enregistrer, et lisible par un humain.
 */
export type Calendrier = {
  /** L'empreinte du tirage (catalogue, règles, Duels thématiques) au moment de la dernière génération. */
  empreinte: string
  /** Le premier jour du calendrier (AAAA-MM-JJ). */
  debut: string
  jours: string[][]
}

type Sources = {
  gestes: GesteCalcule[]
  thematiques: DuelThematique[]
  coefficients: Coefficients
  empreinte: string
  /** Nombre de jours à préparer après aujourd'hui (365 en temps normal). */
  horizon?: number
}

/** Les jours récents dont on tient compte : pas deux fois le même Duel, et la garantie des Duels thématiques. */
const MEMOIRE_DU_CALENDRIER = 3

/**
 * Garde le jour en cours et les jours passés tels quels, et tire à nouveau tous les jours suivants,
 * jusqu'à `horizon` jours après aujourd'hui. Fonction pure et reproductible : chaque jour a sa propre
 * source de hasard, tirée de sa date.
 */
export function prolongerCalendrier(existant: Calendrier | null, aujourdhui: string, sources: Sources): Calendrier {
  const debut = existant?.debut ?? aujourdhui
  const figes = existant ? existant.jours.slice(0, Math.max(0, joursEntre(debut, aujourdhui) + 1)) : []
  const jours = [...figes]
  const dernier = decalerJour(aujourdhui, sources.horizon ?? 365)
  for (let jour = decalerJour(debut, jours.length); joursEntre(jour, dernier) >= 0; jour = decalerJour(jour, 1)) {
    const recentes = jours.slice(-MEMOIRE_DU_CALENDRIER).map(cles)
    const duels = genererPartie({
      gestes: sources.gestes,
      thematiques: sources.thematiques,
      coefficients: sources.coefficients,
      pairesRecentes: new Set(recentes.flat()),
      forcerThematique: doitForcerUnDuelThematique(recentes, sources.thematiques),
      hasard: hasardReproductible(Number.parseInt(fnv1a(jour), 16)),
    })
    jours.push(duels.map((d) => `${d.a.id}>${d.b.id}`))
  }
  return { empreinte: sources.empreinte, debut, jours }
}

/** Combien de jours le calendrier couvre encore après aujourd'hui. */
export const joursRestants = (calendrier: Calendrier, aujourdhui: string): number =>
  joursEntre(aujourdhui, decalerJour(calendrier.debut, calendrier.jours.length - 1))

/**
 * La Partie d'un jour, prête à jouer. Si le calendrier est épuisé, il reboucle sur son premier jour
 * (garde-fou : la CI signale bien avant qu'il reste moins de 30 jours).
 */
export function partieDuJour(
  calendrier: Calendrier,
  jour: string,
  gestes: GesteCalcule[],
  thematiques: DuelThematique[],
): DuelDePartie[] {
  const n = calendrier.jours.length
  const index = ((joursEntre(calendrier.debut, jour) % n) + n) % n
  try {
    return duelsDepuisCodes(calendrier.jours[index], gestes, thematiques)
  } catch (erreur) {
    throw new Error(`Calendrier du ${jour} : ${(erreur as Error).message} (lance npm run calendrier).`)
  }
}

/**
 * Une Partie reconstruite depuis ses codes « a>b » (ceux du calendrier, ou ceux retenus par la mémoire
 * pour la Partie du jour réellement jouée), avec les textes de ses Duels thématiques.
 */
export function duelsDepuisCodes(codes: string[], gestes: GesteCalcule[], thematiques: DuelThematique[]): DuelDePartie[] {
  const parCle = new Map(thematiques.map((t) => [cleDePaire(t.a, t.b), t]))
  const geste = (id: string) => {
    const g = gestes.find((x) => x.id === id)
    if (!g) throw new Error(`Geste « ${id} » absent du catalogue`)
    return g
  }
  return codes.map((code) => {
    const [a, b] = code.split('>').map(geste)
    const duel: Duel = { a, b }
    const t = parCle.get(cleDePaire(a.id, b.id))
    return t ? { ...duel, thematique: { titre: t.titre, accroche: t.accroche, texte: redigerTexte(t, gestes) } } : duel
  })
}

const cles = (jour: string[]): string[] => jour.map((code) => cleDePaire(...(code.split('>') as [string, string])))
