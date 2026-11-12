import { describe, expect, it } from 'vitest'
import { empreinteDeLaCreation, jetonsEquivalents } from './empreinte-ia.ts'

describe('Empreinte de la création du jeu par IA', () => {
  it('ramène chaque sorte de jeton à des « jetons lus » (relire le contexte en mémoire coûte 10 fois moins, écrire 5 fois plus)', () => {
    expect(jetonsEquivalents({ entree: 1000, ecritureCache: 0, lectureCache: 0, sortie: 0 })).toBe(1000)
    expect(jetonsEquivalents({ entree: 0, ecritureCache: 1000, lectureCache: 0, sortie: 0 })).toBe(1250)
    expect(jetonsEquivalents({ entree: 0, ecritureCache: 0, lectureCache: 1000, sortie: 0 })).toBe(100)
    expect(jetonsEquivalents({ entree: 0, ecritureCache: 0, lectureCache: 0, sortie: 1000 })).toBe(5000)
  })

  it('multiplie ces jetons par l’énergie d’un jeton, puis par le CO2e d’un kWh', () => {
    const jetons = { entree: 1_000_000, ecritureCache: 0, lectureCache: 0, sortie: 0 }
    // 1 million de jetons × 0,3 mWh = 0,3 kWh ; × 0,37 kg CO2e par kWh = 0,111 kg.
    const { energieKwh, kgCo2e } = empreinteDeLaCreation(jetons, { whParJeton: 0.0003, kgCo2eParKwh: 0.37 })
    expect(energieKwh).toBeCloseTo(0.3)
    expect(kgCo2e).toBeCloseTo(0.111)
  })
})
