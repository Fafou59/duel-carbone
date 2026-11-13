import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { GESTES_CALCULES, gesteCalcule, INSTANTANE } from '../donnees/index.ts'
import { enMinuscule, formaterDate, formaterEmpreinte } from '../domaine/format.ts'
import { REGLES } from '../domaine/regles.ts'
import { APPELS, DATE_DU_DECOMPTE, DEBUT_DU_PROJET, HYPOTHESES, JETONS } from '../donnees/empreinte-ia.ts'
import { empreinteDeLaCreation } from '../domaine/empreinte-ia.ts'
import { ADEME, CONTACT, DEPOT, FLUENT_EMOJI, GOATCOUNTER, IMPACT_CO2, MENTIONS_LEGALES_ADEME, METHODE_EMPREINTE_IA } from '../liens.ts'
import { ADRESSES } from '../navigateur/adresse.ts'
import { DefinitionCo2e } from '../composants/Co2e.tsx'
import { GuideInstallation } from '../composants/InvitationInstallation.tsx'
import { mouvementReduit } from '../navigateur/mouvement.ts'
import './EcranEnSavoirPlus.css'

/** Un nombre à la française, jusqu'à deux décimales : « 0,12 », « 1,25 », « 500 ». */
const nombre = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n)

/**
 * Tout ce que cette page affiche de chiffré est lu dans les données (Instantané, catalogue, règles) :
 * si l'ADEME met ses valeurs à jour ou si une règle change, la page suit d'elle-même.
 */
const DATE_INSTANTANE = formaterDate(INSTANTANE.dateImport)
// Les Gestes construits à partir des fiches de l'ADEME : l'Easter Egg, estimé hors ADEME, n'en fait pas partie.
const GESTES_ADEME = GESTES_CALCULES.filter((g) => !g.horsAdeme)
const NOMBRE_DE_GESTES = GESTES_ADEME.length
const NOMBRE_DE_RESERVES = GESTES_ADEME.filter((g) => g.seulementEnDuelThematique).length
const NOMBRE_DE_FICHES = new Set(GESTES_ADEME.map((g) => g.equivalent.slug)).size

/** La fréquence des Duels ★, lue dans les règles : « Une Partie sur deux », « 30 % des Parties »… */
const FREQUENCE_THEMATIQUE =
  REGLES.probabiliteDuelThematique === 0.5
    ? 'Une Partie sur deux'
    : `${nombre(REGLES.probabiliteDuelThematique * 100)} % des Parties`

// Les exemples : un aliment (le calcul), un appareil (la durée d'utilisation), un vol (les traînées de condensation).
const STEAK = gesteCalcule('steak-boeuf')
const TELEVISION = gesteCalcule('television')
const NEW_YORK = gesteCalcule('paris-new-york')
const trainees = NEW_YORK.etapes.find((e) => e.libelle === 'Traînées de condensation')
const PART_DES_TRAINEES = trainees ? Math.round((trainees.valeur / NEW_YORK.empreinte) * 100) : null

// L'empreinte de la création du jeu par IA (domaine/empreinte-ia.ts), arrondie au kilo : c'est une estimation.
const kgIa = (h: keyof typeof HYPOTHESES) => Math.round(empreinteDeLaCreation(JETONS, HYPOTHESES[h]).kgCo2e)
const FRIENDS = gesteCalcule('friends')

const PREMIERE_TRANCHE = REGLES.tranchesParDuel[0]
const DERNIERE_TRANCHE = REGLES.tranchesParDuel[REGLES.tranchesParDuel.length - 1]

/**
 * Les parties de la page, dans l'ordre : leur titre, et leur identifiant pour le sommaire.
 * Le sommaire est construit à partir de cette liste : il suit toujours la page.
 */
const PARTIES = {
  pourquoi: 'Pourquoi Duel Carbone ?',
  chiffres: "D'où viennent les chiffres",
  co2e: "L'unité : le CO2e",
  calcul: 'Le calcul : Geste = Équivalent × Quantité',
  objets: "Les objets : la durée d'utilisation retenue par l'ADEME",
  reglages: "Les réglages : ceux de l'ADEME, par défaut",
  regles: 'Les règles du jeu',
  installer: 'Jouer hors ligne : installer le jeu',
  'vie-privee': 'Ta vie privée',
  empreinte: 'L’empreinte de ce jeu',
  projet: 'Suivre le projet',
  mentions: 'Mentions légales',
} as const

