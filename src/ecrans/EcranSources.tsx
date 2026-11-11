import { useEffect, useRef } from 'react'
import { GESTES_CALCULES, gesteCalcule, INSTANTANE } from '../donnees/index.ts'
import { formaterDate, formaterEmpreinte } from '../domaine/format.ts'
import { REGLES } from '../domaine/regles.ts'
import { DEPOT, IMPACT_CO2, MENTIONS_LEGALES_ADEME } from '../liens.ts'
import { ADRESSES } from '../navigateur/adresse.ts'
import './EcranSources.css'

/** Un nombre à la française, jusqu'à deux décimales : « 0,12 », « 1,25 », « 500 ». */
const nombre = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n)

/**
 * Tout ce que cette page affiche de chiffré est lu dans les données (Instantané, catalogue, règles) :
 * si l'ADEME met ses valeurs à jour ou si une règle change, la page suit d'elle-même.
 */
const DATE_INSTANTANE = formaterDate(INSTANTANE.dateImport)
const NOMBRE_DE_GESTES = GESTES_CALCULES.length
const NOMBRE_DE_FICHES = new Set(GESTES_CALCULES.map((g) => g.equivalent.slug)).size

// Les exemples : un aliment (le calcul), un appareil (la durée d'utilisation), un vol (les traînées de condensation).
const STEAK = gesteCalcule('steak-boeuf')
const TELEVISION = gesteCalcule('television')
const NEW_YORK = gesteCalcule('paris-new-york')
const trainees = NEW_YORK.etapes.find((e) => e.libelle === 'Traînées de condensation')
const PART_DES_TRAINEES = trainees ? Math.round((trainees.valeur / NEW_YORK.empreinte) * 100) : null

const PREMIERE_TRANCHE = REGLES.tranchesParDuel[0]
const DERNIERE_TRANCHE = REGLES.tranchesParDuel[REGLES.tranchesParDuel.length - 1]

export function EcranSources() {
  const titre = useRef<HTMLHeadingElement>(null)

  // À l'ouverture de la page, le lecteur d'écran (et le clavier) partent de son titre.
  useEffect(() => titre.current?.focus(), [])

  const unite = STEAK.equivalent.unite ?? 'unité'

  return (
    <article className="sources" aria-labelledby="sources-titre">
      <a className="sources__retour" href={ADRESSES.jeu}>
        ← Retour au jeu
      </a>
      <h2 id="sources-titre" ref={titre} tabIndex={-1}>
        Sources et méthode
      </h2>
      <p className="sources__chapo">Chaque chiffre du jeu vient de l'ADEME. Voici d'où, et comment on s'en sert.</p>

      <section>
        <h3>D'où viennent les chiffres</h3>
        <p>
          Toutes les empreintes carbone viennent d'<a href={IMPACT_CO2}>Impact CO2</a>, le site de l'ADEME (l'Agence
          de la transition écologique) qui mesure l'empreinte des objets et des gestes du quotidien sur tout leur
          cycle de vie : fabrication, transport, usage, fin de vie.
        </p>
        <p>
          Le jeu en garde une copie datée, mise à jour à la main : {NOMBRE_DE_GESTES} gestes, construits à partir de{' '}
          {NOMBRE_DE_FICHES} fiches de l'ADEME.
        </p>
        <p className="sources__citation">Source : ADEME, Impact CO2, données du {DATE_INSTANTANE}.</p>
        <p>
          L'ADEME autorise la réutilisation non commerciale et pédagogique de ses informations, à condition d'en
          respecter le sens et d'en citer l'origine et la date (<a href={MENTIONS_LEGALES_ADEME}>mentions légales
          d'Impact CO2</a>). Les données restent la propriété de l'ADEME. Duel Carbone est un projet indépendant : il
          n'est pas édité par l'ADEME.
        </p>
      </section>

      <section>
        <h3>Le calcul : Geste = Équivalent × Quantité</h3>
        <p>
          L'ADEME donne une valeur par unité : par kg pour un aliment, par km et par passager pour un trajet, par
          objet pour un appareil. Pour comparer des choses parlantes, le jeu multiplie cette valeur par une quantité
          réaliste. Par exemple :
        </p>
        <p className="sources__formule">
          {STEAK.titre} ({STEAK.sousTitre}) = {nombre(STEAK.quantite)} {unite} ×{' '}
          {formaterEmpreinte(STEAK.equivalent.valeur)} par {unite} = {formaterEmpreinte(STEAK.empreinte)}
        </p>
        <p>
          La valeur par unité est toujours celle de l'ADEME, sans retouche : seule la quantité est notre choix, et
          chaque geste l'affiche sous son nom. Après chaque Duel, un lien mène à la fiche ADEME de chaque geste ; ici,
          la <a href={STEAK.equivalent.url}>fiche ADEME du bœuf</a>.
        </p>
      </section>

      <section>
        <h3>Les objets : la durée d'utilisation retenue par l'ADEME</h3>
        <p>
          Pour un appareil ou un vêtement, l'empreinte compte sa fabrication, sa fin de vie et son usage pendant la
          durée d'utilisation retenue par l'ADEME
          {TELEVISION.usage && ` (par exemple ${TELEVISION.usage.dureeAns} ans pour une télévision)`}. Le jeu reprend
          ces durées telles quelles et les affiche sous le nom de l'objet.
        </p>
      </section>

      <section>
        <h3>Les réglages : ceux de l'ADEME, par défaut</h3>
        <p>
          Impact CO2 permet d'ajuster certains calculs, comme le nombre de passagers d'une voiture ou l'effet des
          traînées de condensation des avions. Le jeu garde toujours les réglages par défaut de l'ADEME : l'avion
          compte donc l'effet de ses traînées
          {PART_DES_TRAINEES !== null && ` (${PART_DES_TRAINEES} % de l'empreinte d'un Paris–New York)`}. Un trajet
          compte toujours la part d'une seule personne : en covoiturage à 4, ta part est un quart du trajet.
        </p>
      </section>

      <section>
        <h3>Les règles du jeu</h3>
        <p>
          Une Partie, c'est {REGLES.nombreDeDuels} Duels, sans chrono, de plus en plus serrés. Au Duel 1, l'un des
          deux gestes émet entre {nombre(PREMIERE_TRANCHE.min)} et {nombre(PREMIERE_TRANCHE.max)} fois plus que
          l'autre ; au Duel {REGLES.nombreDeDuels}, entre {nombre(DERNIERE_TRANCHE.min)} et{' '}
          {nombre(DERNIERE_TRANCHE.max)} fois seulement. Jamais moins de {nombre(REGLES.plancher)} fois : en dessous,
          l'écart pourrait tenir dans la marge d'erreur des données.
        </p>
        <p>
          Certains Duels, marqués ★, sont choisis à la main pour ce qu'ils nous apprennent : ils peuvent tomber à
          n'importe quel moment de la Partie.
        </p>
      </section>

      <section>
        <h3>Ta vie privée</h3>
        <p>
          Sans cookie, sans compte. Ton record et les derniers Duels joués (pour ne pas te reposer les mêmes) sont
          gardés dans ton navigateur, sur cet appareil. Ils ne sont envoyés nulle part.
        </p>
      </section>

      <section>
        <h3>Le projet</h3>
        <p>
          Le <a href={DEPOT}>code source du jeu</a> est public, sous licence MIT. Une erreur, une idée ?{' '}
          <a href={`${DEPOT}/issues`}>Dis-le sur GitHub</a>.
        </p>
      </section>
    </article>
  )
}
