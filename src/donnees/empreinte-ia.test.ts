import { describe, expect, it } from 'vitest'
import { HYPOTHESES } from './empreinte-ia.ts'

describe("Les hypothèses de l'estimation de l'empreinte IA", () => {
  it('vont de la plus favorable à la plus défavorable, sur les deux facteurs', () => {
    const { basse, centrale, haute } = HYPOTHESES
    expect(basse.whParJeton).toBeLessThan(centrale.whParJeton)
    expect(centrale.whParJeton).toBeLessThan(haute.whParJeton)
    expect(basse.kgCo2eParKwh).toBeLessThan(centrale.kgCo2eParKwh)
    expect(centrale.kgCo2eParKwh).toBeLessThan(haute.kgCo2eParKwh)
  })

  it("prennent pour centre l'électricité des centres de données d'AWS (0,287 kg CO2e par kWh, Jegham et al.), arrondie", () => {
    expect(HYPOTHESES.centrale.kgCo2eParKwh).toBe(0.3)
  })
})