type IdPartie = keyof typeof PARTIES

/** Descend jusqu'à un élément de la page, et y place le clavier et le lecteur d'écran. */
function allerA(element: HTMLElement | null) {
  if (!element) return
  element.focus({ preventScroll: true })
  element.scrollIntoView({ behavior: mouvementReduit() ? 'auto' : 'smooth', block: 'start' })
}

/** Une partie de la page, avec son titre (que le sommaire sait atteindre). */
function Partie({ id, children }: { id: IdPartie; children: ReactNode }) {
  return (
    <section className="savoir__partie" aria-labelledby={`savoir-${id}`}>
      <h3 id={`savoir-${id}`} tabIndex={-1}>
        {PARTIES[id]}
      </h3>
      {children}
    </section>
  )
}

/** La page « En savoir plus » : le projet, puis les sources et la méthode, la vie privée, et l'empreinte du jeu. */
export function EcranEnSavoirPlus() {
  const titre = useRef<HTMLHeadingElement>(null)
  const sommaire = useRef<HTMLElement>(null)
  const titreDuSommaire = useRef<HTMLParagraphElement>(null)
  // Le bouton « ↑ » n'apparaît qu'une fois le sommaire sorti de l'écran (toujours, sans IntersectionObserver).
  const [sommaireVisible, setSommaireVisible] = useState(true)

  // À l'ouverture de la page, le lecteur d'écran (et le clavier) partent de son titre.
  useEffect(() => titre.current?.focus(), [])

  useEffect(() => {
    const element = sommaire.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      setSommaireVisible(false)
      return
    }
    const observateur = new IntersectionObserver(([entree]) => setSommaireVisible(entree.isIntersecting))
    observateur.observe(element)
    return () => observateur.disconnect()
  }, [])

  // Les liens du sommaire font défiler la page sans toucher à l'adresse : l'ancre « # » y désigne la page
  // affichée (navigateur/adresse.ts), et la changer ramènerait au jeu.
  const versPartie = (id: IdPartie) => (evenement: MouseEvent<HTMLAnchorElement>) => {
    evenement.preventDefault()
    allerA(document.getElementById(`savoir-${id}`))
  }

  const unite = STEAK.equivalent.unite ?? 'unité'

  return (
    <article className="savoir" aria-labelledby="savoir-titre">
      <h2 id="savoir-titre" ref={titre} tabIndex={-1}>
        En savoir plus
      </h2>
      <p className="savoir__chapo">
        Pourquoi ce jeu, d'où viennent ses chiffres et comment on s'en sert, ce qu'il garde de toi, et ce qu'il a
        coûté.
      </p>

      <nav ref={sommaire} className="savoir__sommaire" aria-labelledby="savoir-sommaire">
        <p id="savoir-sommaire" ref={titreDuSommaire} className="savoir__sommaire-titre" tabIndex={-1}>
          Sommaire
        </p>
        <ol>
          {(Object.keys(PARTIES) as IdPartie[]).map((id) => (
            <li key={id}>
              <a href={`#savoir-${id}`} onClick={versPartie(id)}>
                {PARTIES[id]}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Partie id="pourquoi">
        <p>
          On estime très mal l'empreinte carbone de nos gestes du quotidien. On surestime ce qui se voit (un emballage,
          un mail) et on sous-estime ce qui ne se voit pas (la viande, la fabrication d'un smartphone, l'avion).
        </p>
        <p>
          Les bons chiffres existent : l'ADEME les publie. Mais un chiffre lu dans un tableau s'oublie vite. Duel
          Carbone fait le pari du jeu : deux gestes, un choix, puis la réponse et ce qui pèse vraiment. On apprend en se
          trompant, sans leçon de morale.
        </p>
        <p>
          C'est un jeu gratuit, sans publicité, sans compte et sans cookie : un projet indépendant, pour que chacun
          sache où portent ses efforts.
        </p>
      </Partie>

      <Partie id="chiffres">
        <p>
          Toutes les empreintes carbone viennent de l'ADEME, l'Agence de la transition écologique. C'est un
          établissement public, placé sous la tutelle des ministères chargés de l'environnement, de l'énergie et de la
          recherche. Elle accompagne l'État, les entreprises, les collectivités et les citoyens pour baisser la
          consommation d'énergie, développer les énergies renouvelables et réduire les émissions de gaz à effet de
          serre : elle apporte son expertise, finance des projets, soutient la recherche et l'innovation, et informe le
          public (<a href={ADEME}>les missions de l'ADEME</a>).
        </p>
        <p>
          Parmi ses outils, <a href={IMPACT_CO2}>Impact CO2</a> mesure l'empreinte des objets et des gestes du
          quotidien sur tout leur cycle de vie : fabrication, transport, usage, fin de vie.
        </p>
        <p>
          Le jeu en garde une copie datée, mise à jour à la main : {NOMBRE_DE_GESTES} gestes (dont {NOMBRE_DE_RESERVES}{' '}
          réservés aux Duels ★), construits à partir de {NOMBRE_DE_FICHES} fiches de l'ADEME.
        </p>
        <p className="savoir__citation">Source : ADEME, Impact CO2, données du {DATE_INSTANTANE}.</p>
        <p>
          L'ADEME autorise la réutilisation non commerciale et pédagogique de ses informations, à condition d'en
          respecter le sens et d'en citer l'origine et la date (<a href={MENTIONS_LEGALES_ADEME}>mentions légales
          d'Impact CO2</a>). Les données restent la propriété de l'ADEME. Duel Carbone est un projet indépendant : il
          n'est pas édité par l'ADEME.
        </p>
      </Partie>

      <Partie id="co2e">
        <DefinitionCo2e niveau="h4" />
      </Partie>

      <Partie id="calcul">
        <p>
          L'ADEME donne une valeur par unité : par kg pour un aliment, par km et par passager pour un trajet, par
          objet pour un appareil. Pour comparer des choses parlantes, le jeu multiplie cette valeur par une quantité
          réaliste. Par exemple :
        </p>
        <p className="savoir__formule">
          {STEAK.titre} ({STEAK.sousTitre}) = {nombre(STEAK.quantite)} {unite} ×{' '}
          {formaterEmpreinte(STEAK.equivalent.valeur)} par {unite} = {formaterEmpreinte(STEAK.empreinte)}
        </p>
        <p>
          La valeur par unité est toujours celle de l'ADEME, sans retouche : seule la quantité est notre choix, et
          chaque geste l'affiche sous son nom. Après chaque Duel, un lien mène à la fiche ADEME de chaque geste ; ici,
          la <a href={STEAK.equivalent.url}>fiche ADEME du bœuf</a>.
        </p>
      </Partie>

      <Partie id="objets">
        <p>
          Pour un appareil ou un vêtement, l'empreinte compte sa fabrication, sa fin de vie et son usage pendant la
          durée d'utilisation retenue par l'ADEME
          {TELEVISION.usage && ` (par exemple ${TELEVISION.usage.dureeAns} ans pour une télévision)`}. Le jeu reprend
          ces durées telles quelles et les affiche sous le nom de l'objet.
        </p>
      </Partie>

      <Partie id="reglages">
        <p>
          Impact CO2 permet d'ajuster certains calculs, comme le nombre de passagers d'une voiture ou l'effet des
          traînées de condensation des avions. Le jeu garde toujours les réglages par défaut de l'ADEME : l'avion
          compte donc l'effet de ses traînées
          {PART_DES_TRAINEES !== null && ` (${PART_DES_TRAINEES} % de l'empreinte d'un Paris–New York)`}. Un trajet
          compte toujours la part d'une seule personne : en covoiturage à 4, ta part est un quart du trajet.
        </p>
        <p>
          Une seule exception, pour comparer un film en streaming et un film téléchargé : le streaming est compté sans
          la construction de l'écran, comme le permet le calculateur d'Impact CO2, car l'ADEME ne la compte pas non
          plus pour le téléchargement.
        </p>
        <p>
          L'électricité, enfin, est celle de la France. Pour tout ce qui en consomme pendant son usage (appareils,
          numérique, chauffage électrique, train, voiture électrique…), l'ADEME compte le mix électrique moyen
          français, l'un des moins carbonés d'Europe grâce au nucléaire et aux renouvelables. Dans un pays où
          l'électricité vient davantage du charbon ou du gaz, les mêmes Gestes émettent plus, parfois plusieurs fois
          plus : les chiffres du jeu valent pour la France.
        </p>
      </Partie>

      <Partie id="regles">
        <p>
          Chaque jour, le Duel Carbone du jour propose la même Partie à tous les joueurs : elle change à minuit, heure
          de Paris, et ne se joue qu'une fois. Ses Duels sont tirés à l'avance, selon les mêmes règles que la Partie
          libre, que tu peux rejouer à volonté pour t'entraîner.
        </p>
        <p>
          Une Partie, c'est {REGLES.nombreDeDuels} Duels, sans chrono, de plus en plus serrés. Au Duel 1, l'un des
          deux gestes émet entre {nombre(PREMIERE_TRANCHE.min)} et {nombre(PREMIERE_TRANCHE.max)} fois plus que
          l'autre ; au Duel {REGLES.nombreDeDuels}, entre {nombre(DERNIERE_TRANCHE.min)} et{' '}
          {nombre(DERNIERE_TRANCHE.max)} fois seulement. Jamais moins de {nombre(REGLES.plancher)} fois : en dessous,
          l'écart pourrait tenir dans la marge d'erreur des données.
        </p>
        <p>
          {FREQUENCE_THEMATIQUE} contient un Duel ★, et jamais plus de {REGLES.partiesMaxSansDuelThematique}{' '}
          Parties de suite sans : un piège choisi à la main pour ce qu'il nous apprend, annoncé quand tu arrives
          dessus, et expliqué après ta réponse. Il prend la place que lui donne son écart : un piège
          serré tombe en fin de Partie. Certains gestes, comme le pain au chocolat ou le TER, ne servent qu'à ces
          Duels.
        </p>
        <p>
          Quelques Duels ★ comparent des secteurs entiers, sur un an en France : le numérique, les voitures, les
          bovins… Ce sont des cas pratiques de l'ADEME, dont le périmètre est rappelé sous leur nom. Ils ne sont pas
          tous mesurés de la même façon : le numérique compte la fabrication des appareils, où qu'ils soient
          fabriqués, alors que les autres sont des inventaires des émissions en France.
        </p>
      </Partie>

      <Partie id="installer">
        <p>
          Pour ne manquer aucun Duel du jour, installe Duel Carbone sur l’écran d’accueil de ton téléphone : il
          s’ouvre en un geste, en plein écran, comme une appli. Il fonctionne aussi hors ligne : une fois le jeu
          ouvert, plus besoin de réseau pour jouer (dans le métro, en avion…). Rien à télécharger depuis un magasin
          d’applications, et toujours ni compte ni cookie.
        </p>
        <GuideInstallation />
      </Partie>

      <Partie id="vie-privee">
        <p>
          Sans cookie, sans compte. Ton record, ta Partie du jour (pour la reprendre ou revoir ton résultat), ta
          série, les derniers Duels joués (pour ne pas te reposer les mêmes) et ton éventuel « Non merci » à
          l’invitation à installer le jeu sont gardés dans ton navigateur, sur cet appareil. Ils ne sont envoyés nulle part.
        </p>
        <p>
          Pour que le jeu marche sans réseau (et s'installe sur ton écran d'accueil), ton navigateur garde aussi une
          copie de ses fichiers, moins d'1 Mo : le code, les icônes et le calendrier des Duels du jour. Une nouvelle
          version du jeu la remplace d'elle-même, jamais en pleine Partie.
        </p>
        <p>
          Rien ne part sans toi : quand tu défies tes proches, c'est toi qui choisis où envoyer le texte. Il ne contient
          que ton score, une case verte ou rouge par Duel et le lien du jeu, jamais le nom des gestes : il ne gâche pas
          la Partie des autres.
        </p>
        <p>
          Le jeu est hébergé par Cloudflare : comme tout hébergeur, il reçoit les demandes de ton navigateur (dont ton
          adresse IP) pour t'envoyer les pages du jeu.
        </p>
        <p>
          Pour savoir si le jeu plaît, nous comptons les visites et quelques moments de jeu (une Partie lancée, terminée
          et sa durée approximative, « Rejouer », un partage, l'invitation à installer le jeu et sa réponse, et les plantages du jeu, sans leur détail) avec{' '}
          <a href={GOATCOUNTER}>GoatCounter</a>, une mesure
          d'audience sans cookie ni identifiant. Elle ne donne que des chiffres agrégés : elle ne peut pas te suivre
          d'un site à l'autre, ne conserve pas ton adresse IP, et ni ton score ni tes réponses ne lui sont envoyés. Si
          ton navigateur la bloque, le jeu marche tout autant.
        </p>
      </Partie>

      <Partie id="empreinte">
        <p>
          Ce jeu a été codé avec l'aide d'une IA, Claude (d'Anthropic) : un humain pilote et valide, l'IA écrit le code
          et l'explique. Cela consomme de l'électricité, dans les centres de données qui font tourner le modèle.
        </p>
        <p className="savoir__citation">
          Estimation au {formaterDate(DATE_DU_DECOMPTE)} : environ {kgIa('centrale')} kg CO2e, entre{' '}
          {kgIa('basse')} et {kgIa('haute')} kg selon les hypothèses. Du même ordre que{' '}
          {enMinuscule(FRIENDS.titre)} ({FRIENDS.sousTitre}) : {formaterEmpreinte(FRIENDS.empreinte)} selon l'ADEME.
        </p>
        <p>
          Ce chiffre-là ne vient pas de l'ADEME : aucune source publique ne donne l'énergie consommée par ce modèle.
          Nous l'avons estimé à partir des {nombre(APPELS)} échanges avec le modèle depuis le{' '}
          {formaterDate(DEBUT_DU_PROJET)} (le nombre de mots lus et écrits), de l'énergie estimée pour des modèles
          comparables (par Epoch AI, et par une étude universitaire sur Claude), et de l'électricité des centres de
          données d'Amazon, où tournent ses serveurs. Il ne compte ni
          l'entraînement du modèle, ni la fabrication des serveurs : c'est un ordre de grandeur, qui grandira avec le
          projet. La <a href={METHODE_EMPREINTE_IA}>méthode détaillée</a> est sur GitHub.
        </p>
        <p>
          Cette estimation est aussi devenue un Geste du jeu, caché dans deux Duels ★. Ouvre l'œil : c'est le seul
          chiffre d'un Duel qui ne vient pas de l'ADEME.
        </p>
      </Partie>

      <Partie id="projet">
        <p>
          <a href={DEPOT}>Suivre le projet sur GitHub</a> : le <a href={DEPOT}>code source du jeu</a> est public, sous
          licence MIT. Une erreur, une idée ? Écris à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>, ou{' '}
          <a href={`${DEPOT}/issues`}>dis-le sur GitHub</a>.
        </p>
        <p>
          Les icônes viennent de <a href={FLUENT_EMOJI}>Fluent Emoji</a>, de Microsoft, sous licence MIT. Quand aucune
          ne parlait assez, nous avons dessiné la nôtre dans le même style (le micro-ondes, le lave-linge…).
        </p>
      </Partie>

      <Partie id="mentions">
        <p>
          Éditeur et directeur de la publication : Fabien Lesage. Contact :{' '}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
        <p>Hébergeur : Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis, +1 650 319 8930.</p>
        <p>
          Duel Carbone est un projet personnel, gratuit et sans publicité, sans lien avec l'ADEME, dont il réutilise
          les données en citant leur source.
        </p>
        <p>
          Les valeurs affichées sont celles de l'ADEME pour une consommation en France, avec notamment le mix
          électrique français : les émissions d'un même Geste peuvent être différentes dans un autre pays.
        </p>
      </Partie>

      {/* « Retour au jeu » reste collé en bas de l'écran, comme « Duel suivant » : pas besoin de remonter. */}
      <div className="savoir__suite">
        <div className="savoir__suite-barre">
          <a className="bouton" href={ADRESSES.jeu}>
            ← Retour au jeu
          </a>
          {!sommaireVisible && (
            <button
              type="button"
              className="bouton bouton--secondaire savoir__haut"
              aria-label="Remonter au sommaire"
              onClick={() => allerA(titreDuSommaire.current)}
            >
              <span aria-hidden="true">↑</span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
