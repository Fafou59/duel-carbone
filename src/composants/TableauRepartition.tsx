import { iconeDe } from '../donnees/icones.ts'
import type { Duel } from '../domaine/duel.ts'
import { tableauComparatif } from '../domaine/explication.ts'
import { formaterEmpreinte } from '../domaine/format.ts'
import './TableauRepartition.css'

type Props = { duel: Duel }

/**
 * Un vrai tableau HTML : un lecteur d'écran annonce « Fabrication, Acheter un lave-linge : 341 kg ».
 * Les jauges sont décoratives (elles répètent le chiffre), donc cachées aux lecteurs d'écran.
 */
export function TableauRepartition({ duel }: Props) {
  const t = tableauComparatif(duel)

  const cellule = (valeur: number | null, cle: string) =>
    valeur === null ? (
      <td key={cle} className="repartition__nombre">
        <span aria-label="non détaillé">–</span>
      </td>
    ) : (
      <td key={cle} className="repartition__nombre">
        <span
          className={`repartition__jauge${valeur < 0 ? ' repartition__jauge--recyclage' : ''}`}
          style={{ width: `max(3px, calc(${t.largeur(valeur)}% - 8px))` }}
          aria-hidden="true"
        />
        <span className="repartition__valeur">{formaterEmpreinte(valeur, { co2e: false })}</span>
      </td>
    )

  return (
    <div className="repartition">
      <table className="repartition__tableau">
        <caption>
          D'où viennent ces émissions ? <span className="repartition__unite">(en CO2e)</span>
        </caption>
        <thead>
          <tr>
            <th scope="col">Étape</th>
            {t.colonnes.map((g) => (
              <th scope="col" key={g.id} className="repartition__nombre">
                <span className="repartition__icone" aria-hidden="true">
                  {iconeDe(g.id)}
                </span>
                <span className="repartition__geste">{g.titre}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.lignes.map((ligne) => (
            <tr key={ligne.libelle}>
              <th scope="row">
                {ligne.libelle}
                {ligne.recyclage && <small className="repartition__precision">dont recyclage</small>}
              </th>
              {ligne.valeurs.map((v, i) => cellule(v, `${ligne.libelle}-${i}`))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            {t.totaux.map((v, i) => cellule(v, `total-${i}`))}
          </tr>
        </tfoot>
      </table>

      {t.sansDetail.length > 0 && (
        <p className="repartition__note">
          L'ADEME ne publie pas le détail pour : {t.sansDetail.map((g) => g.titre.toLowerCase()).join(', ')}.
        </p>
      )}
      {t.recyclage && (
        <p className="repartition__note">Les émissions évitées par le recyclage sont déjà déduites du total.</p>
      )}
      <p className="repartition__sources">
        Sources ADEME :{' '}
        {t.colonnes.map((g, i) => (
          <span key={g.id}>
            {i > 0 && ' · '}
            <a href={g.equivalent.url} target="_blank" rel="noopener noreferrer">
              {g.titre} <span aria-hidden="true">↗</span>
              <span className="visuellement-cache"> (nouvel onglet)</span>
            </a>
          </span>
        ))}
      </p>
    </div>
  )
}
