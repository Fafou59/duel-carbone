import { describe, expect, it } from 'vitest'
import { CALIBRAGE, GESTES_CALCULES } from '../donnees/index.ts'
import { DUELS_THEMATIQUES } from '../donnees/duels-thematiques.ts'
import { moinsEmetteur, plusEmetteur } from './duel.ts'
import { genererPartie } from './generateur.ts'
import { hasardReproductible } from './hasard.ts'
import { REGLES } from './regles.ts'
import {
  ajouterParticipant,
  avancerSeance,
  classementDeLaSeance,
  creerSeance,
  duelsLesPlusRates,
  duelsReveles,
  estFermee,
  estUnCodeDeSeance,
  estUnJeton,
  etapeSuivante,
  normaliserCode,
  normaliserPseudo,
  partDeLaSalle,
  participantsManquants,
  reponsesPourLeTauxDErreur,
  repondre,
  retirerParticipant,
  scoreDuParticipant,
  tirerUnCode,
  type EtatSeance,
} from './seance.ts'
import { cleDuDuel } from './taux-d-erreur.ts'

const DUELS = genererPartie({
  gestes: GESTES_CALCULES,
  thematiques: DUELS_THEMATIQUES,
  forcerThematique: true,
  coefficients: CALIBRAGE.coefficients,
  hasard: hasardReproductible(7),
})

const bon = (duel: number) => plusEmetteur(DUELS[duel]).id
const faux = (duel: number) => moinsEmetteur(DUELS[duel]).id

/** Fait entrer des Participants (pseudos donnés), en échouant si l'un est refusé. */
function avecParticipants(etat: EtatSeance, ...pseudos: string[]): EtatSeance {
  return pseudos.reduce((courant, pseudo) => {
    const arrivee = ajouterParticipant(courant, pseudo)
    if ('refus' in arrivee) throw new Error(`${pseudo} refusé : ${arrivee.refus}`)
    return arrivee.etat
  }, etat)
}

/** Appuie sur le bouton principal de l'Animateur. */
const avancer = (etat: EtatSeance, conseil: string | null = null) => avancerSeance(etat, etat.etape, conseil)

/** Avance jusqu'à l'étape voulue (même phase et même Duel). */
function jusqua(etat: EtatSeance, phase: string, index?: number): EtatSeance {
  let courant = etat
  while (!(courant.etape.phase === phase && ('index' in courant.etape ? courant.etape.index : undefined) === index)) {
    const suivant = avancer(courant)
    if (suivant === courant) throw new Error(`Étape ${phase} ${index} jamais atteinte`)
    courant = suivant
  }
  return courant
}

describe('le code d’une Séance', () => {
  it('compte 6 caractères, sans 0 ni O, ni 1 ni I', () => {
    const hasard = hasardReproductible(1)
    for (let i = 0; i < 500; i++) {
      const code = tirerUnCode(hasard)
      expect(code).toMatch(/^[A-Z2-9]{6}$/)
      expect(code).not.toMatch(/[01OI]/)
      expect(estUnCodeDeSeance(code)).toBe(true)
    }
  })

  it('se tape sans souci de casse ni d’espaces', () => {
    expect(normaliserCode(' k7rm 4p ')).toBe('K7RM4P')
    expect(normaliserCode('K7R-M4P')).toBe('K7RM4P')
    expect(normaliserCode('K7RM40')).toBeNull()
    expect(normaliserCode('K7RM4')).toBeNull()
    expect(normaliserCode(42)).toBeNull()
  })

  it('n’accepte comme jeton qu’au moins 22 caractères base64url', () => {
    expect(estUnJeton('abcdefghijklmnopqrstuv')).toBe(true)
    expect(estUnJeton('abc')).toBe(false)
    expect(estUnJeton('abcdefghijklmnopqrstu!')).toBe(false)
    expect(estUnJeton('a'.repeat(65))).toBe(false)
  })
})

