import { describe, expect, it } from 'vitest'
import type { GesteCalcule } from './geste.ts'
import { phraseDuRang, rangDuJour, scoreDesChoix, sontDesEffectifs, type Effectifs } from './rang-du-jour.ts'

/** Les effectifs du jour à partir d'une liste de scores (un par joueur). */
const effectifsDe = (...scores: number[]): Effectifs => {
  const effectifs = Array<number>(11).fill(0)
  for (const s of scores) effectifs[s] += 1
  return effectifs
}

describe('Rang du jour : la part des autres joueurs qui ont fait moins ou autant', () => {
  it('ne compte pas le joueur lui-même quand le serveur l’a déjà compté', () => {
    // Le joueur a fait 6 ; les 4 autres : 3, 5, 6 et 8. Moins ou autant : 3 sur 4.
    const rang = rangDuJour({ effectifs: effectifsDe(3, 5, 6, 6, 8), score: 6, compte: true })
    expect(rang).toEqual({ type: 'pourcentage', pourcentage: 75 })
  })

  it('prend tous les joueurs du serveur quand le score du joueur n’y est pas (envoi perdu)', () => {
    const rang = rangDuJour({ effectifs: effectifsDe(3, 5, 6, 8), score: 6, compte: false })
    expect(rang).toEqual({ type: 'pourcentage', pourcentage: 75 })
  })

  it('ne retire rien d’une case vide, même si le joueur se croit compté', () => {
    // Base remise à zéro, par exemple : on fait comme si son score n'y était pas.
    const rang = rangDuJour({ effectifs: effectifsDe(3, 5, 7, 8), score: 6, compte: true })
    expect(rang).toEqual({ type: 'pourcentage', pourcentage: 50 })
  })

  describe('le plancher de 5 joueurs (REGLES.rangDuJour)', () => {
    it('ne donne rien à 4 joueurs, le joueur compris', () => {
      expect(rangDuJour({ effectifs: effectifsDe(3, 5, 6, 8), score: 6, compte: true })).toBeNull()
      expect(rangDuJour({ effectifs: effectifsDe(3, 5, 8), score: 6, compte: false })).toBeNull()
    })

    it('donne un Rang à partir de 5 joueurs', () => {
      expect(rangDuJour({ effectifs: effectifsDe(3, 5, 6, 8), score: 6, compte: false })).not.toBeNull()
    })
  })

  describe('l’arrondi', () => {
    it('arrondit au pour cent le plus proche', () => {
      // Le joueur a fait 5 ; les 6 autres : 1, 2, 3, 5, 8 et 9. Moins ou autant : 4 sur 6, soit 66,7 %.
      const rang = rangDuJour({ effectifs: effectifsDe(5, 1, 2, 3, 5, 8, 9), score: 5, compte: true })
      expect(rang).toEqual({ type: 'pourcentage', pourcentage: 67 })
    })

    it('affiche 1 % pour tout ce qui est entre 0 et 1 % : seul un vrai zéro déclenche l’encouragement', () => {
      // 1 joueur sur 300 autres a fait moins ou autant : 0,33 %.
      const effectifs = effectifsDe(4, 4, 4)
      effectifs[2] = 1
      effectifs[8] = 299
      const rang = rangDuJour({ effectifs, score: 4, compte: true })
      expect(rang).toEqual({ type: 'pourcentage', pourcentage: 1 })
    })

    it('n’affiche jamais 100 % tant qu’un autre joueur a fait mieux', () => {
      // 299 sur 300 = 99,7 %, qui s'arrondirait à 100.
      const effectifs = effectifsDe(9)
      effectifs[5] = 300
      effectifs[9] = 1
      const rang = rangDuJour({ effectifs, score: 5, compte: true })
      expect(rang).toEqual({ type: 'pourcentage', pourcentage: 99 })
    })

    it('affiche 100 % quand personne n’a fait mieux', () => {
      const rang = rangDuJour({ effectifs: effectifsDe(3, 5, 6, 8, 9), score: 9, compte: true })
      expect(rang).toEqual({ type: 'pourcentage', pourcentage: 100 })
    })
  })

  describe('les cas à part', () => {
    it('10/10 : la part des autres joueurs qui ont aussi fait un sans-faute', () => {
      const rang = rangDuJour({ effectifs: effectifsDe(3, 5, 10, 10, 10), score: 10, compte: true })
      expect(rang).toEqual({ type: 'sansFaute', pourcentage: 50 })
    })

    it('10/10, seul ce jour-là : le premier sans-faute', () => {
      const rang = rangDuJour({ effectifs: effectifsDe(3, 5, 6, 8, 10), score: 10, compte: true })
      expect(rang).toEqual({ type: 'sansFaute', pourcentage: 0 })
    })

    it('0 % : personne d’autre n’a fait moins ou autant, quel que soit le score', () => {
      const rang = rangDuJour({ effectifs: effectifsDe(4, 5, 6, 8, 3), score: 3, compte: true })
      expect(rang).toEqual({ type: 'encouragement' })
    })

    it('0/10 : l’encouragement, même si d’autres ont aussi fait 0', () => {
      const rang = rangDuJour({ effectifs: effectifsDe(0, 0, 6, 8, 3), score: 0, compte: true })
      expect(rang).toEqual({ type: 'encouragement' })
    })
  })

  it('ne donne rien pour des effectifs qui n’ont pas la bonne forme', () => {
    expect(rangDuJour({ effectifs: [1, 2, 3], score: 2, compte: false })).toBeNull()
    expect(rangDuJour({ effectifs: effectifsDe(1, 2, 3, 4, 5), score: 11, compte: false })).toBeNull()
  })
})

