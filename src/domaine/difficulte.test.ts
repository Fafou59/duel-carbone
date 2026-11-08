import { describe, expect, it } from 'vitest'
import { difficulteAttendue } from './difficulte.ts'

describe('Difficulté attendue selon la position du Duel', () => {
  it('enchaîne 3 faciles, 3 moyens, 3 difficiles et 1 ultime', () => {
    const suite = Array.from({ length: 10 }, (_, i) => difficulteAttendue(i))
    expect(suite).toEqual([
      'facile',
      'facile',
      'facile',
      'moyen',
      'moyen',
      'moyen',
      'difficile',
      'difficile',
      'difficile',
      'ultime',
    ])
  })
})
