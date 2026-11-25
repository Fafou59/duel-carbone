/**
 * PROTOTYPE (jetable), variante C « La salle d'abord » : l'écran montre les gens, pas seulement les Gestes.
 * Pendant la question, les pseudos s'allument à mesure qu'ils répondent ; à la révélation, chacun rejoint
 * le Geste qu'il a choisi, en deux tas. Une frise des 10 Duels court en haut. Le classement est une course de barres.
 */
import { formaterRapport } from '../../domaine/format.ts'
import type { PropsVariante } from './PrototypeAnimateur.tsx'
import { Annonce, Geste, Rejoindre } from './commun.tsx'
import { classementApres, gagnant, partSeTrompant, rapportDu } from './seance-factice.ts'

export function VarianteSalle({ seance, etape, repondus, action }: PropsVariante) {
  const total = seance.participants.length
  const duel = seance.duels[etape.n]
  const joues = etape.phase === 'classement' || etape.phase === 'fin' ? etape.n + 1 : etape.phase === 'revelation' ? etape.n + 1 : etape.n

  const frise = (
    <ol className="pa-c__frise" aria-label="Les 10 Duels de la Séance">
      {seance.duels.map((_, n) => (
        <li
          key={n}
          className={n === etape.n && etape.phase !== 'attente' && etape.phase !== 'fin' ? 'pa-c__frise--actuel' : n < joues ? 'pa-c__frise--joue' : ''}
        >
          {n < joues ? `${100 - partSeTrompant(seance, n)} %` : n + 1}
        </li>
      ))}
    </ol>
  )
  const bouton = action && (
    <button type="button" className="pa-bouton" onClick={action.faire}>
      {action.libelle} <kbd>Espace</kbd>
    </button>
  )

  if (etape.phase === 'attente')
    return (
      <main className="pa-c">
        <div className="pa-c__attente">
          <Rejoindre code={seance.code} />
          <div>
            <h1>{total} personnes dans la salle</h1>
            <ul className="pa-c__nuage">
              {seance.participants.map((p) => (
                <li key={p.pseudo} className="pa-c__pastille pa-c__pastille--allumee">
                  {p.pseudo}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {bouton}
      </main>
    )

  if (etape.phase === 'classement' || etape.phase === 'fin') {
    const lignes = classementApres(seance, etape.n + 1).slice(0, 10)
    const reussite = Math.round(
      (seance.participants.reduce((s, p) => s + p.bonnes.slice(0, etape.n + 1).filter(Boolean).length, 0) / (total * (etape.n + 1))) * 100,
    )
    return (
      <main className="pa-c">
        {frise}
        <h1>
          {etape.phase === 'fin' ? 'Fin de la Séance : ' : ''}la salle a trouvé <strong>{reussite} %</strong> des bonnes réponses
        </h1>
        <ol className="pa-c__course">
          {lignes.map((l) => (
            <li key={l.pseudo}>
              <span className="pa-rang">{l.rang}</span>
              <span className="pa-c__course-nom">{l.pseudo}</span>
              <span className="pa-c__course-barre">
                <i style={{ width: `${(l.score / (etape.n + 1)) * 100}%` }} />
              </span>
              <span className="pa-score">{l.score}</span>
            </li>
          ))}
        </ol>
        {bouton}
      </main>
    )
  }

  const revele = etape.phase === 'revelation'
  const plus = gagnant(duel)
  const choix = (id: string) =>
    seance.participants.filter((p) => (p.bonnes[etape.n] ? plus.id === id : plus.id !== id)).map((p) => p.pseudo)

  return (
    <main className="pa-c">
      {frise}
      {!revele && <Annonce duel={duel} />}
      <div className="pa-c__colonnes">
        {[duel.a, duel.b].map((g) => (
          <section key={g.id} className={`pa-c__colonne${revele ? (g === plus ? ' pa--gagnant' : ' pa--perdant') : ''}`}>
            <div className="pa-c__geste">
              <Geste geste={g} montrerEmpreinte={revele} />
            </div>
            {revele && (
              <>
                <p className="pa-c__effectif">{choix(g.id).length} ont choisi ce Geste</p>
                <ul className="pa-c__tas">
                  {choix(g.id).map((p) => (
                    <li key={p} className="pa-c__pastille pa-c__pastille--allumee">
                      {p}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ))}
      </div>
      {revele ? (
        <p className="pa-c__verdict">
          {formaterRapport(rapportDu(duel))} · <strong>{partSeTrompant(seance, etape.n)} %</strong> de la salle s’est trompée
          {duel.thematique && <span className="pa-c__texte">{duel.thematique.texte}</span>}
        </p>
      ) : (
        <ul className="pa-c__nuage" aria-label={`${repondus} réponses sur ${total}`}>
          {seance.participants.map((p, i) => (
            <li key={p.pseudo} className={`pa-c__pastille${i < repondus ? ' pa-c__pastille--allumee' : ''}`}>
              {p.pseudo}
            </li>
          ))}
        </ul>
      )}
      {bouton}
    </main>
  )
}
