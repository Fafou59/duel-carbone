import { describe, expect, it } from 'vitest'
import { COLONNE_DROITE, COLONNE_GAUCHE } from '../donnees/vitrine.ts'
import { IMAGE_STORY, ZONE_SURE, couperEnDeux, miseEnPageDeLImage, type DonneesImage, type Element } from './image-de-partage.ts'
import { messageDeScore } from './recapitulatif.ts'

const BONNES = [true, true, true, false, true, true, true, false, false, true]
const DU_JOUR: DonneesImage = { numero: 12, score: 7, bonnes: BONNES, serie: 3 }
const LIBRE: DonneesImage = { score: 7, bonnes: BONNES }

const textes = (elements: Element[]) => elements.flatMap((e) => (e.sorte === 'texte' ? [e.texte] : []))
const cases = (elements: Element[]) => elements.filter((e) => e.sorte === 'case')

describe("L'image de partage, au format Story", () => {
  it('fait 1080 × 1920 px et commence par un fond qui la couvre entièrement', () => {
    expect(IMAGE_STORY).toEqual({ largeur: 1080, hauteur: 1920 })
    expect(miseEnPageDeLImage(DU_JOUR)[0]).toMatchObject({ sorte: 'rectangle', x: 0, y: 0, largeur: 1080, hauteur: 1920 })
  })

  it('montre le jeu, le numéro du jour, le score, le message, la série et l’adresse du jeu', () => {
    expect(textes(miseEnPageDeLImage(DU_JOUR))).toEqual([
      'Duel Carbone',
      'Duel du jour n° 12',
      '7',
      '/10',
      messageDeScore(7, 10),
      '🔥 Série : 3 jours d’affilée',
      'Sauras-tu faire mieux ?',
      'duelcarbone.fr',
    ])
  })

  it('montre une case par Duel, réussie ou ratée, de gauche à droite', () => {
    const lesCases = cases(miseEnPageDeLImage(DU_JOUR))
    expect(lesCases.map((c) => c.bonne)).toEqual(BONNES)
    const abscisses = lesCases.map((c) => c.x)
    expect(abscisses).toEqual([...abscisses].sort((a, b) => a - b))
  })

  it('coupe un message trop long en deux lignes, plutôt que de l’écraser', () => {
    const message = messageDeScore(2, 10)
    expect(message.length).toBeGreaterThan(40)
    expect(textes(miseEnPageDeLImage({ ...DU_JOUR, score: 2 })).slice(4, 6)).toEqual(couperEnDeux(message))
  })

  it('coupe de préférence après une ponctuation, jamais devant « : » ou « ! »', () => {
    expect(couperEnDeux('Pas mal ! Quelques pièges ont fait mouche.')).toEqual(['Pas mal !', 'Quelques pièges ont fait mouche.'])
    expect(couperEnDeux('Les chiffres surprennent souvent : rejoue pour les apprivoiser !')).toEqual([
      'Les chiffres surprennent souvent :',
      'rejoue pour les apprivoiser !',
    ])
    expect(couperEnDeux('un deux trois quatre cinq six')).toEqual(['un deux trois', 'quatre cinq six'])
    for (const score of [0, 5, 9]) for (const ligne of couperEnDeux(messageDeScore(score, 10))) expect(ligne.length).toBeLessThanOrEqual(38)
  })

  it('écrit « Partie libre » à la place du numéro du jour, sans série', () => {
    const lesTextes = textes(miseEnPageDeLImage(LIBRE))
    expect(lesTextes).toContain('Partie libre')
    expect(lesTextes.join(' ')).not.toMatch(/Série|du jour/)
  })

  it('resserre la carte sous les cases quand il n’y a pas de série', () => {
    const carte = (donnees: DonneesImage) =>
      miseEnPageDeLImage(donnees).find((e) => e.sorte === 'rectangle' && e.x === 90) as Extract<Element, { sorte: 'rectangle' }>
    const basDesCases = (donnees: DonneesImage) => Math.max(...cases(miseEnPageDeLImage(donnees)).map((c) => c.y + c.cote))
    expect(carte(LIBRE).y + carte(LIBRE).hauteur - basDesCases(LIBRE)).toBeLessThan(80)
    expect(carte(DU_JOUR).hauteur).toBeGreaterThan(carte(LIBRE).hauteur)
  })

  it('accorde la série, et ne la montre pas quand elle est nulle', () => {
    expect(textes(miseEnPageDeLImage({ ...DU_JOUR, serie: 1 }))).toContain('🔥 Série : 1 jour d’affilée')
    expect(textes(miseEnPageDeLImage({ ...DU_JOUR, serie: 0 })).join(' ')).not.toMatch(/Série/)
  })

  it('garde tout ce qui compte dans la zone qu’Instagram ne recouvre pas, et dans la largeur', () => {
    const utiles = miseEnPageDeLImage(DU_JOUR).filter((e) => e.sorte !== 'filigrane' && !(e.sorte === 'rectangle' && e.y === 0))
    for (const e of utiles) {
      // Un texte est placé par sa ligne de base : son haut est environ une taille de police plus haut.
      const haut = e.sorte === 'texte' ? e.y - e.taille : e.y
      const bas = e.sorte === 'texte' ? e.y : e.y + ('hauteur' in e ? e.hauteur : e.sorte === 'case' ? e.cote : e.taille)
      expect(haut, JSON.stringify(e)).toBeGreaterThanOrEqual(ZONE_SURE.haut)
      expect(bas, JSON.stringify(e)).toBeLessThanOrEqual(ZONE_SURE.bas)
      if (e.sorte !== 'texte') expect(e.x).toBeGreaterThanOrEqual(0)
      if (e.sorte === 'texte') expect(e.largeurMax ?? 0).toBeLessThanOrEqual(IMAGE_STORY.largeur)
    }
  })

  it('ne dévoile aucun Geste de la Partie : le filigrane ne reprend que la vitrine, le même pour tous', () => {
    const filigrane = (donnees: DonneesImage) => miseEnPageDeLImage(donnees).filter((e) => e.sorte === 'filigrane')
    const vitrine = new Set([...COLONNE_GAUCHE, ...COLONNE_DROITE])
    expect(filigrane(DU_JOUR).length).toBeGreaterThan(0)
    for (const icone of filigrane(DU_JOUR)) expect(vitrine).toContain(icone.sorte === 'filigrane' && icone.id)
    expect(filigrane(DU_JOUR)).toEqual(filigrane({ numero: 40, score: 2, bonnes: BONNES.map((b) => !b), serie: 9 }))
  })
})
