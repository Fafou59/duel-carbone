import { describe, expect, it } from 'vitest'
import type { Duel } from './duel.ts'
import type { GesteCalcule } from './geste.ts'
import { avancer, demarrerPartie, estThematique, NOMBRE_DE_DUELS, reprendrePartie, score, type EtatPartie } from './partie.ts'

const geste = (id: string, empreinte: number): GesteCalcule => ({
  id,
  titre: id,
  sousTitre: '',
  justification: '',
  nature: 'objet',
  quantite: 1,
  empreinte,
  etapes: [],
  equivalent: { slug: id, nom: id, unite: 'unité', valeur: empreinte, url: '' },
})

// 10 Duels où le Geste « fort-n » émet toujours plus que « faible-n ».
const DUELS: Duel[] = Array.from({ length: NOMBRE_DE_DUELS }, (_, n) => ({
  a: geste(`fort-${n}`, 10),
  b: geste(`faible-${n}`, 1),
}))

/** Joue n Duels : bonne réponse si `bien` est vrai, puis passe au suivant. */
const jouer = (etat: EtatPartie, n: number, bien = true): EtatPartie => {
  let e = etat
  for (let i = 0; i < n; i++) {
    const duel = e.duels[e.index]
    e = avancer(e, { type: 'choisir', idGeste: bien ? duel.a.id : duel.b.id })
    e = avancer(e, { type: 'suivant' })
  }
  return e
}

describe("Machine à états d'une Partie", () => {
  it('démarre sur le premier Duel, sans réponse', () => {
    const etat = demarrerPartie(DUELS)
    expect(etat.phase).toBe('duel')
    expect(etat.index).toBe(0)
    expect(etat.reponses).toEqual([])
  })

  it('passe en révélation quand le joueur choisit, en notant si la réponse est bonne', () => {
    const etat = avancer(demarrerPartie(DUELS), { type: 'choisir', idGeste: 'fort-0' })
    expect(etat.phase).toBe('revelation')
    expect(etat.reponses).toEqual([{ idChoisi: 'fort-0', bonne: true }])
  })

  it('ignore un second choix pendant la révélation : impossible de changer d’avis', () => {
    const revelation = avancer(demarrerPartie(DUELS), { type: 'choisir', idGeste: 'faible-0' })
    const apres = avancer(revelation, { type: 'choisir', idGeste: 'fort-0' })
    expect(apres).toBe(revelation)
  })

  it('ignore « suivant » tant que le joueur n’a pas choisi', () => {
    const etat = demarrerPartie(DUELS)
    expect(avancer(etat, { type: 'suivant' })).toBe(etat)
  })

  it('ignore le choix d’un Geste qui ne fait pas partie du Duel', () => {
    const etat = demarrerPartie(DUELS)
    expect(avancer(etat, { type: 'choisir', idGeste: 'fort-5' })).toBe(etat)
  })

  it('passe au Duel suivant après la révélation', () => {
    const etat = jouer(demarrerPartie(DUELS), 1)
    expect(etat.phase).toBe('duel')
    expect(etat.index).toBe(1)
  })

  it(`se termine après ${NOMBRE_DE_DUELS} Duels`, () => {
    const etat = jouer(demarrerPartie(DUELS), NOMBRE_DE_DUELS)
    expect(etat.phase).toBe('fin')
    expect(etat.reponses).toHaveLength(NOMBRE_DE_DUELS)
  })

  it('compte une bonne réponse par point', () => {
    let etat = jouer(demarrerPartie(DUELS), 7, true)
    etat = jouer(etat, 3, false)
    expect(score(etat)).toBe(7)
  })

  it('ne bouge plus une fois la Partie terminée', () => {
    const fin = jouer(demarrerPartie(DUELS), NOMBRE_DE_DUELS)
    expect(avancer(fin, { type: 'suivant' })).toBe(fin)
    expect(avancer(fin, { type: 'choisir', idGeste: 'fort-9' })).toBe(fin)
  })

  it(`refuse de démarrer sans exactement ${NOMBRE_DE_DUELS} Duels`, () => {
    expect(() => demarrerPartie(DUELS.slice(0, 3))).toThrow(/10 Duels/)
  })
})

describe('Duel thématique', () => {
  it('se reconnaît à ses textes rédigés à la main', () => {
    const textes = { titre: 'Robinet contre bouteille', accroche: 'Même eau…', texte: "L'eau du robinet n'émet presque rien." }
    expect(estThematique({ ...DUELS[0], thematique: textes })).toBe(true)
    expect(estThematique(DUELS[0])).toBe(false)
  })
})

describe('Reprise d’une Partie interrompue (Partie du jour)', () => {
  it('reprend au Duel suivant, avec les réponses déjà données et le même score', () => {
    const etat = reprendrePartie(DUELS, ['fort-0', 'faible-1', 'fort-2'])
    expect(etat.phase).toBe('duel')
    expect(etat.index).toBe(3)
    expect(etat.reponses.map((r) => r.idChoisi)).toEqual(['fort-0', 'faible-1', 'fort-2'])
    expect(score(etat)).toBe(2)
  })

  it('arrive directement à la fin si les 10 réponses sont déjà données', () => {
    const toutes = DUELS.map((d) => d.a.id)
    const etat = reprendrePartie(DUELS, toutes)
    expect(etat.phase).toBe('fin')
    expect(score(etat)).toBe(NOMBRE_DE_DUELS)
  })

  it('ignore une réponse qui ne correspond pas au Duel (mémoire abîmée) et s’arrête là', () => {
    const etat = reprendrePartie(DUELS, ['fort-0', 'licorne', 'fort-2'])
    expect(etat.index).toBe(1)
    expect(etat.reponses).toHaveLength(1)
  })
})