describe('sontDesEffectifs : ce qui revient du serveur n’est jamais cru sur parole', () => {
  it('accepte 11 nombres entiers positifs ou nuls', () => {
    expect(sontDesEffectifs(effectifsDe(1, 2, 10))).toBe(true)
  })

  it.each([
    ['pas une liste', { 0: 1 }],
    ['10 cases', Array(10).fill(0)],
    ['un nombre négatif', [...Array(10).fill(0), -1]],
    ['un nombre à virgule', [...Array(10).fill(0), 1.5]],
    ['du texte', [...Array(10).fill(0), '3']],
  ])('refuse %s', (_, brut) => {
    expect(sontDesEffectifs(brut)).toBe(false)
  })
})

describe('phraseDuRang : ce que lit le joueur', () => {
  it('le cas général', () => {
    expect(phraseDuRang({ type: 'pourcentage', pourcentage: 72 })).toBe(
      'Tu as fait mieux ou autant que 72\u00a0% des joueurs du jour jusqu’ici.',
    )
  })

  it('le sans-faute', () => {
    expect(phraseDuRang({ type: 'sansFaute', pourcentage: 12 })).toBe('Sans-faute, comme 12\u00a0% des joueurs du jour jusqu’ici.')
  })

  it('le seul sans-faute du jour, pour l’instant', () => {
    expect(phraseDuRang({ type: 'sansFaute', pourcentage: 0 })).toBe('Sans-faute ! Personne d’autre n’y est arrivé aujourd’hui, pour l’instant.')
  })

  it('l’encouragement ne donne pas de chiffre', () => {
    expect(phraseDuRang({ type: 'encouragement' })).not.toMatch(/\d/)
  })

  it('une espace insécable avant le signe %, qui ne se retrouve jamais seul en début de ligne', () => {
    expect(phraseDuRang({ type: 'pourcentage', pourcentage: 5 })).toContain('5\u00a0%')
  })
})

describe('scoreDesChoix : le serveur recalcule le score à partir des 10 choix', () => {
  const geste = (id: string, empreinte: number) => ({ id, empreinte }) as GesteCalcule
  // 10 Duels où le premier Geste est toujours celui qui émet le plus.
  const duels = Array.from({ length: 10 }, (_, i) => ({ a: geste(`gros${i}`, 10), b: geste(`petit${i}`, 1) }))

  it('compte les bonnes réponses', () => {
    const choix = duels.map((d, i) => (i < 7 ? d.a.id : d.b.id))
    expect(scoreDesChoix(duels, choix)).toBe(7)
  })

  it('refuse un choix qui n’est pas l’un des deux Gestes du Duel', () => {
    const choix = duels.map((d) => d.a.id)
    choix[4] = 'gros5'
    expect(scoreDesChoix(duels, choix)).toBeNull()
  })

  it('refuse une Partie incomplète ou trop longue', () => {
    expect(scoreDesChoix(duels, duels.slice(0, 9).map((d) => d.a.id))).toBeNull()
    expect(scoreDesChoix(duels, [...duels.map((d) => d.a.id), 'gros0'])).toBeNull()
  })
})
