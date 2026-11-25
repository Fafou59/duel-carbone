import { describe, expect, it } from 'vitest'
import type { Instantane } from '../donnees/referentiel.ts'
import {
  chiffresDuConseil,
  choisirConseil,
  CONSEILS_RECENTS,
  redigerConseil,
  siteDuLien,
  valeursDe,
  type Conseil,
} from './conseils.ts'
import { hasardReproductible } from './hasard.ts'

const instantane: Instantane = {
  source: 'test',
  api: 'test',
  dateImport: '2026-11-22',
  equivalents: [
    { slug: 'boeuf', nom: 'Bœuf', thematique: 'alimentation', unite: 'kg', valeur: 28, etapes: [], url: '' },
    { slug: 'lentilles', nom: 'Lentilles', thematique: 'alimentation', unite: 'kg', valeur: 0.6, etapes: [], url: '' },
    {
      slug: 'smartphone',
      nom: 'Smartphone',
      thematique: 'numerique',
      unite: 'unité',
      valeur: 80,
      etapes: [
        { id: 1, libelle: 'Construction', valeur: 77 },
        { id: 2, libelle: 'Assemblage et distribution', valeur: 2 },
      ],
      usage: { parAn: 0.4, dureeAns: 2.5, total: 1 },
      url: '',
    },
  ],
}

const conseil = (id: string, declencheurs: string[], champs: Partial<Conseil> = {}): Conseil => ({
  id,
  texte: 'Un texte.',
  chiffres: {},
  relu: {},
  lien: { url: 'https://nosgestesclimat.fr/actions/x', titre: 'Une action' },
  declencheurs,
  ...champs,
})

describe('Les chiffres d’un Conseil, calculés à partir de l’Instantané', () => {
  const valeurs = valeursDe(instantane)

  it('lit la valeur d’un Équivalent, une étape de sa Répartition et sa fabrication', () => {
    expect(valeurs.valeur('boeuf')).toBe(28)
    expect(valeurs.etape('smartphone', 'Construction')).toBe(77)
    expect(valeurs.fabrication('smartphone')).toBe(79)
  })

  it('refuse un Équivalent ou une étape absents : une faute de frappe ne doit pas donner « 0 kg »', () => {
    expect(() => valeurs.valeur('boeuff')).toThrow(/boeuff/)
    expect(() => valeurs.etape('smartphone', 'Transport')).toThrow(/Transport/)
  })

  it('arrondit chaque chiffre à son pas, à la française', () => {
    const c = conseil('test', [], {
      chiffres: {
        economie: { calcul: (v) => 104 * (v.valeur('boeuf') - v.valeur('lentilles')), arrondi: 10 },
        part: { calcul: (v) => (100 * v.etape('smartphone', 'Construction')) / v.valeur('smartphone'), arrondi: 1 },
        lentilles: { calcul: (v) => 0.1 * v.valeur('lentilles'), arrondi: 0.01 },
        milliers: { calcul: () => 1350.4, arrondi: 10 },
      },
    })
    expect(chiffresDuConseil(c, valeurs)).toEqual({
      // Intl sépare les milliers par une espace fine insécable (U+202F) : « 2 850 » ne se coupe jamais en fin de ligne.
      economie: '2 850',
      part: '96',
      lentilles: '0,06',
      milliers: '1 350',
    })
  })

  it('remplace les repères du texte par les chiffres', () => {
    const c = conseil('test', [], {
      texte: 'Un steak émet {fois} fois plus que des lentilles.',
      chiffres: { fois: { calcul: (v) => (0.15 * v.valeur('boeuf')) / (0.1 * v.valeur('lentilles')), arrondi: 10 } },
    })
    expect(redigerConseil(c, valeurs)).toBe('Un steak émet 70 fois plus que des lentilles.')
  })
})

describe('Le choix du Conseil de fin de Partie', () => {
  const steak = conseil('steak', ['steak-boeuf', 'repas-boeuf'])
  const avion = conseil('avion', ['paris-new-york'])
  const jean = conseil('jean', ['jean'])
  const tele = conseil('tele', ['television'])
  const tous = [steak, avion, jean, tele]
  const hasard = hasardReproductible(1)

  it('préfère un Conseil lié à une erreur du joueur', () => {
    for (let graine = 0; graine < 20; graine++) {
      const choisi = choisirConseil({
        conseils: tous,
        gestesDeLaPartie: ['steak-boeuf', 'paris-new-york', 'jean'],
        gestesRates: ['jean'],
        recents: [],
        hasard: hasardReproductible(graine),
      })
      expect(choisi.id).toBe('jean')
    }
  })

  it('sinon, prend l’un des Conseils dont un Geste déclencheur est dans la Partie', () => {
    const choisis = new Set<string>()
    for (let graine = 0; graine < 30; graine++) {
      choisis.add(
        choisirConseil({
          conseils: tous,
          gestesDeLaPartie: ['repas-boeuf', 'paris-new-york'],
          gestesRates: [],
          recents: [],
          hasard: hasardReproductible(graine),
        }).id,
      )
    }
    expect([...choisis].sort()).toEqual(['avion', 'steak'])
  })

  it('sinon, prend un Conseil au hasard', () => {
    const choisis = new Set<string>()
    for (let graine = 0; graine < 50; graine++) {
      choisis.add(
        choisirConseil({ conseils: tous, gestesDeLaPartie: ['pomme'], gestesRates: ['pomme'], recents: [], hasard: hasardReproductible(graine) }).id,
      )
    }
    expect([...choisis].sort()).toEqual(['avion', 'jean', 'steak', 'tele'])
  })

  it('ne remontre jamais un Conseil vu récemment, même lié à une erreur', () => {
    const choisi = choisirConseil({
      conseils: tous,
      gestesDeLaPartie: ['steak-boeuf', 'jean'],
      gestesRates: ['jean'],
      recents: ['jean'],
      hasard,
    })
    expect(choisi.id).toBe('steak')
  })

  it('reprend les Conseils récents s’ils sont tous déjà vus (le jeu en montre toujours un)', () => {
    const choisi = choisirConseil({
      conseils: [jean],
      gestesDeLaPartie: ['jean'],
      gestesRates: [],
      recents: ['jean'],
      hasard,
    })
    expect(choisi.id).toBe('jean')
  })

  it('se souvient des Conseils des 10 dernières Parties (issue 126)', () => {
    expect(CONSEILS_RECENTS).toBe(10)
  })
})

describe('Le lien « En savoir plus » d’un Conseil', () => {
  it('nomme le site de l’ADEME où il mène', () => {
    expect(siteDuLien('https://nosgestesclimat.fr/actions/transport/covoiturage-quotidien')).toBe('Nos Gestes Climat')
    expect(siteDuLien('https://impactco2.fr/doc/questions-frequentes')).toBe('Impact CO2')
  })
})
