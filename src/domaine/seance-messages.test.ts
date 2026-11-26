import { describe, expect, it } from 'vitest'
import { CALIBRAGE, GESTES_CALCULES } from '../donnees/index.ts'
import { DUELS_THEMATIQUES } from '../donnees/duels-thematiques.ts'
import { moinsEmetteur, plusEmetteur } from './duel.ts'
import { genererPartie } from './generateur.ts'
import { hasardReproductible } from './hasard.ts'
import { ajouterParticipant, avancerSeance, creerSeance, repondre, type EtatSeance } from './seance.ts'
import { lireMessageDuClient, preparerLesVues, TAILLE_MAX_D_UN_MESSAGE } from './seance-messages.ts'

const DUELS = genererPartie({
  gestes: GESTES_CALCULES,
  thematiques: DUELS_THEMATIQUES,
  forcerThematique: true,
  coefficients: CALIBRAGE.coefficients,
  hasard: hasardReproductible(3),
})
const JETON = 'abcdefghijklmnopqrstuv'
const texte = (message: unknown) => JSON.stringify(message)

describe('les messages des écrans', () => {
  it('se relisent quand ils sont bien formés', () => {
    expect(lireMessageDuClient(texte({ type: 'bonjour', role: 'animateur', jeton: JETON }))).toEqual({
      type: 'bonjour',
      role: 'animateur',
      jeton: JETON,
    })
    expect(lireMessageDuClient(texte({ type: 'bonjour', role: 'participant', jeton: JETON, pseudo: 'Camille' }))).toEqual({
      type: 'bonjour',
      role: 'participant',
      jeton: JETON,
      pseudo: 'Camille',
    })
    expect(lireMessageDuClient(texte({ type: 'bonjour', role: 'participant', jeton: JETON }))).toMatchObject({ pseudo: null })
    expect(lireMessageDuClient(texte({ type: 'repondre', duel: 3, idChoisi: 'jean' }))).toEqual({ type: 'repondre', duel: 3, idChoisi: 'jean' })
    expect(lireMessageDuClient(texte({ type: 'avancer', depuis: { phase: 'duel', index: 2 } }))).toEqual({
      type: 'avancer',
      depuis: { phase: 'duel', index: 2 },
      conseil: null,
    })
    expect(lireMessageDuClient(texte({ type: 'avancer', depuis: { phase: 'revelation', index: 9 }, conseil: 'velo' }))).toMatchObject({
      conseil: 'velo',
    })
    expect(lireMessageDuClient(texte({ type: 'retirer', numero: 4 }))).toEqual({ type: 'retirer', numero: 4 })
  })

  it('sont refusés quand ils sont illisibles, mal formés ou trop longs', () => {
    const refuses = [
      'pas du JSON',
      texte(null),
      texte({ type: 'inconnu' }),
      texte({ type: 'bonjour', role: 'animateur', jeton: 'court' }),
      texte({ type: 'bonjour', role: 'pirate', jeton: JETON }),
      texte({ type: 'repondre', duel: -1, idChoisi: 'jean' }),
      texte({ type: 'repondre', duel: 1.5, idChoisi: 'jean' }),
      texte({ type: 'repondre', duel: 1, idChoisi: 'Jean ; DROP' }),
      texte({ type: 'avancer', depuis: { phase: 'duel' } }),
      texte({ type: 'avancer', depuis: { phase: 'ailleurs' } }),
      texte({ type: 'avancer', depuis: { phase: 'fin' }, conseil: 42 }),
      texte({ type: 'retirer', numero: 0 }),
      texte({ type: 'bonjour', role: 'participant', jeton: JETON, pseudo: 'x'.repeat(TAILLE_MAX_D_UN_MESSAGE) }),
    ]
    for (const message of refuses) expect(lireMessageDuClient(message), message.slice(0, 80)).toBeNull()
    expect(lireMessageDuClient(42)).toBeNull()
  })
})

describe('ce que voit chaque écran', () => {
  const bon = plusEmetteur(DUELS[0]).id
  const faux = moinsEmetteur(DUELS[0]).id

  function arrivee(etat: EtatSeance, pseudo: string): EtatSeance {
    const resultat = ajouterParticipant(etat, pseudo)
    if ('refus' in resultat) throw new Error(resultat.refus)
    return resultat.etat
  }
  const avancer = (etat: EtatSeance) => avancerSeance(etat, etat.etape)

  // Camille (1) a trouvé, Léo (2) s'est trompé, Inès (3) n'a pas répondu.
  let enDuel = avancer(arrivee(arrivee(arrivee(creerSeance({ classement: true, duels: DUELS }), 'Camille'), 'Léo'), 'Inès'))
  enDuel = repondre(repondre(enDuel, 2, 0, faux), 1, 0, bon)
  const vues = (etat: EtatSeance) => preparerLesVues(etat, { code: 'K7RM4P', fermee: false })

  it('pendant un Duel, l’Animateur voit qui a répondu, dans l’ordre, sans voir les choix', () => {
    const { animateur } = vues(enDuel)
    expect(animateur.repondus).toEqual([2, 1])
    expect(animateur.salle).toEqual([])
    expect(animateur.classement).toBeNull()
    expect(animateur.participants.map((p) => p.pseudo)).toEqual(['Camille', 'Léo', 'Inès'])
    expect(animateur.duels[0]).toBe(`${DUELS[0].a.id}>${DUELS[0].b.id}`)
    expect(JSON.stringify(animateur)).not.toContain('idChoisi')
  })

  it('pendant un Duel, le Participant voit son choix et combien ont répondu, rien des autres', () => {
    const leo = vues(enDuel).participant(2)
    expect(leo?.moi.choix[0]).toBe(faux)
    expect(leo?.moi.score).toEqual({ bonnes: 0, joues: 0 })
    expect(leo).toMatchObject({ repondus: 2, participants: 3, salle: [] })
    expect(vues(enDuel).participant(3)?.moi.choix[0]).toBeNull()
    expect(vues(enDuel).participant(42)).toBeNull()
  })

  it('à la révélation, tous voient la salle, mais pas encore le Classement', () => {
    const { animateur, participant } = vues(avancer(enDuel))
    expect(animateur.salle[0]).toMatchObject({ reponses: 2, bonnes: 1 })
    expect(animateur.classement).toBeNull()
    expect(participant(1)?.moi).toMatchObject({ score: { bonnes: 1, joues: 1 }, place: null })
  })

  it('à l’étape du classement, tous voient le Classement', () => {
    const { animateur, participant } = vues(avancer(avancer(enDuel)))
    expect(animateur.classement?.map((l) => [l.pseudo, l.rang])).toEqual([
      ['Camille', 1],
      ['Inès', 2],
      ['Léo', 2],
    ])
    expect(participant(3)?.moi.place).toMatchObject({ rang: 2, exAequo: true, medaille: 'argent' })
  })

  it('sans Classement, personne ne voit de rang', () => {
    let etat = avancer(arrivee(creerSeance({ classement: false, duels: DUELS }), 'ignoré'))
    etat = avancer(repondre(etat, 1, 0, bon))
    expect(etat.etape).toEqual({ phase: 'revelation', index: 0 })
    etat = avancer(etat)
    expect(etat.etape).toEqual({ phase: 'duel', index: 1 })
    expect(vues(etat).animateur.classement).toBeNull()
    expect(vues(etat).participant(1)?.moi).toMatchObject({ pseudo: null, place: null, score: { bonnes: 1, joues: 1 } })
  })
})
