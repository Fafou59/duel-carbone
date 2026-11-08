/**
 * npm run import : interroge l'API Impact CO2 de l'ADEME et écrit l'Instantané daté
 * (src/donnees/instantane.json), seule source de données lue par le jeu.
 * Voir docs/adr/0002-instantane-par-script-d-import.md.
 *
 * Si une seule requête échoue, rien n'est écrit : l'Instantané précédent reste intact.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { THEMATIQUES } from '../../src/donnees/referentiel.ts'
import { chargerThematique } from './api.ts'
import { construireInstantane, type ReponseThematique } from './transformer.ts'

const FICHIER = fileURLToPath(new URL('../../src/donnees/instantane.json', import.meta.url))

async function main() {
  const cleApi = process.env.IMPACTCO2_API_KEY || undefined
  console.log(`Import du Référentiel Impact CO2 ${cleApi ? 'avec' : 'sans'} clé d'API…`)

  const reponses: ReponseThematique[] = []
  for (const thematique of THEMATIQUES) {
    const donnees = await chargerThematique(thematique, cleApi)
    console.log(`  ✓ ${thematique.nom} : ${donnees.length} Équivalents`)
    reponses.push({ thematique, donnees })
  }

  const dateImport = new Date().toISOString().slice(0, 10)
  const { instantane, avertissements } = construireInstantane(reponses, dateImport)
  writeFileSync(FICHIER, JSON.stringify(instantane, null, 2) + '\n', 'utf8')

  console.log(`\nInstantané du ${dateImport} écrit : ${instantane.equivalents.length} Équivalents.`)
  if (avertissements.length) {
    console.log(`\n${avertissements.length} avertissement(s) à examiner :`)
    for (const a of avertissements) console.log(`  ⚠ ${a}`)
  }
}

main().catch((erreur: Error) => {
  console.error(`\n✗ Import interrompu : ${erreur.message}`)
  console.error("  L'Instantané précédent n'a pas été modifié.")
  process.exitCode = 1
})
