/**
 * npm run empreinte-ia : recompte les jetons consommés par l'IA (Claude Code) pour créer le jeu, et en déduit
 * l'empreinte selon les trois hypothèses de src/donnees/empreinte-ia.ts. Méthode : docs/empreinte-ia.md.
 *
 * Claude Code garde un journal de chaque session (un fichier .jsonl par session) dans ~/.claude/projects/,
 * dans un dossier par répertoire de travail. On lit ceux du projet (le dépôt et ses worktrees). Chaque réponse
 * du modèle y note les jetons lus, mis en mémoire, relus depuis la mémoire et écrits.
 * Le script ne modifie rien : il affiche les chiffres à reporter dans src/donnees/empreinte-ia.ts.
 */
import { createReadStream, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { empreinteDeLaCreation, type Jetons } from '../src/domaine/empreinte-ia.ts'
import { HYPOTHESES } from '../src/donnees/empreinte-ia.ts'

const racine = join(homedir(), '.claude', 'projects')
const dossiers = readdirSync(racine).filter((nom) => /Duel-Carbone/i.test(nom))
const fichiers = dossiers.flatMap((dossier) =>
  readdirSync(join(racine, dossier))
    .filter((nom) => nom.endsWith('.jsonl'))
    .map((nom) => join(racine, dossier, nom)),
)

const jetons: Jetons = { entree: 0, ecritureCache: 0, lectureCache: 0, sortie: 0 }
let appels = 0
let premier = ''
const vus = new Set<string>()
for (const fichier of fichiers) {
  for await (const ligne of createInterface({ input: createReadStream(fichier) })) {
    if (!ligne.includes('"usage"')) continue
    let entree
    try {
      entree = JSON.parse(ligne)
    } catch {
      continue
    }
    const message = entree.message
    if (entree.type !== 'assistant' || !message?.usage || message.model === '<synthetic>') continue
    // Une même réponse peut être écrite sur plusieurs lignes du journal : on la compte une fois.
    const cle = `${message.id}:${entree.requestId ?? ''}`
    if (vus.has(cle)) continue
    vus.add(cle)
    appels++
    if (!premier || entree.timestamp < premier) premier = entree.timestamp
    jetons.entree += message.usage.input_tokens ?? 0
    jetons.ecritureCache += message.usage.cache_creation_input_tokens ?? 0
    jetons.lectureCache += message.usage.cache_read_input_tokens ?? 0
    jetons.sortie += message.usage.output_tokens ?? 0
  }
}

console.log(`${fichiers.length} journaux de session, ${appels} appels au modèle depuis le ${premier.slice(0, 10)}.`)
console.log('Jetons :', jetons)
for (const [nom, hypothese] of Object.entries(HYPOTHESES)) {
  const { energieKwh, kgCo2e } = empreinteDeLaCreation(jetons, hypothese)
  console.log(`Hypothèse ${nom} : ${energieKwh.toFixed(1)} kWh, ${kgCo2e.toFixed(1)} kg CO2e`)
}
