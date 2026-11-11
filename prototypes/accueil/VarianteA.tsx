// PROTOTYPE JETABLE — Variante A « Essaie tout de suite » : l'accueil EST un Duel d'essai, commenté.
import { useState } from 'react'
import { CarteGeste, type EtatCarte } from '../../src/composants/CarteGeste.tsx'
import { Icone } from '../../src/composants/Icone.tsx'
import { gesteCalcule } from '../../src/donnees/index.ts'
import { plusEmetteur, rapport } from '../../src/domaine/duel.ts'
import { formaterEmpreinte, formaterMultiple, formaterRapport } from '../../src/domaine/format.ts'
import {
  GrilleDuJour,
  LienSources,
  ReperesClimat,
  SIMULATION,
  Slogan,
  type Situation,
  useCompteARebours,
  useSimulation,
} from './commun.tsx'

// Un Duel d'essai qui surprend : un steak émet plus qu'un Paris–Marseille en TGV.
const ESSAI = { a: gesteCalcule('steak-boeuf'), b: gesteCalcule('paris-marseille-tgv') }

export function VarianteA({ situation }: { situation: Situation }) {
  const [choix, setChoix] = useState<string | null>(null)
  const { simuler, bulle } = useSimulation()
  const reste = useCompteARebours()
  const gagnant = plusEmetteur(ESSAI)
  const etat = (id: string): EtatCarte => (!choix ? 'question' : id === gagnant.id ? 'plus-emetteur' : id === choix ? 'mauvais-choix' : 'autre')

  const duelDuJour = (
    <section className="proto-a__jour">
      <h2>Le Duel Carbone du jour n° {SIMULATION.numero}</h2>
      <p>10 Duels, les mêmes pour tout le monde aujourd’hui. Compare ton score avec tes proches.</p>
      <button type="button" className="bouton proto-gros" onClick={simuler('lancerait le Duel du jour')}>
        Jouer le Duel du jour
      </button>
      <Slogan />
    </section>
  )
  const partieLibre = (
    <section className="proto-libre">
      <p>Envie de t’entraîner pour le Duel de demain ?</p>
      <button type="button" className="bouton bouton--secondaire" onClick={simuler('lancerait une Partie libre')}>
        Partie libre
      </button>
    </section>
  )

  if (situation === 'aujourdhui') {
    return (
      <div className="proto-a">
        <section className="proto-a__resultat">
          <h2>Ton Duel du jour n° {SIMULATION.numero}</h2>
          <p className="proto-score">
            {SIMULATION.aujourdhui.score}
            <span>/10</span>
          </p>
          <GrilleDuJour />
          <button type="button" className="bouton" onClick={simuler('ouvrirait le partage')}>
            Défier mes proches
          </button>
          <p className="proto-discret">Prochain Duel dans {reste} · série de {SIMULATION.serie + 1} jours 🔥</p>
        </section>
        {partieLibre}
        <Slogan />
        <LienSources />
        {bulle}
      </div>
    )
  }

  return (
    <div className="proto-a">
      {situation === 'hier' ? (
        <p className="proto-a__hier">
          Hier : <b>{SIMULATION.hier.score}/10</b> · série de {SIMULATION.serie} jours 🔥 Ne la casse pas !
        </p>
      ) : (
        <>
          <p className="proto-a__accroche">Lequel émet le plus de CO2e ? Essaie, c’est le jeu :</p>
          <section className="duel">
            <div className="duel__cartes">
              <CarteGeste geste={ESSAI.a} etat={etat(ESSAI.a.id)} choisie={choix === ESSAI.a.id} raccourci="1" onChoisir={() => setChoix(ESSAI.a.id)} />
              {choix ? (
                <div className="duel__rapport">
                  <b>{formaterRapport(rapport(ESSAI))}</b>
                  <small>fois plus</small>
                </div>
              ) : (
                <div className="duel__vs" aria-hidden="true">
                  VS
                </div>
              )}
              <CarteGeste geste={ESSAI.b} etat={etat(ESSAI.b.id)} choisie={choix === ESSAI.b.id} raccourci="2" onChoisir={() => setChoix(ESSAI.b.id)} />
            </div>
          </section>
          {choix && (
            <section className="proto-a__commentaire" aria-live="polite">
              <p className="proto-a__verdict">{choix === gagnant.id ? '✓ Bien vu !' : '✗ Raté… et tu n’es pas le seul !'}</p>
              <p>
                <Icone id="steak-boeuf" /> Un steak de 120 g émet <b>{formaterEmpreinte(ESSAI.a.empreinte)}</b>, soit{' '}
                {formaterMultiple(rapport(ESSAI))} fois plus qu’un Paris–Marseille en TGV <Icone id="paris-marseille-tgv" /> (
                {formaterEmpreinte(ESSAI.b.empreinte)}). L’essentiel vient de l’élevage, pas du transport.
              </p>
              <p className="proto-discret">
                Une Partie, c’est 10 Duels comme celui-ci, du plus facile au plus serré. Pas de chrono, pas de compte.
              </p>
            </section>
          )}
          {!choix && <ReperesClimat jauge={false} />}
        </>
      )}
      {(situation === 'hier' || choix) && duelDuJour}
      {(situation === 'hier' || choix) && partieLibre}
      {situation === 'hier' && <ReperesClimat jauge={false} />}
      <LienSources />
      {bulle}
    </div>
  )
}
