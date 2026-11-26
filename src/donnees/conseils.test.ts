import { describe, expect, it } from 'vitest'
import { chiffresDuConseil, redigerConseil, valeursDe } from '../domaine/conseils.ts'
import { CONSEILS } from './conseils.ts'
import { GESTES } from './gestes.ts'
import { INSTANTANE } from './index.ts'

const valeurs = valeursDe(INSTANTANE)

describe('Catalogue des Conseils', () => {
  it('compte les 28 Conseils validés par Fabien (issues 88 et 126), chacun avec son identifiant', () => {
    expect(CONSEILS).toHaveLength(28)
    expect(new Set(CONSEILS.map((c) => c.id)).size).toBe(28)
  })

  it('n’a que des Gestes déclencheurs du catalogue', () => {
    const catalogue = new Set(GESTES.map((g) => g.id))
    const inconnus = CONSEILS.flatMap((c) => c.declencheurs.filter((id) => !catalogue.has(id)).map((id) => `${c.id} : ${id}`))
    expect(inconnus).toEqual([])
  })

  it('a au moins un Geste déclencheur, tirable au hasard, par Conseil', () => {
    const tirables = new Set(GESTES.filter((g) => !g.seulementEnDuelThematique).map((g) => g.id))
    const sansDeclencheur = CONSEILS.filter((c) => !c.declencheurs.some((id) => tirables.has(id))).map((c) => c.id)
    expect(sansDeclencheur).toEqual([])
  })

  it('renvoie vers une page de l’ADEME : une action Nos Gestes Climat ou une page d’Impact CO2', () => {
    for (const c of CONSEILS) {
      expect(c.lien.url, c.id).toMatch(/^https:\/\/(nosgestesclimat\.fr\/actions\/|impactco2\.fr\/)/)
      expect(c.lien.titre, c.id).not.toBe('')
    }
  })

  it('ne renvoie vers la FAQ d’Impact CO2 que faute d’action Nos Gestes Climat proche (issue 126)', () => {
    // La FAQ n'a pas de lien direct vers chaque question : une action de Nos Gestes Climat est toujours préférée.
    const versLaFaq = CONSEILS.filter((c) => c.lien.url.startsWith('https://impactco2.fr/doc/')).map((c) => c.id)
    expect(versLaFaq).toEqual(['boisson-soja', 'teletravail'])
  })

  it('calcule chaque chiffre du texte, et seulement ceux-là : aucun repère orphelin, aucun calcul inutilisé', () => {
    for (const c of CONSEILS) {
      const reperes = [...c.texte.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
      expect(reperes, c.id).toEqual(Object.keys(c.chiffres).sort())
      expect(redigerConseil(c, valeurs), c.id).not.toMatch(/[{}]/)
    }
  })

  it('n’écrit aucun chiffre ADEME en dur : hors repères, seuls restent les hypothèses du texte', () => {
    // Les nombres admis hors repères : quantités, distances, fréquences et durées choisies pour le Conseil.
    const HYPOTHESES = new Set(['1', '2', '3', '4', '10', '30', '40', '100', '150', '220', '400', '1,5', '2050'])
    for (const c of CONSEILS) {
      const nombres = c.texte.replace(/\{\w+\}/g, '').match(/\d+(?:,\d+)?/g) ?? []
      expect(nombres.filter((n) => !HYPOTHESES.has(n)), c.id).toEqual([])
    }
  })
})

describe('Les chiffres des Conseils restent justes après un import ADEME', () => {
  it('a été relu depuis le dernier changement de ses chiffres', () => {
    const aRelire = CONSEILS.filter((c) => JSON.stringify(chiffresDuConseil(c, valeurs)) !== JSON.stringify(c.relu)).map(
      (c) =>
        `${c.id} : relis le texte (« ${redigerConseil(c, valeurs)} »), puis écris relu: ${JSON.stringify(chiffresDuConseil(c, valeurs))}`,
    )
    expect(aRelire, 'Conseils à relire (src/donnees/conseils.ts)').toEqual([])
  })
})