describe('les étapes d’une Séance', () => {
  it('vont de l’attente à la fin, avec un classement après les Duels 1 à 9 seulement', () => {
    let etat = avecParticipants(creerSeance({ classement: true, duels: DUELS }), 'Camille', 'Léo')
    const etapes = [etat.etape]
    while (etapeSuivante(etat)) {
      etat = avancer(etat)
      etapes.push(etat.etape)
    }
    expect(etapes[0]).toEqual({ phase: 'attente' })
    expect(etapes.slice(1, 4)).toEqual([
      { phase: 'duel', index: 0 },
      { phase: 'revelation', index: 0 },
      { phase: 'classement', index: 0 },
    ])
    expect(etapes.filter((e) => e.phase === 'classement')).toHaveLength(9)
    // Jamais de classement après le Duel 10 : de sa révélation, on passe directement à la fin.
    expect(etapes.slice(-2)).toEqual([{ phase: 'revelation', index: 9 }, { phase: 'fin' }])
    expect(etapes).toHaveLength(1 + 10 * 2 + 9 + 1)
  })

  it('sautent le classement quand l’Animateur n’en a pas choisi', () => {
    let etat = avecParticipants(creerSeance({ classement: false, duels: DUELS }), 'A', 'B')
    const phases: string[] = []
    while (etapeSuivante(etat)) {
      etat = avancer(etat)
      phases.push(etat.etape.phase)
    }
    expect(phases).not.toContain('classement')
    expect(phases).toHaveLength(10 * 2 + 1)
  })

  it('ne bougent pas si l’Animateur appuie deux fois depuis la même étape', () => {
    const lance = avancer(avecParticipants(creerSeance({ classement: true, duels: DUELS }), 'Camille', 'Léo'))
    const revele = avancerSeance(lance, { phase: 'duel', index: 0 })
    expect(revele.etape).toEqual({ phase: 'revelation', index: 0 })
    // Le même appui, renvoyé après une coupure : la Séance est déjà plus loin, rien ne bouge.
    expect(avancerSeance(revele, { phase: 'duel', index: 0 })).toBe(revele)
  })

  it('retiennent le Conseil au passage à la fin, et seulement là', () => {
    const debut = avancer(avecParticipants(creerSeance({ classement: false, duels: DUELS }), 'A', 'B'), 'velo')
    expect(debut.conseil).toBeNull()
    const derniere = jusqua(debut, 'revelation', 9)
    expect(avancer(derniere, 'velo').conseil).toBe('velo')
    expect(avancer(avancer(derniere, 'velo'), 'autre')).toEqual(avancer(derniere, 'velo'))
  })

  it('ne lancent le premier Duel qu’à partir de 2 Participants', () => {
    expect(REGLES.seance.participantsMin).toBe(2)
    const vide = creerSeance({ classement: true, duels: DUELS })
    expect(participantsManquants(vide.participants.length)).toBe(2)
    expect(avancer(vide)).toBe(vide)
    const seul = avecParticipants(vide, 'Camille')
    expect(participantsManquants(seul.participants.length)).toBe(1)
    expect(avancer(seul)).toBe(seul)
    const deux = avecParticipants(seul, 'Léo')
    expect(participantsManquants(deux.participants.length)).toBe(0)
    expect(avancer(deux).etape).toEqual({ phase: 'duel', index: 0 })
  })

  it('continuent même s’il ne reste qu’un Participant (ou aucun) une fois lancées', () => {
    const lancee = avancer(avecParticipants(creerSeance({ classement: true, duels: DUELS }), 'Camille', 'Léo'))
    const seule = retirerParticipant(retirerParticipant(lancee, 1), 2)
    expect(avancer(seule).etape).toEqual({ phase: 'revelation', index: 0 })
  })

  it('exigent 10 Duels', () => {
    expect(() => creerSeance({ classement: true, duels: DUELS.slice(0, 9) })).toThrow(/10 Duels/)
  })
})

