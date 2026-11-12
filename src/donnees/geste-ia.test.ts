import { describe, expect, it } from 'vitest'
import { empreinteDeLaCreation } from '../domaine/empreinte-ia.ts'
import { METHODE_EMPREINTE_IA } from '../liens.ts'
import { DUELS_THEMATIQUES } from './duels-thematiques.ts'
import { HYPOTHESES, JETONS } from './empreinte-ia.ts'
import { GESTE_CREATION_IA } from './geste-ia.ts'
import { GESTES_CALCULES, gesteCalcule } from './index.ts'

describe('L’Easter Egg : le Geste « Créer Duel Carbone (assisté par IA) »', () => {
  it('se présente comme les autres Gestes', () => {
    expect(GESTE_CREATION_IA.titre).toBe('Créer Duel Carbone')
    expect(GESTE_CREATION_IA.sousTitre).toBe('assisté par IA')
  })

  it("vaut l'hypothèse centrale de l'estimation, et suit donc chaque nouveau décompte", () => {
    expect(GESTE_CREATION_IA.empreinte).toBe(empreinteDeLaCreation(JETONS, HYPOTHESES.centrale).kgCo2e)
  })

  it("se dit hors ADEME, sans Répartition, et renvoie vers la méthode de l'estimation", () => {
    expect(GESTE_CREATION_IA.horsAdeme).toBe(true)
    expect(GESTE_CREATION_IA.etapes).toEqual([])
    expect(GESTE_CREATION_IA.equivalent.url).toBe(METHODE_EMPREINTE_IA)
  })

  it("n'est jamais tiré au hasard : on ne le croise que dans ses deux Duels thématiques", () => {
    expect(GESTE_CREATION_IA.seulementEnDuelThematique).toBe(true)
    const siens = DUELS_THEMATIQUES.filter((t) => [t.a, t.b].includes(GESTE_CREATION_IA.id))
    expect(siens.map((t) => [t.a, t.b].find((id) => id !== GESTE_CREATION_IA.id)).sort()).toEqual(['jean', 'steak-boeuf'])
  })

  it('fait partie des Gestes du jeu', () => {
    expect(GESTES_CALCULES).toContain(GESTE_CREATION_IA)
    expect(gesteCalcule(GESTE_CREATION_IA.id)).toBe(GESTE_CREATION_IA)
  })

  it('a son icône (public/icones/<id>.svg, fabriquée par npm run icones)', () => {
    const fichiers = Object.keys(import.meta.glob('../../public/icones/*.svg'))
    expect(fichiers).toContain(`../../public/icones/${GESTE_CREATION_IA.id}.svg`)
  })
})
