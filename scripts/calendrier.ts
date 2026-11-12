/**
 * npm run calendrier : prépare les Parties du jour des 365 prochains jours (src/donnees/calendrier.json).
 *
 * Le jour en cours et les jours passés ne changent jamais ; tous les jours suivants sont tirés à nouveau
 * avec le catalogue, les règles, les Duels thématiques et les Coefficients d'équilibrage du moment.
 * Lancé automatiquement après npm run calibrer (donc aussi après npm run import). Un test signale
 * un calendrier désaccordé du catalogue, ou qui couvre moins de 30 jours.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { joursRestants, prolongerCalendrier, type Calendrier } from '../src/domaine/calendrier.ts'
import type { Calibrage } from '../src/domaine/equilibrage.ts'
import { calculerGeste } from '../src/domaine/geste.ts'
import { jourDeParis } from '../src/domaine/jour.ts'
import { DUELS_THEMATIQUES } from '../src/donnees/duels-thematiques.ts'
import { GESTE_CREATION_IA } from '../src/donnees/geste-ia.ts'
import { GESTES } from '../src/donnees/gestes.ts'
import type { Instantane } from '../src/donnees/referentiel.ts'

const chemin = (fichier: string) => fileURLToPath(new URL(`../src/donnees/${fichier}`, import.meta.url))
const lire = <T>(fichier: string) => JSON.parse(readFileSync(chemin(fichier), 'utf8')) as T

const instantane = lire<Instantane>('instantane.json')
const calibrage = lire<Calibrage>('coefficients.json')
// Le catalogue ADEME, plus l'Easter Egg (estimé hors ADEME), comme GESTES_CALCULES dans le jeu.
const gestes = [...GESTES.map((g) => calculerGeste(g, instantane)), GESTE_CREATION_IA]
const existant = existsSync(chemin('calendrier.json')) ? lire<Calendrier>('calendrier.json') : null
const aujourdhui = jourDeParis(new Date())

const calendrier = prolongerCalendrier(existant, aujourdhui, {
  gestes,
  thematiques: DUELS_THEMATIQUES,
  coefficients: calibrage.coefficients,
  empreinte: calibrage.empreinte,
})

// Un jour par ligne : le fichier reste lisible, et une PR montre clairement les jours qui changent.
const lignes = calendrier.jours.map((jour) => `    ${JSON.stringify(jour)}`).join(',\n')
const texte = `{\n  "empreinte": ${JSON.stringify(calendrier.empreinte)},\n  "debut": ${JSON.stringify(calendrier.debut)},\n  "jours": [\n${lignes}\n  ]\n}\n`
writeFileSync(chemin('calendrier.json'), texte, 'utf8')

const figes = existant ? Math.min(existant.jours.length, calendrier.jours.length - joursRestants(calendrier, aujourdhui)) : 0
console.log(`Calendrier des Parties du jour : ${calendrier.jours.length} jours depuis le ${calendrier.debut}.`)
console.log(`  ✓ ${figes} jour(s) passé(s) ou en cours gardé(s) tels quels, ${joursRestants(calendrier, aujourdhui)} jours préparés après aujourd'hui (${aujourdhui}).`)