describe('les Participants', () => {
  it('donnent un pseudo de 1 à 20 caractères, mis au propre, si l’Animateur a choisi un Classement', () => {
    expect(normaliserPseudo('  Camille   la  Grande ')).toBe('Camille la Grande')
    expect(normaliserPseudo('Zoé​')).toBe('Zoé')
    expect(normaliserPseudo('a'.repeat(REGLES.seance.longueurMaxDuPseudo))).toHaveLength(20)
    expect(normaliserPseudo('a'.repeat(REGLES.seance.longueurMaxDuPseudo + 1))).toBeNull()
    expect(normaliserPseudo('🌍'.repeat(20))).toBe('🌍'.repeat(20))
    expect(normaliserPseudo('   ')).toBeNull()

    const avec = creerSeance({ classement: true, duels: DUELS })
    expect(ajouterParticipant(avec, '  ')).toEqual({ refus: 'pseudo' })
    const sans = ajouterParticipant(creerSeance({ classement: false, duels: DUELS }), 'Camille')
    expect('participant' in sans && sans.participant.pseudo).toBeNull()
  })

  it('reçoivent un numéro d’arrivée jamais réutilisé, même après un retrait', () => {
    let etat = avecParticipants(creerSeance({ classement: true, duels: DUELS }), 'Camille', 'Léo')
    expect(etat.participants.map((p) => p.numero)).toEqual([1, 2])
    etat = retirerParticipant(etat, 2)
    etat = avecParticipants(etat, 'Inès')
    expect(etat.participants.map((p) => [p.numero, p.pseudo])).toEqual([
      [1, 'Camille'],
      [3, 'Inès'],
    ])
  })

  it('sont 100 au plus', () => {
    const pseudos = Array.from({ length: REGLES.seance.participantsMax }, (_, i) => `P${i}`)
    const pleine = avecParticipants(creerSeance({ classement: true, duels: DUELS }), ...pseudos)
    expect(ajouterParticipant(pleine, 'Un de trop')).toEqual({ refus: 'pleine' })
  })

  it('peuvent arriver en cours, jusqu’à la fin', () => {
    const seance = avecParticipants(creerSeance({ classement: true, duels: DUELS }), 'Camille', 'Léo')
    const premier = (etat: EtatSeance) => {
      const arrivee = ajouterParticipant(etat, 'Retard')
      return 'participant' in arrivee ? arrivee.participant.premierDuel : arrivee.refus
    }
    expect(premier(seance)).toBe(0)
    // Pendant un Duel, on peut encore y répondre ; pendant sa révélation, on commence au suivant.
    expect(premier(jusqua(seance, 'duel', 3))).toBe(3)
    expect(premier(jusqua(seance, 'revelation', 3))).toBe(4)
    expect(premier(jusqua(seance, 'classement', 3))).toBe(4)
    expect(premier(jusqua(seance, 'fin'))).toBe('terminee')
  })

  it('retirés, quittent la Séance avec leurs réponses', () => {
    let etat = jusqua(avecParticipants(creerSeance({ classement: true, duels: DUELS }), 'Camille', 'Léo'), 'duel', 0)
    etat = repondre(repondre(etat, 1, 0, bon(0)), 2, 0, bon(0))
    etat = retirerParticipant(etat, 1)
    expect(etat.reponses).toEqual([{ numero: 2, duel: 0, idChoisi: bon(0) }])
    expect(retirerParticipant(etat, 99)).toBe(etat)
  })
})

describe('les réponses', () => {
  const lancee = jusqua(avecParticipants(creerSeance({ classement: true, duels: DUELS }), 'Camille', 'Léo'), 'duel', 0)

  it('se donnent une fois par Duel, sans changer d’avis', () => {
    const une = repondre(lancee, 1, 0, faux(0))
    expect(une.reponses).toEqual([{ numero: 1, duel: 0, idChoisi: faux(0) }])
    expect(repondre(une, 1, 0, bon(0))).toBe(une)
  })

  it('se ferment à la révélation', () => {
    const revele = avancer(repondre(lancee, 1, 0, bon(0)))
    expect(repondre(revele, 2, 0, bon(0))).toBe(revele)
  })

  it('ne valent que pour le Duel en cours, l’un de ses deux Gestes, et un Participant de la Séance', () => {
    expect(repondre(lancee, 1, 1, bon(1))).toBe(lancee)
    expect(repondre(lancee, 1, 0, bon(1) === bon(0) ? faux(1) : bon(1))).toBe(lancee)
    expect(repondre(lancee, 42, 0, bon(0))).toBe(lancee)
    expect(repondre(creerSeance({ classement: true, duels: DUELS }), 1, 0, bon(0)).reponses).toEqual([])
  })
})

