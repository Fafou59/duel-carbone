import { describe, expect, it } from 'vitest'
import { ACCROCHES_DU_JOUR } from './accroches.ts'
import { GESTES_CALCULES } from './index.ts'

// Les mots d'un titre de Geste qui le trahiraient (« steak », « avion »…), sans les verbes ni les petits mots.
const MOTS_COMMUNS = new Set([
  'manger', 'boire', 'acheter', 'faire', 'aller', 'chercher', 'passer', 'avoir', 'envoyer', 'livrer', 'chauffer',
  'importée', 'verre', 'paire', 'pinte', 'journée', 'avec', 'sans', 'plateau', 'barquette', 'filet', 'internet',
])
const normaliser = (texte: string) => texte.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const MOTS_DES_GESTES = new Set(
  GESTES_CALCULES.flatMap((geste) => normaliser(geste.titre).split(/[^a-z0-9]+/))
    .filter((mot) => mot.length >= 4 && !MOTS_COMMUNS.has(mot)),
)

describe('Accroches du Duel du jour', () => {
  it('en propose une trentaine, toutes différentes', () => {
    expect(ACCROCHES_DU_JOUR.length).toBeGreaterThanOrEqual(30)
    expect(new Set(ACCROCHES_DU_JOUR).size).toBe(ACCROCHES_DU_JOUR.length)
  })

  it('ne nomment aucun Geste : le texte partagé ne dévoile rien de la Partie', () => {
    for (const accroche of ACCROCHES_DU_JOUR) {
      const mots = normaliser(accroche).split(/[^a-z0-9]+/)
      expect(mots.filter((mot) => MOTS_DES_GESTES.has(mot)), accroche).toEqual([])
    }
  })

  it('tiennent sur une ligne de message', () => {
    for (const accroche of ACCROCHES_DU_JOUR) expect(accroche.length, accroche).toBeLessThanOrEqual(60)
  })
})
