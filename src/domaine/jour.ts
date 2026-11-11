/**
 * Le jour du Duel Carbone du jour : il change à minuit, heure de Paris, pour tout le monde.
 * Un jour s'écrit « AAAA-MM-JJ » : simple à comparer, à enregistrer et à lire.
 */

/**
 * Le Duel Carbone du jour n° 1. PROVISOIRE : ce sera le jour du lancement public, fixé au ticket #19.
 * D'ici là, les numéros servent aux tests.
 */
export const PREMIER_JOUR = '2026-11-11'

const formatDeParis = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Le jour qu'il est à Paris à cet instant, quel que soit le fuseau horaire de l'appareil (format AAAA-MM-JJ). */
export const jourDeParis = (instant: Date): string => formatDeParis.format(instant)

const UN_JOUR_MS = 86_400_000
const enUTC = (jour: string) => Date.parse(`${jour}T00:00:00Z`)

/** Le jour qui vient n jours après (ou avant, si n est négatif). */
export const decalerJour = (jour: string, n: number): string =>
  new Date(enUTC(jour) + n * UN_JOUR_MS).toISOString().slice(0, 10)

/** Le nombre de jours de `debut` à `fin` (négatif si `fin` est avant). */
export const joursEntre = (debut: string, fin: string): number => Math.round((enUTC(fin) - enUTC(debut)) / UN_JOUR_MS)

/** Le numéro du Duel Carbone du jour : 1 le premier jour, puis un de plus chaque jour. */
export const numeroDuJour = (jour: string): number => joursEntre(PREMIER_JOUR, jour) + 1

const heureDeParis = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/**
 * Les secondes qui restent avant minuit à Paris, c'est-à-dire avant le prochain Duel du jour.
 * (La nuit d'un changement d'heure, le compte peut avoir une heure d'écart : sans conséquence ici.)
 */
export function secondesAvantMinuitAParis(instant: Date): number {
  const [h, m, s] = heureDeParis.format(instant).split(':').map(Number)
  return 86_400 - (h * 3600 + m * 60 + s)
}

/** Une durée en secondes, lisible : « 3 h 05 min 09 s ». */
export function formaterDuree(secondes: number): string {
  const deux = (n: number) => String(n).padStart(2, '0')
  return `${Math.floor(secondes / 3600)} h ${deux(Math.floor((secondes % 3600) / 60))} min ${deux(secondes % 60)} s`
}