describe('le score', () => {
  it('compte les bonnes réponses des seuls Duels révélés', () => {
    let etat = jusqua(avecParticipants(creerSeance({ classement: true, duels: DUELS }), 'Camille', 'Léo'), 'duel', 0)
    etat = repondre(etat, 1, 0, bon(0))
    const camille = etat.participants[0]
    // Avant la révélation, la bonne réponse ne compte pas encore (et ne se devine pas au score).
    expect(scoreDuParticipant(etat, camille)).toEqual({ bonnes: 0, joues: 0 })
    etat = avancer(etat)
    expect(scoreDuParticipant(etat, camille)).toEqual({ bonnes: 1, joues: 1 })
  })

  it('ne compte, pour un Participant arrivé en cours, que les Duels joués', () => {
    let etat = jusqua(avecParticipants(creerSeance({ classement: true, duels: DUELS }), 'Camille', 'Léo'), 'revelation', 2)
    etat = avecParticipants(etat, 'Retard')
    etat = jusqua(etat, 'duel', 3)
    etat = repondre(repondre(etat, 1, 3, bon(3)), 3, 3, bon(3))
    etat = avancer(etat)
    const [camille, , retard] = etat.participants
    expect(scoreDuParticipant(etat, camille)).toEqual({ bonnes: 1, joues: 4 })
    expect(scoreDuParticipant(etat, retard)).toEqual({ bonnes: 1, joues: 1 })
  })

  it('ne donne rien à qui n’a pas répondu', () => {
    const etat = avancer(jusqua(avecParticipants(creerSeance({ classement: true, duels: DUELS }), 'Camille', 'Léo'), 'duel', 0))
    expect(scoreDuParticipant(etat, etat.participants[0])).toEqual({ bonnes: 0, joues: 1 })
    expect(duelsReveles(etat)).toBe(1)
  })
})

describe('le Classement', () => {
  /** Une Séance où chacun a répondu aux Duels 1 et 2 selon `bonnes` (pour chaque pseudo, ses deux réponses). */
  function seanceJouee(bonnes: Record<string, [boolean, boolean]>): EtatSeance {
    let etat = jusqua(avecParticipants(creerSeance({ classement: true, duels: DUELS }), ...Object.keys(bonnes)), 'duel', 0)
    for (const duel of [0, 1]) {
      etat = jusqua(etat, 'duel', duel)
      etat.participants.forEach((p) => {
        etat = repondre(etat, p.numero, duel, bonnes[p.pseudo ?? ''][duel] ? bon(duel) : faux(duel))
      })
      etat = avancer(etat)
    }
    return etat
  }

  it('range par palier de score : les ex aequo partagent le rang, le suivant est le palier suivant (1, 1, 2…)', () => {
    const etat = seanceJouee({ Léo: [true, false], Camille: [true, true], Inès: [false, true], Hugo: [false, false], Adam: [true, true] })
    const lignes = classementDeLaSeance(etat)
    expect(lignes.map((l) => [l.pseudo, l.bonnes, l.rang, l.exAequo])).toEqual([
      ['Adam', 2, 1, true],
      ['Camille', 2, 1, true],
      ['Inès', 1, 2, true],
      ['Léo', 1, 2, true],
      ['Hugo', 0, 3, false],
    ])
  })

  it('donne l’or au 1er palier, l’argent au 2e, le bronze au 3e', () => {
    const etat = seanceJouee({ A: [true, true], B: [true, true], C: [true, false], D: [false, false], E: [false, false] })
    expect(classementDeLaSeance(etat).map((l) => l.medaille)).toEqual(['or', 'or', 'argent', 'bronze', 'bronze'])
    const quatre = seanceJouee({ A: [true, true], B: [true, false], C: [false, false] })
    expect(classementDeLaSeance(quatre).map((l) => l.medaille)).toEqual(['or', 'argent', 'bronze'])
  })

  it('ne donne pas de médaille au-delà du 3e palier', () => {
    let etat = jusqua(avecParticipants(creerSeance({ classement: true, duels: DUELS }), 'A', 'B', 'C', 'D'), 'duel', 0)
    // A trouve 3 fois, B 2 fois, C 1 fois, D jamais.
    for (const duel of [0, 1, 2]) {
      etat = jusqua(etat, 'duel', duel)
      etat.participants.forEach((p, i) => {
        etat = repondre(etat, p.numero, duel, i <= 2 - duel ? bon(duel) : faux(duel))
      })
      etat = avancer(etat)
    }
    expect(classementDeLaSeance(etat).map((l) => [l.pseudo, l.rang, l.medaille])).toEqual([
      ['A', 1, 'or'],
      ['B', 2, 'argent'],
      ['C', 3, 'bronze'],
      ['D', 4, null],
    ])
  })

  it('indique les places gagnées ou perdues depuis le Duel précédent', () => {
    const etat = seanceJouee({ Camille: [true, false], Léo: [false, true], Inès: [false, false] })
    // Après le Duel 1 : Camille 1re, Léo et Inès 2es. Après le Duel 2 : Camille et Léo 1ers, Inès 2e.
    expect(classementDeLaSeance(etat).map((l) => [l.pseudo, l.rang, l.evolution])).toEqual([
      ['Camille', 1, 0],
      ['Léo', 1, 1],
      ['Inès', 2, 0],
    ])
    // Après le premier Duel, il n'y a pas d'avant.
    expect(classementDeLaSeance(etat, 1).every((l) => l.evolution === null)).toBe(true)
  })

  it('fait figurer un Participant arrivé en cours, sans évolution la première fois', () => {
    let etat = jusqua(avecParticipants(creerSeance({ classement: true, duels: DUELS }), 'Camille', 'Léo'), 'classement', 1)
    etat = avecParticipants(etat, 'Retard')
    expect(classementDeLaSeance(etat).find((l) => l.pseudo === 'Retard')).toMatchObject({ bonnes: 0, joues: 0, evolution: null })
    etat = avancer(avancer(etat))
    expect(classementDeLaSeance(etat).find((l) => l.pseudo === 'Retard')?.evolution).toBe(0)
  })
})

