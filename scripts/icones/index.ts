/**
 * npm run icones : fabrique l'icône de chaque Geste dans public/icones/<identifiant du Geste>.svg.
 *
 * - Les icônes officielles (officielles.ts) sont téléchargées telles quelles depuis Fluent Emoji (Microsoft, MIT).
 * - Les icônes maison (dessins.ts) sont dessinées ici, parfois à partir de morceaux d'icônes officielles.
 *
 * À relancer après l'ajout d'un Geste (après lui avoir choisi une icône dans l'un des deux fichiers).
 * Un test vérifie que chaque Geste du catalogue a bien son fichier.
 *
 * Les icônes sont des fichiers séparés, servis à part (et non regroupés dans le code du jeu) :
 * un Duel ne télécharge que ses deux icônes, d'environ 1 Ko chacune.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dessiner } from './dessins.ts'
import { OFFICIELLES } from './officielles.ts'

/** Version figée de Fluent Emoji (un commit précis) : relancer le script donne toujours les mêmes fichiers. */
const VERSION_FLUENT = '1ffb34c752ecf5d402f04cfb4b392c77f57c54bc'
const DOSSIER = fileURLToPath(new URL('../../public/icones/', import.meta.url))

const adresse = (nom: string) =>
  `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@${VERSION_FLUENT}/assets/${encodeURIComponent(nom)}/Flat/${nom.toLowerCase().replaceAll(' ', '_')}_flat.svg`

async function telecharger(nom: string): Promise<string> {
  const reponse = await fetch(adresse(nom))
  if (!reponse.ok) throw new Error(`Icône Fluent « ${nom} » introuvable (${reponse.status}) : ${adresse(nom)}`)
  // Fins de ligne Unix, comme le reste du dépôt.
  return (await reponse.text()).replaceAll('\r\n', '\n')
}

// Un Geste a une seule icône : officielle ou maison, jamais les deux.
const dessinsAVide = dessiner(() => '')
const enDouble = Object.keys(OFFICIELLES).filter((id) => dessinsAVide.has(id))
if (enDouble.length > 0) throw new Error(`Icône à la fois officielle et maison : ${enDouble.join(', ')}.`)

// Premier passage « à blanc » : on note les icônes officielles dont les dessins ont besoin comme pièces détachées.
const pieces = new Set<string>()
dessiner((nom) => {
  pieces.add(nom)
  return ''
})

const noms = [...new Set([...Object.values(OFFICIELLES), ...pieces])]
console.log(`Téléchargement de ${noms.length} icônes Fluent Emoji…`)
const fluent = new Map(await Promise.all(noms.map(async (nom) => [nom, await telecharger(nom)] as const)))
const interieur = (nom: string) => {
  const contenu = fluent.get(nom)?.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1]
  if (contenu === undefined) throw new Error(`Icône Fluent « ${nom} » illisible.`)
  return contenu.trim()
}

// On repart d'un dossier propre (les anciennes icônes d'un Geste supprimé disparaissent), en gardant la licence.
mkdirSync(DOSSIER, { recursive: true })
for (const fichier of readdirSync(DOSSIER)) if (fichier.endsWith('.svg')) rmSync(DOSSIER + fichier)

for (const [id, nom] of Object.entries(OFFICIELLES)) writeFileSync(`${DOSSIER}${id}.svg`, fluent.get(nom)!)
const dessins = dessiner(interieur)
for (const [id, svg] of dessins) writeFileSync(`${DOSSIER}${id}.svg`, svg)

console.log(`${Object.keys(OFFICIELLES).length} icônes officielles et ${dessins.size} icônes maison écrites dans public/icones/.`)
