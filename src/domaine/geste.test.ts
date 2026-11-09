import { describe, expect, it } from 'vitest'
import type { Instantane } from '../donnees/referentiel.ts'
import { calculerGeste, lignesRepartition, validerCatalogue, type Geste } from './geste.ts'

// Un petit Instantané écrit à la main, avec des valeurs réelles de l'ADEME (2026-11-08).
const INSTANTANE: Instantane = {
  source: 'ADEME — Impact CO2',
  api: 'https://impactco2.fr/api/v1',
  dateImport: '2026-11-08',
  equivalents: [
    {
      slug: 'boeuf',
      nom: 'Boeuf',
      thematique: 'alimentation',
      unite: 'kg',
      valeur: 28.00917,
      etapes: [
        { id: 30, libelle: 'Agriculture', valeur: 27.316667 },
        { id: 33, libelle: 'Transport', valeur: 0.692503 },
      ],
      url: 'https://impactco2.fr/outils/alimentation/boeuf',
    },
    {
      slug: 'lavelinge',
      nom: 'Lave-linge',
      thematique: 'electromenager',
      unite: 'unité',
      valeur: 513.42,
      etapes: [
        { id: 1, libelle: 'Matières premières', valeur: 191 },
        { id: 2, libelle: 'Approvisionnement', valeur: 12.2 },
        { id: 3, libelle: 'Mise en forme', valeur: 47.6 },
        { id: 4, libelle: 'Assemblage et distribution', valeur: 90.3 },
      ],
      usage: { parAn: 18.08, dureeAns: 12, total: 216.96 },
      finDeVie: -44.64,
      url: 'https://impactco2.fr/outils/electromenager/lavelinge',
    },
    {
      slug: 'avion-pny',
      nom: 'A/R Paris - New-York en avion',
      thematique: 'caspratiques',
      unite: 'unité',
      valeur: 2060,
      etapes: [],
      url: 'https://impactco2.fr/outils/caspratiques/avion-pny',
    },
    {
      slug: 'marche',
      nom: 'Marche',
      thematique: 'transport',
      unite: 'km parcouru par passager',
      valeur: 0,
      etapes: [],
      url: 'https://impactco2.fr/outils/transport/marche',
    },
    {
      slug: 'streamingvideo',
      nom: 'Streaming vidéo',
      thematique: 'usagenumerique',
      unite: null,
      valeur: 0.064,
      etapes: [],
      url: 'https://impactco2.fr/outils/usagenumerique/streamingvideo',
    },
  ],
}

const geste = (champs: Partial<Geste> = {}): Geste => ({
  id: 'steak',
  titre: 'Manger un steak de bœuf',
  sousTitre: '120 g',
  equivalent: 'boeuf',
  quantite: 0.12,
  justification: 'Portion courante.',
  nature: 'aliment',
  ...champs,
})

describe("Calcul d'un Geste (Équivalent × Quantité)", () => {
  it('multiplie la valeur de l’Équivalent par la Quantité : un steak de 120 g ≈ 3,36 kg CO2e', () => {
    expect(calculerGeste(geste(), INSTANTANE).empreinte).toBeCloseTo(3.361, 3)
  })

  it('met chaque étape de la Répartition à la même échelle', () => {
    const steak = calculerGeste(geste(), INSTANTANE)
    expect(steak.etapes.map((e) => e.libelle)).toEqual(['Agriculture', 'Transport'])
    expect(steak.etapes[0].valeur).toBeCloseTo(3.278, 3)
  })

  it("garde le lien vers l'Équivalent ADEME, son unité et sa valeur par unité", () => {
    const steak = calculerGeste(geste(), INSTANTANE)
    expect(steak.equivalent).toMatchObject({ slug: 'boeuf', unite: 'kg', valeur: 28.00917 })
    expect(steak.equivalent.url).toBe('https://impactco2.fr/outils/alimentation/boeuf')
  })

  it('conserve l’usage et une fin de vie négative (le recyclage est déjà déduit du total)', () => {
    const lavelinge = calculerGeste(geste({ id: 'lavelinge', equivalent: 'lavelinge', quantite: 1 }), INSTANTANE)
    expect(lavelinge.empreinte).toBe(513.42)
    expect(lavelinge.usage).toEqual({ total: 216.96, dureeAns: 12 })
    expect(lavelinge.finDeVie).toBe(-44.64)
  })
})

describe('Lignes de la Répartition affichées au joueur', () => {
  it("regroupe la fabrication d'un objet utilisé plusieurs années : Fabrication, Usage, Fin de vie", () => {
    const lavelinge = calculerGeste(geste({ id: 'lavelinge', equivalent: 'lavelinge', quantite: 1 }), INSTANTANE)
    const lignes = lignesRepartition(lavelinge)
    expect(lignes.map((l) => l.libelle)).toEqual(['Fabrication', 'Usage', 'Fin de vie'])
    expect(lignes[0].valeur).toBeCloseTo(341.1, 6)
    expect(lignes[2].valeur).toBe(-44.64)
  })

  it('garde le détail des étapes pour un aliment', () => {
    const lignes = lignesRepartition(calculerGeste(geste(), INSTANTANE))
    expect(lignes.map((l) => l.libelle)).toEqual(['Agriculture', 'Transport'])
  })

  it("ne renvoie aucune ligne quand l'ADEME ne publie pas le détail", () => {
    const pny = calculerGeste(geste({ id: 'pny', equivalent: 'avion-pny', quantite: 1 }), INSTANTANE)
    expect(lignesRepartition(pny)).toEqual([])
  })
})

describe('Validation du catalogue', () => {
  it('accepte un catalogue correct', () => {
    expect(() => validerCatalogue([geste(), geste({ id: 'pny', equivalent: 'avion-pny', quantite: 1 })], INSTANTANE)).not.toThrow()
  })

  it('refuse un Geste qui pointe vers un Équivalent inconnu, en le nommant', () => {
    expect(() => validerCatalogue([geste({ id: 'licorne', equivalent: 'licorne' })], INSTANTANE)).toThrow(/licorne.*inconnu/)
  })

  it('refuse une Quantité absente, nulle ou négative', () => {
    for (const quantite of [0, -1, Number.NaN]) {
      expect(() => validerCatalogue([geste({ quantite })], INSTANTANE)).toThrow(/steak.*Quantité/)
    }
  })

  it('refuse un Geste dont l’Équivalent a une unité encore à vérifier', () => {
    expect(() => validerCatalogue([geste({ id: 'film', equivalent: 'streamingvideo', quantite: 2 })], INSTANTANE)).toThrow(
      /film.*unité/,
    )
  })

  it('refuse deux Gestes avec le même identifiant', () => {
    expect(() => validerCatalogue([geste(), geste()], INSTANTANE)).toThrow(/steak.*deux fois/)
  })

  it('refuse un Geste d’empreinte nulle qui n’est pas réservé aux Duels thématiques', () => {
    const marche = geste({ id: 'marche', equivalent: 'marche', quantite: 5, nature: 'trajet' })
    expect(() => validerCatalogue([marche], INSTANTANE)).toThrow(/marche.*Duels thématiques/)
    expect(() => validerCatalogue([{ ...marche, seulementEnDuelThematique: true }], INSTANTANE)).not.toThrow()
  })

  it('liste tous les problèmes en une seule fois', () => {
    const erreur = () => validerCatalogue([geste({ id: 'a', equivalent: 'x' }), geste({ id: 'b', quantite: 0 })], INSTANTANE)
    expect(erreur).toThrow(/a.*inconnu[\s\S]*b.*Quantité/)
  })
})