describe('la salle', () => {
  function revelee(choix: string[]): EtatSeance {
    // Au moins 2 Participants pour lancer la Séance ; les autres ne répondent pas.
    const pseudos = Array.from({ length: Math.max(choix.length, REGLES.seance.participantsMin) }, (_, i) => `P${i}`)
    let etat = jusqua(avecParticipants(creerSeance({ classement: false, duels: DUELS }), ...pseudos), 'duel', 0)
    choix.forEach((id, i) => {
      etat = repondre(etat, i + 1, 0, id)
    })
    return avancer(etat)
  }

  it('montre la part de la salle qui a choisi chaque Geste', () => {
    const etat = revelee([bon(0), bon(0), bon(0), faux(0)])
    expect(partDeLaSalle(etat, 0)).toEqual({
      reponses: 4,
      bonnes: 3,
      parGeste: { [bon(0)]: { nombre: 3, pourcentage: 75 }, [faux(0)]: { nombre: 1, pourcentage: 25 } },
    })
  })

  it('ne montre 0 % qu’à un Geste que personne n’a choisi', () => {
    const etat = revelee([])
    expect(partDeLaSalle(etat, 0).parGeste[bon(0)]).toEqual({ nombre: 0, pourcentage: 0 })
    expect(reponsesPourLeTauxDErreur(etat, 0)).toBeNull()
  })

  it('ajoute ses réponses au Taux d’erreur de la paire', () => {
    expect(reponsesPourLeTauxDErreur(revelee([bon(0), faux(0), faux(0)]), 0)).toEqual({ cle: cleDuDuel(DUELS[0]), reponses: 3, fausses: 2 })
  })

  it('désigne les Duels qui l’ont le plus trompée, sans ceux où personne ne s’est trompé', () => {
    let etat = jusqua(avecParticipants(creerSeance({ classement: false, duels: DUELS }), 'A', 'B', 'C', 'D'), 'duel', 0)
    // Fausses réponses par Duel : 0, 3, 1, 3, 2 (sur 4).
    const fausses = [0, 3, 1, 3, 2]
    fausses.forEach((n, duel) => {
      etat = jusqua(etat, 'duel', duel)
      for (let numero = 1; numero <= 4; numero++) etat = repondre(etat, numero, duel, numero <= n ? faux(duel) : bon(duel))
      etat = avancer(etat)
    })
    expect(duelsLesPlusRates(etat)).toEqual([
      { duel: 1, fausses: 75 },
      { duel: 3, fausses: 75 },
      { duel: 4, fausses: 50 },
    ])
    expect(duelsLesPlusRates(etat, 10).map((d) => d.duel)).toEqual([1, 3, 4, 2])
  })
})

describe('les limites de temps', () => {
  it('ferment la Séance 3 h après sa création', () => {
    const creeeLe = Date.UTC(2026, 10, 26, 9)
    expect(estFermee(creeeLe, creeeLe + 3 * 3_600_000 - 1)).toBe(false)
    expect(estFermee(creeeLe, creeeLe + 3 * 3_600_000)).toBe(true)
  })
})
