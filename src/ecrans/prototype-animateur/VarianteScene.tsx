/**
 * PROTOTYPE (jetable), variante A « Scène » : chaque étape prend tout l'écran, comme une diapositive.
 * Les deux Gestes en très grand, face à face ; la révélation met le chiffre de la salle au centre ;
 * le classement est une diapositive à lui seul. Le code pour rejoindre reste discret dans le bandeau.
 */
import { formaterRapport } from '../../domaine/format.ts'
import type { PropsVariante } from './PrototypeAnimateur.tsx'
import { Annonce, Geste, NOMS_DIFFICULTE, Rejoindre } from './commun.tsx'
import { classementApres, gagnant, partSeTrompant, rapportDu } from './seance-factice.ts'

export function VarianteScene({ seance, etape, repondus, action }: PropsVariante) {
  const total = seance.participants.length
  const duel = seance.duels[etape.n]
  const bouton = action && (
    <button type="button" className="pa-bouton" onClick={action.faire}>
      {action.libelle} <kbd>Espace</kbd>
    </button>
  )

  if (etape.phase === 'attente')
    return (
      <main className="pa-a pa-a--attente">
        <h1>Rejoins la Séance avec ton téléphone</h1>
        <Rejoindre code={seance.code} />
        <p className="pa-a__compte">{total} Participants</p>
        <ul className="pa-a__pseudos">
          {seance.participants.map((p) => (
            <li key={p.pseudo}>{p.pseudo}</li>
          ))}
        </ul>
        {bouton}
      </main>
    )

  if (etape.phase === 'classement' || etape.phase === 'fin') {
    const lignes = classementApres(seance, etape.n + 1).slice(0, 10)
    const rates = seance.duels
      .map((d, n) => ({ d, n, part: partSeTrompant(seance, n) }))
      .sort((x, y) => y.part - x.part)
      .slice(0, 3)
    return (
      <main className="pa-a pa-a--classement">
        <h1>{etape.phase === 'fin' ? 'Classement final' : `Classement après le Duel ${etape.n + 1}`}</h1>
        <ol className="pa-a__classement">
          {lignes.map((l) => (
            <li key={l.pseudo}>
              <span className="pa-rang">{l.rang}</span>
              <span>{l.pseudo}</span>
              <span className="pa-score">{l.score}</span>
            </li>
          ))}
        </ol>
        {etape.phase === 'fin' && (
          <section className="pa-a__rates">
            <h2>Les Duels qui ont le plus trompé la salle</h2>
            <ul>
              {rates.map(({ d, n, part }) => (
                <li key={n}>
                  <strong>{part} %</strong> {d.a.titre} ou {d.b.titre} ?
                </li>
              ))}
            </ul>
          </section>
        )}
        {bouton}
      </main>
    )
  }

  const revele = etape.phase === 'revelation'
  const plus = gagnant(duel)
  return (
    <main className="pa-a">
      <header className="pa-a__bandeau">
        <span>
          Duel {etape.n + 1}/10 · {NOMS_DIFFICULTE[duel.difficulte]}
        </span>
        <span>
          duelcarbone.fr/rejoindre · <strong>{seance.code}</strong>
        </span>
      </header>
      {!revele && <Annonce duel={duel} />}
      <h1 className="pa-a__question">Lequel émet le plus ?</h1>
      <div className="pa-a__face-a-face">
        {[duel.a, duel.b].map((g, i) => (
          <div key={g.id} className={`pa-a__carte${revele ? (g === plus ? ' pa--gagnant' : ' pa--perdant') : ''}`}>
            <Geste geste={g} montrerEmpreinte={revele} />
            {i === 0 && <span className="pa-a__ou">{revele ? formaterRapport(rapportDu(duel)) : 'ou'}</span>}
          </div>
        ))}
      </div>
      {revele ? (
        <div className="pa-a__salle">
          <p className="pa-a__part">
            <strong>{partSeTrompant(seance, etape.n)} %</strong> de la salle s’est trompée
          </p>
          {duel.thematique && <p className="pa-a__texte">{duel.thematique.texte}</p>}
        </div>
      ) : (
        <p className="pa-a__repondus">
          <strong>{repondus}</strong> réponses sur {total}
        </p>
      )}
      {bouton}
    </main>
  )
}
