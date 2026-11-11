import { describe, expect, it } from 'vitest'
import { joursRestants, partieDuJour } from '../domaine/calendrier.ts'
import { jourDeParis } from '../domaine/jour.ts'
import { DUELS_THEMATIQUES } from './duels-thematiques.ts'
import { CALIBRAGE, chargerCalendrier, GESTES_CALCULES } from './index.ts'

describe('Le calendrier des Parties du jour (garde-fous de la CI)', () => {
  it('est accordé au catalogue, aux règles et aux Duels thématiques actuels', async () => {
    const calendrier = await chargerCalendrier()
    expect(
      calendrier.empreinte,
      'Le catalogue, les règles ou les Duels thématiques ont changé : lance npm run calibrer (qui relance le calendrier).',
    ).toBe(CALIBRAGE.empreinte)
  })

  it('couvre encore au moins 30 jours après aujourd’hui', async () => {
    const calendrier = await chargerCalendrier()
    const aujourdhui = jourDeParis(new Date())
    expect(joursRestants(calendrier, aujourdhui), 'Le calendrier s’épuise : lance npm run calendrier.').toBeGreaterThanOrEqual(30)
  })

  it('propose aujourd’hui une Partie de 10 Duels avec des Gestes du catalogue', async () => {
    const calendrier = await chargerCalendrier()
    expect(partieDuJour(calendrier, jourDeParis(new Date()), GESTES_CALCULES, DUELS_THEMATIQUES)).toHaveLength(10)
  })
})
