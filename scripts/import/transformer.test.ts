// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { THEMATIQUES } from '../../src/donnees/referentiel.ts'
import { ALIMENTATION, CAS_PRATIQUES, ELECTROMENAGER, NUMERIQUE, TRANSPORT, USAGE_NUMERIQUE } from './fixtures.ts'
import { construireInstantane, type ReponseEcv } from './transformer.ts'

const thematique = (slug: string) => {
  const t = THEMATIQUES.find((x) => x.slug === slug)
  if (!t) throw new Error(`Thématique inconnue dans le test : ${slug}`)
  return t
}

const importer = (...reponses: [string, ReponseEcv[]][]) =>
  construireInstantane(
    reponses.map(([slug, donnees]) => ({ thematique: thematique(slug), donnees })),
    '2026-11-08',
  )

const equivalent = (slug: string, ...reponses: [string, ReponseEcv[]][]) => {
  const e = importer(...reponses).instantane.equivalents.find((x) => x.slug === slug)
  if (!e) throw new Error(`Équivalent absent de l'Instantané : ${slug}`)
  return e
}

describe("Construction de l'Instantané", () => {
  it("date l'Instantané et cite sa source", () => {
    const { instantane } = importer(['numerique', NUMERIQUE])
    expect(instantane.dateImport).toBe('2026-11-08')
    expect(instantane.source).toBe('ADEME — Impact CO2')
    expect(instantane.api).toBe('https://impactco2.fr/api/v1')
  })

  it('remplace les numéros des étapes par leurs libellés', () => {
    const boeuf = equivalent('boeuf', ['alimentation', ALIMENTATION])
    expect(boeuf.etapes[0]).toEqual({ id: 30, libelle: 'Agriculture', valeur: 27.316666666666666 })
    expect(boeuf.etapes.map((e) => e.libelle)).toEqual([
      'Agriculture',
      'Transformation',
      'Emballage',
      'Transport',
      'Supermarché et distribution',
      'Consommation',
    ])
  })

  it("donne l'unité de la Thématique par défaut", () => {
    expect(equivalent('boeuf', ['alimentation', ALIMENTATION]).unite).toBe('kg')
    expect(equivalent('smartphone', ['numerique', NUMERIQUE]).unite).toBe('unité')
    expect(equivalent('tgv', ['transport', TRANSPORT]).unite).toBe('km parcouru par passager')
  })

  it("donne l'unité propre à un Équivalent quand elle diffère de sa Thématique", () => {
    expect(equivalent('repasavecduboeuf', ['alimentation', ALIMENTATION]).unite).toBe('repas')
  })

  it("garde la valeur totale du cycle de vie, l'usage et la fin de vie", () => {
    const tv = equivalent('television', ['numerique', NUMERIQUE])
    expect(tv.valeur).toBe(369.71185999999994)
    expect(tv.usage).toMatchObject({ parAn: 3.6939825, dureeAns: 8 })
    expect(tv.usage?.total).toBeCloseTo(29.55186, 6)
    expect(tv.finDeVie).toBe(11.9)
  })

  it('conserve une fin de vie négative (émissions évitées par le recyclage)', () => {
    expect(equivalent('lavelinge', ['electromenager', ELECTROMENAGER]).finDeVie).toBe(-44.64)
  })

  it("accepte un Équivalent sans détail, avec une Répartition vide", () => {
    const pny = equivalent('avion-pny', ['caspratiques', CAS_PRATIQUES])
    expect(pny.valeur).toBe(2060)
    expect(pny.etapes).toEqual([])
    expect(pny.usage).toBeUndefined()
  })

  it("nettoie le nom et donne le lien vers la fiche ADEME", () => {
    const tv = equivalent('television', ['numerique', NUMERIQUE])
    expect(tv.nom).toBe('Télévision')
    expect(tv.url).toBe('https://impactco2.fr/outils/numerique/television')
  })

  it('trie les Équivalents par Thématique puis par slug, pour des différences lisibles dans Git', () => {
    const { instantane } = importer(['alimentation', ALIMENTATION], ['numerique', NUMERIQUE])
    expect(instantane.equivalents.map((e) => e.slug)).toEqual([
      'smartphone',
      'television',
      'boeuf',
      'repasavecduboeuf',
    ])
  })

  it("échoue en nommant l'Équivalent si une étape est inconnue", () => {
    const inconnue: ReponseEcv[] = [{ name: 'Mystère', slug: 'mystere', ecv: 1, footprint: 1, footprintDetail: [{ id: 999, value: 1 }] }]
    expect(() => importer(['numerique', inconnue])).toThrow(/mystere.*999/)
  })

  it("signale, sans échouer, une unité à vérifier", () => {
    const { instantane, avertissements } = importer(['usagenumerique', USAGE_NUMERIQUE])
    expect(instantane.equivalents[0].unite).toBeNull()
    expect(avertissements).toContainEqual(expect.stringMatching(/streamingvideo.*unité/))
  })

  it('signale un total incohérent avec la somme de ses étapes', () => {
    const incoherent: ReponseEcv[] = [
      { name: 'Incohérent', slug: 'incoherent', ecv: 10, footprint: 10, footprintDetail: [{ id: 30, value: 4 }] },
    ]
    const { avertissements } = importer(['alimentation', incoherent])
    expect(avertissements).toContainEqual(expect.stringMatching(/incoherent.*10.*4/))
  })

  it('ne signale rien pour des données cohérentes', () => {
    const { avertissements } = importer(
      ['numerique', NUMERIQUE],
      ['alimentation', ALIMENTATION],
      ['electromenager', ELECTROMENAGER],
      ['transport', TRANSPORT],
    )
    expect(avertissements).toEqual([])
  })

  it("ignore un Équivalent présent dans deux Thématiques, en le signalant", () => {
    const { instantane, avertissements } = importer(['numerique', NUMERIQUE], ['electromenager', [...ELECTROMENAGER, NUMERIQUE[0]]])
    expect(instantane.equivalents.filter((e) => e.slug === 'television')).toHaveLength(1)
    expect(avertissements).toContainEqual(expect.stringMatching(/television.*deux fois/))
  })
})
