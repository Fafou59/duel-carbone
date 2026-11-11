/**
 * npm run analyse:paires : le catalogue offre-t-il assez de paires à chaque Duel, et tous les Gestes sortent-ils ?
 * 1. Compte les paires de chaque tranche de la courbe de difficulté (et celles que le tirage écarte).
 * 2. Simule 1 000 Parties d'un joueur régulier pour voir combien de fois le générateur assouplit les règles.
 * 3. Mesure la diversité : à quelle fréquence chaque Geste apparaît, avec les Coefficients d'équilibrage.
 * Outil d'aide pour enrichir le catalogue ou retoucher les règles.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { difficulteAttendue } from '../src/domaine/difficulte.ts'
import { rapport } from '../src/domaine/duel.ts'
import {
  empreinteDuTirage,
  frequencesDApparition,
  indicateursDeDiversite,
  type Calibrage,
} from '../src/domaine/equilibrage.ts'
import {
  cleDePaire,
  estCombinaisonInterdite,
  genererPartie,
  pairesJouables,
  sontDeParcoursDifferents,
  type NiveauDeTirage,
} from '../src/domaine/generateur.ts'
import { calculerGeste } from '../src/domaine/geste.ts'
import { hasardReproductible } from '../src/domaine/hasard.ts'
import { REGLES } from '../src/domaine/regles.ts'
import { DUELS_THEMATIQUES } from '../src/donnees/duels-thematiques.ts'
import { GESTES } from '../src/donnees/gestes.ts'
import type { Instantane } from '../src/donnees/referentiel.ts'
import { PARTIES_MEMORISEES } from '../src/navigateur/taille-memoire.ts'

const lire = <T>(fichier: string) => JSON.parse(readFileSync(fileURLToPath(new URL(fichier, import.meta.url)), 'utf8')) as T
const instantane = lire<Instantane>('../src/donnees/instantane.json')
const calibrage = lire<Calibrage>('../src/donnees/coefficients.json')
const gestes = GESTES.map((g) => calculerGeste(g, instantane))
const nombre = (n: number) => String(n).padStart(5)

// 1. Paires par Duel, telles que le générateur les voit (mêmes fonctions : les deux ne peuvent pas diverger)
const jouables = pairesJouables(gestes)
const tirables = gestes.filter((g) => !g.seulementEnDuelThematique)
let interdites = 0
let parcoursDifferents = 0
let sousLePlancher = 0
for (let i = 0; i < tirables.length; i++) {
  for (let j = i + 1; j < tirables.length; j++) {
    const duel = { a: tirables[i], b: tirables[j] }
    if (estCombinaisonInterdite(duel)) interdites++
    else if (sontDeParcoursDifferents(duel)) parcoursDifferents++
    else if (rapport(duel) < REGLES.plancher) sousLePlancher++
  }
}
const total = (gestes.length * (gestes.length - 1)) / 2
console.log(`${gestes.length} Gestes (dont ${gestes.length - tirables.length} réservé(s) aux Duels thématiques), ${total} paires possibles :`)
REGLES.tranchesParDuel.forEach(({ min, max }, i) => {
  const n = jouables.filter((c) => c.rapport >= min && c.rapport < max).length
  console.log(`  Duel ${String(i + 1).padStart(2)} (${difficulteAttendue(i).padEnd(9)}) ×${min} à ×${max}`.padEnd(42) + `${nombre(n)} paires`)
})
console.log(`  ${`au-delà du plafond (×${REGLES.plafond})`.padEnd(40)}${nombre(jouables.filter((c) => c.rapport >= REGLES.plafond).length)} paires`)
console.log(`  ${'combinaisons interdites'.padEnd(40)}${nombre(interdites)} paires`)
console.log(`  ${'parcours différents'.padEnd(40)}${nombre(parcoursDifferents)} paires`)
console.log(`  ${'sous le plancher'.padEnd(40)}${nombre(sousLePlancher)} paires`)

// 2. Simulation de 1 000 Parties d'un joueur régulier (qui garde en mémoire ses dernières Parties)
const PARTIES = 1000
const niveaux: Record<NiveauDeTirage, number[]> = {
  regle: Array(REGLES.nombreDeDuels).fill(0),
  'tranche-voisine': Array(REGLES.nombreDeDuels).fill(0),
  'paire-recente': Array(REGLES.nombreDeDuels).fill(0),
  thematique: Array(REGLES.nombreDeDuels).fill(0),
}
const hasard = hasardReproductible(1)
const historique: string[][] = []
for (let p = 0; p < PARTIES; p++) {
  const pairesRecentes = new Set(historique.slice(-PARTIES_MEMORISEES).flat())
  const duels = genererPartie({ gestes, thematiques: DUELS_THEMATIQUES, pairesRecentes, coefficients: calibrage.coefficients, hasard })
  historique.push(duels.map((d) => cleDePaire(d.a.id, d.b.id)))
  duels.forEach((d, i) => niveaux[d.niveau][i]++)
}
const part = (n: number) => `${String(Math.round((n / PARTIES) * 100)).padStart(3)} %`
console.log(`\nSur ${PARTIES} Parties simulées : Duels thématiques, Duels tirés hors de leur tranche (« tranche voisine ») ou parmi des paires récentes :`)
for (let i = 0; i < REGLES.nombreDeDuels; i++) {
  console.log(
    `  Duel ${String(i + 1).padStart(2)} : thématique ${part(niveaux.thematique[i])} · hors tranche ${part(niveaux['tranche-voisine'][i])} · paire récente ${part(niveaux['paire-recente'][i])}`,
  )
}
const avecThematique = niveaux.thematique.reduce((s, n) => s + n, 0)
console.log(`  Parties avec un Duel thématique : ${part(avecThematique)} (règle : ${REGLES.probabiliteDuelThematique * 100} %)`)

// 3. Diversité des Gestes
const aJour = calibrage.empreinte === empreinteDuTirage(gestes, DUELS_THEMATIQUES)
console.log(`\nDiversité (2 000 Parties simulées) — coefficients ${aJour ? 'à jour' : 'PÉRIMÉS : lance npm run calibrer'} :`)
const pourcent = (x: number) => `${(x * 100).toFixed(1)} %`
for (const [nom, coefficients] of [
  ['sans coefficient', {}],
  ['avec coefficients', calibrage.coefficients],
] as const) {
  const d = indicateursDeDiversite(
    frequencesDApparition(gestes, {
      coefficients,
      parties: 2000,
      partiesMemorisees: PARTIES_MEMORISEES,
      graine: 2026,
      thematiques: DUELS_THEMATIQUES,
    }),
  )
  console.log(
    `  ${nom.padEnd(18)} moins vu : ${d.moinsVu.id} ${pourcent(d.moinsVu.frequence)} (${Math.round((d.moinsVu.frequence / d.moyenne) * 100)} % de la moyenne, seuil 80 %)` +
      ` · plus vu : ${d.plusVu.id} ${pourcent(d.plusVu.frequence)} · moyenne ${pourcent(d.moyenne)} · écart-type ${(d.ecartType * 100).toFixed(1)}`,
  )
}
