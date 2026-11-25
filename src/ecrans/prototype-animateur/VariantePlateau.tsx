/**
 * PROTOTYPE (jetable), variante B « Plateau et colonne » : une colonne fixe à droite, toujours visible
 * (rejoindre, réponses reçues, top 10 avec ses montées et descentes), et le plateau à gauche.
 * Les Gestes sont posés l'un sous l'autre ; à la révélation ils deviennent des barres à l'échelle de leur Empreinte.
 * Le classement intermédiaire ne remplace pas l'écran : la colonne s'anime, le plateau montre la frise des Duels.
 */
import { formaterRapport } from '../../domaine/format.ts'
import type { PropsVariante } from './PrototypeAnimateur.tsx'
import { Annonce, Geste, NOMS_DIFFICULTE, Rejoindre } from './commun.tsx'
import { classementApres, gagnant, partSeTrompant, rapportDu } from './seance-factice.ts'

export function VariantePlateau({ seance, etape, repondus, action }: PropsVariante) {
  const total = seance.participants.length
  const duel = seance.duels[etape.n]
  // Le top 10 de la colonne : celui du dernier classement montré.
  const joues = etape.phase === 'classement' || etape.phase === 'fin' ? etape.n + 1 : etape.n
  const top = classementApres(seance, joues).slice(0, 10)
  const avant = classementApres(seance, Math.max(0, joues - 1))
  const mouvement = (pseudo: string, rang: number) => {
    const ancien = avant.find((l) => l.pseudo === pseudo)?.rang ?? rang
    return ancien > rang ? '▲' : ancien < rang ? '▼' : ''
  }
  const enCours = etape.phase === 'duel'
  const classementEnAvant = etape.phase === 'classement' || etape.phase === 'fin'

  const colonne = (
    <aside className={`pa-b__colonne${classementEnAvant ? ' pa-b__colonne--en-avant' : ''}`}>
      <Rejoindre code={seance.code} compact />
      {etape.phase !== 'attente' && (
        <div className="pa-b__jauge" aria-label={`${repondus} réponses sur ${total}`}>
          <span>{enCours ? `${repondus} / ${total} ont répondu` : `${total} Participants`}</span>
          <div>
            <i style={{ width: `${((enCours ? repondus : total) / total) * 100}%` }} />
          </div>
        </div>
      )}
      {joues > 0 && (
        <>
          <h2>Top 10 {etape.phase === 'fin' ? 'final' : `après ${joues} Duel${joues > 1 ? 's' : ''}`}</h2>
          <ol className="pa-b__top">
            {top.map((l) => (
              <li key={l.pseudo}>
                <span className="pa-rang">{l.rang}</span>
                <span>{l.pseudo}</span>
                <span className="pa-b__mouvement">{classementEnAvant && mouvement(l.pseudo, l.rang)}</span>
                <span className="pa-score">{l.score}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </aside>
  )

  let plateau
  if (etape.phase === 'attente') {
    plateau = (
      <>
        <h1>La Séance va commencer</h1>
        <p className="pa-b__grand">{total} Participants ont rejoint</p>
        <ul className="pa-b__pseudos">
          {seance.participants.map((p) => (
            <li key={p.pseudo}>{p.pseudo}</li>
          ))}
        </ul>
      </>
    )
  } else if (classementEnAvant) {
    plateau = (
      <>
        <h1>{etape.phase === 'fin' ? 'Bravo à toute la salle !' : 'Où en est la salle ?'}</h1>
        <p>Part de la salle qui s’est trompée, Duel par Duel :</p>
        <ol className="pa-b__frise">
          {seance.duels.map((_, n) => (
            <li key={n} className={n < joues ? '' : 'pa-b__frise--avenir'}>
              <span className="pa-b__frise-barre">
                <i style={{ height: n < joues ? `${partSeTrompant(seance, n)}%` : '0' }} />
              </span>
              <span>{n < joues ? `${partSeTrompant(seance, n)} %` : '·'}</span>
              <span className="pa-b__frise-num">{n + 1}</span>
            </li>
          ))}
        </ol>
      </>
    )
  } else {
    const revele = etape.phase === 'revelation'
    const plus = gagnant(duel)
    plateau = (
      <>
        <p className="pa-b__entete">
          Duel {etape.n + 1} sur 10 · {NOMS_DIFFICULTE[duel.difficulte]}
        </p>
        {!revele && <Annonce duel={duel} />}
        <h1>Lequel émet le plus ?</h1>
        <div className="pa-b__lignes">
          {[duel.a, duel.b].map((g, i) => (
            <div key={g.id} className={`pa-b__ligne${revele ? (g === plus ? ' pa--gagnant' : ' pa--perdant') : ''}`}>
              <span className="pa-b__touche">{i + 1}</span>
              <div className="pa-b__geste">
                <Geste geste={g} montrerEmpreinte={revele} />
              </div>
              {revele && (
                <span className="pa-b__barre">
                  <i style={{ width: `${Math.max(2, (g.empreinte / plus.empreinte) * 100)}%` }} />
                </span>
              )}
            </div>
          ))}
        </div>
        {revele && (
          <div className="pa-b__revelation">
            <p>
              <strong>{formaterRapport(rapportDu(duel))}</strong> plus d’émissions
            </p>
            <p>
              <strong>{partSeTrompant(seance, etape.n)} %</strong> de la salle s’est trompée
            </p>
            {duel.thematique && <p className="pa-b__texte">{duel.thematique.texte}</p>}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="pa-b">
      <main className="pa-b__plateau">
        {plateau}
        {action && (
          <button type="button" className="pa-bouton" onClick={action.faire}>
            {action.libelle} <kbd>Espace</kbd>
          </button>
        )}
      </main>
      {colonne}
    </div>
  )
}
