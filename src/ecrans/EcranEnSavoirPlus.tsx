import { CONSEILS } from '../donnees/conseils.ts'
import { CONSEILS_RECENTS } from '../domaine/conseils.ts'
import { GESTES_CALCULES, gesteCalcule, INSTANTANE } from '../donnees/index.ts'
import { enMinuscule, formaterDate, formaterEmpreinte } from '../domaine/format.ts'
import { REGLES } from '../domaine/regles.ts'
import { MEMOIRE_DU_CALENDRIER } from '../domaine/calendrier.ts'
import { PARTIES_MEMORISEES } from '../navigateur/taille-memoire.ts'
import { APPELS, DATE_DU_DECOMPTE, DEBUT_DU_PROJET, HYPOTHESES, JETONS } from '../donnees/empreinte-ia.ts'
import { empreinteDeLaCreation } from '../domaine/empreinte-ia.ts'
import {
  ADEME,
  CONTACT,
  DEPOT,
  FLUENT_EMOJI,
  GALERIE_IMPACT_CO2,
  IMPACT_CO2,
  MENTIONS_LEGALES_ADEME,
  METHODE_EMPREINTE_IA,
} from '../liens.ts'
import { ADRESSES } from '../navigateur/adresse.ts'
import { DefinitionCo2e } from '../composants/Co2e.tsx'
import { GuideInstallation } from '../composants/InvitationInstallation.tsx'
import { PageDeLecture, Renvoi, type PartieDeLecture } from '../composants/PageDeLecture.tsx'

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

/** La fréquence des Duels ★, lue dans les règles : « une Partie sur deux », « 30 % des Parties »… */
const FREQUENCE_THEMATIQUE =
  REGLES.probabiliteDuelThematique === 0.5
    ? 'une Partie sur deux'
    : `${nombre(REGLES.probabiliteDuelThematique * 100)} % des Parties`
/** Et dans le Duel du jour : « 2 jours sur 3 », « 70 % des jours »… */
const FREQUENCE_THEMATIQUE_DU_JOUR =
  Math.abs(REGLES.duelDuJour.probabiliteDuelThematique - 2 / 3) < 1e-9
    ? '2 jours sur 3'
    : `${nombre(REGLES.duelDuJour.probabiliteDuelThematique * 100)} % des jours`

// Les exemples : un aliment (le calcul), un appareil (la durée d'utilisation), un vol (les traînées de condensation).
const STEAK = gesteCalcule('steak-boeuf')
const TELEVISION = gesteCalcule('television')
const NEW_YORK = gesteCalcule('paris-new-york')
const trainees = NEW_YORK.etapes.find((e) => e.libelle === 'Traînées de condensation')
const PART_DES_TRAINEES = trainees ? Math.round((trainees.valeur / NEW_YORK.empreinte) * 100) : null

// L'empreinte de la création du jeu par IA (domaine/empreinte-ia.ts), arrondie au kilo : c'est une estimation.
const kgIa = (h: keyof typeof HYPOTHESES) => Math.round(empreinteDeLaCreation(JETONS, HYPOTHESES[h]).kgCo2e)
const FRIENDS = gesteCalcule('friends')

// L'exemple de calcul d'un Conseil : 2 repas au bœuf par semaine devenus végétariens, avec les valeurs de l'Instantané.
const REPAS_BOEUF = gesteCalcule('repas-boeuf')
const REPAS_VEGETARIEN = gesteCalcule('repas-vegetarien')
const ECONOMIE_VEGETARIENNE = 2 * 52 * (REPAS_BOEUF.empreinte - REPAS_VEGETARIEN.empreinte)

const PREMIERE_TRANCHE = REGLES.tranchesParDuel[0]
const DERNIERE_TRANCHE = REGLES.tranchesParDuel[REGLES.tranchesParDuel.length - 1]

const UNITE_DU_STEAK = STEAK.equivalent.unite ?? 'unité'

/**
 * Les parties de la page, dans l'ordre : le jeu d'abord (pourquoi, ses règles, ses Conseils), puis ses chiffres et
 * leur méthode, l'installation, ce qu'il a coûté et le projet. Ce que le jeu garde de toi, et les mentions légales, sont
 * sur leur propre page (EcranMentionsLegales.tsx).
 */
const PARTIES: PartieDeLecture[] = [
  {
    id: 'pourquoi',
    titre: 'Pourquoi Duel Carbone ?',
    contenu: (
      <>
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
      </>
    ),
  },
  {
    id: 'regles',
    titre: 'Les règles du jeu',
    contenu: (
      <>
        <p>
          Chaque jour, le Duel Carbone du jour propose la même Partie à tous les joueurs : elle change à minuit, heure
          de Paris, et ne se joue qu'une fois. Ses Duels sont tirés à l'avance, selon les mêmes règles que la Partie
          libre, que tu peux rejouer à volonté pour t'entraîner. Un même Duel ne revient pas avant{' '}
          {MEMOIRE_DU_CALENDRIER} jours dans le Duel du jour, ni avant {PARTIES_MEMORISEES} Parties en Partie libre,
          qui évite aussi les Duels du jour récents.
        </p>
        <p>
          Une Partie, c'est {REGLES.nombreDeDuels} Duels, sans chrono, de plus en plus serrés. Au Duel 1, l'un des
          deux gestes émet entre {nombre(PREMIERE_TRANCHE.min)} et {nombre(PREMIERE_TRANCHE.max)} fois plus que
          l'autre ; au Duel {REGLES.nombreDeDuels}, entre {nombre(DERNIERE_TRANCHE.min)} et{' '}
          {nombre(DERNIERE_TRANCHE.max)} fois seulement. Jamais moins de {nombre(REGLES.plancher)} fois : en dessous,
          l'écart pourrait tenir dans la marge d'erreur des données.
        </p>
        <p>
          Le Duel du jour contient un Duel ★ {FREQUENCE_THEMATIQUE_DU_JOUR}, et jamais plus de{' '}
          {REGLES.duelDuJour.joursMaxSansDuelThematique} jours de suite sans : un piège choisi à la main pour ce
          qu'il nous apprend, annoncé quand tu arrives dessus, et expliqué après ta réponse. Et chacun revient à son
          tour, une fois que tous les autres sont passés. En Partie libre, c'est {FREQUENCE_THEMATIQUE}, et jamais
          plus de {REGLES.partiesMaxSansDuelThematique} Parties de suite sans. Un Duel ★ prend la place que lui
          donne son écart : un piège serré tombe en fin de Partie. Certains gestes, comme l'eau du robinet ou les
          recherches sur le web, ne servent qu'à ces Duels.
        </p>
        <p>
          Quelques Duels ★ comparent des secteurs entiers, sur un an en France : le numérique, les voitures, les
          bovins… Ce sont des cas pratiques de l'ADEME, dont le périmètre est rappelé sous leur nom. Ils ne sont pas
          tous mesurés de la même façon : le numérique compte la fabrication des appareils, où qu'ils soient
          fabriqués, alors que les autres sont des inventaires des émissions en France.
        </p>
        <p>
          Une fois ton Duel du jour joué, le Rang du jour te dit où tu te situes : « Tu as fait mieux ou autant que
          x % des joueurs jusqu’ici ». Il compare ton score à celui des autres joueurs du jour, sans toi, et
          bouge au fil de la journée. Il n’apparaît qu’à partir de {REGLES.rangDuJour.joueursMinimum} joueurs dans la
          journée, et seule la première Partie du jour de chaque appareil compte, si elle se termine avant minuit. La
          Partie libre n’a pas de Rang.
        </p>
        <p>
          Dans le Duel du jour comme en Partie libre, chaque réponse dévoile aussi la part des réponses identiques à la
          tienne : « 72&nbsp;%
          comme toi », avec une petite barre. Si tu as trouvé, c’est la part des bonnes réponses ; si tu t’es trompé,
          celle des réponses fausses. Elle compte toutes les réponses données à cette paire de gestes, quel que soit le
          jour, dans un sens ou dans l’autre (le jean face au pull, ou le pull face au jean). Ce sont des réponses et
          non des joueurs : on peut retomber sur une même paire. Elle n’apparaît qu’à partir de{' '}
          {REGLES.tauxDErreur.reponsesMinimum} réponses.
        </p>
      </>
    ),
  },
  {
    id: 'conseils',
    titre: 'Les Conseils de fin de Partie',
    contenu: (
      <>
        <p>
          À la fin de chaque Partie, un Conseil propose une action concrète, liée à un geste de ta Partie, de
          préférence à un Duel que tu as raté. Le jeu en compte {CONSEILS.length}, écrits par Duel Carbone : l'ADEME
          publie des idées pour agir, mais pas de conseil chiffré pour chaque geste. Un même Conseil ne revient pas
          avant {CONSEILS_RECENTS} Parties.
        </p>
        <p>
          Leurs chiffres ne sont jamais écrits à la main : ils sont calculés avec les mêmes valeurs de l'ADEME que les
          Duels, pour ne jamais les contredire. Seules les hypothèses sont notre choix (2 repas par semaine, 10 km
          pour aller au travail, 220 jours de travail par an…), et elles sont écrites dans le texte. Par exemple :
        </p>
        <p className="savoir__formule">
          2 repas × 52 semaines × ({formaterEmpreinte(REPAS_BOEUF.empreinte)} pour un repas avec du bœuf −{' '}
          {formaterEmpreinte(REPAS_VEGETARIEN.empreinte)} pour un repas végétarien) ={' '}
          {formaterEmpreinte(ECONOMIE_VEGETARIENNE)} de moins par an
        </p>
        <p>
          Le Conseil l'arrondit (« environ {formaterEmpreinte(Math.round(ECONOMIE_VEGETARIENNE / 10) * 10)} ») et
          renvoie vers une page de l'ADEME pour aller plus loin : une action de Nos Gestes Climat, ou les questions
          fréquentes d'Impact CO2. Les liens vers les actions de Nos Gestes Climat sont faits avec l'accord de l'ADEME.
        </p>
      </>
    ),
  },
  {
    id: 'chiffres',
    titre: "D'où viennent les chiffres",
    contenu: (
      <>
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
        {/* En texte seul : les logos de l'ADEME et d'Impact CO2 ne se reproduisent pas sans son accord écrit. */}
        <p>
          Duel Carbone figure dans la <a href={GALERIE_IMPACT_CO2}>galerie des exemples d'Impact CO2</a> (ADEME),
          catégorie Associations, parmi les sites qui utilisent ses données. Ce n'est pas un partenariat avec l'ADEME.
        </p>
      </>
    ),
  },
  { id: 'co2e', titre: "L'unité : le CO2e", contenu: <DefinitionCo2e niveau="h4" /> },
  {
    id: 'calcul',
    titre: 'Le calcul : Geste = Équivalent × Quantité',
    contenu: (
      <>
        <p>
          L'ADEME donne une valeur par unité : par kg pour un aliment, par km et par passager pour un trajet, par
          objet pour un appareil. Pour comparer des choses parlantes, le jeu multiplie cette valeur par une quantité
          réaliste. Par exemple :
        </p>
        <p className="savoir__formule">
          {STEAK.titre} ({STEAK.sousTitre}) = {nombre(STEAK.quantite)} {UNITE_DU_STEAK} ×{' '}
          {formaterEmpreinte(STEAK.equivalent.valeur)} par {UNITE_DU_STEAK} = {formaterEmpreinte(STEAK.empreinte)}
        </p>
        <p>
          La valeur par unité est toujours celle de l'ADEME, sans retouche : seule la quantité est notre choix, et
          chaque geste l'affiche sous son nom. Après chaque Duel, un lien mène à la fiche ADEME de chaque geste ; ici,
          la <a href={STEAK.equivalent.url}>fiche ADEME du bœuf</a>.
        </p>
      </>
    ),
  },
  {
    id: 'objets',
    titre: "Les objets : la durée d'utilisation retenue par l'ADEME",
    contenu: (
      <>
        <p>
          Pour un appareil ou un vêtement, l'empreinte compte sa fabrication, sa fin de vie et son usage pendant la
          durée d'utilisation retenue par l'ADEME
          {TELEVISION.usage && ` (par exemple ${TELEVISION.usage.dureeAns} ans pour une télévision)`}. Le jeu reprend
          ces durées telles quelles et les affiche sous le nom de l'objet.
        </p>
      </>
    ),
  },
  {
    id: 'reglages',
    titre: "Les réglages : ceux de l'ADEME, par défaut",
    contenu: (
      <>
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
      </>
    ),
  },
  {
    id: 'installer',
    titre: 'Jouer hors ligne : installer le jeu',
    contenu: (
      <>
        <p>
          Pour ne manquer aucun Duel du jour, installe Duel Carbone sur l’écran d’accueil de ton téléphone : il
          s’ouvre en un geste, en plein écran, comme une appli. Il fonctionne aussi hors ligne : une fois le jeu
          ouvert, plus besoin de réseau pour jouer (dans le métro, en avion…). Rien à télécharger depuis un magasin
          d’applications, et toujours ni compte ni cookie.
        </p>
        <GuideInstallation />
      </>
    ),
  },
  {
    id: 'empreinte',
    titre: 'L’empreinte de ce jeu',
    contenu: (
      <>
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
      </>
    ),
  },
  {
    id: 'projet',
    titre: 'Suivre le projet',
    contenu: (
      <>
        <p>
          <a href={DEPOT}>Suivre le projet sur GitHub</a> : le <a href={DEPOT}>code source du jeu</a> est public, sous
          licence MIT. Une erreur, une idée ? Écris à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>, ou{' '}
          <a href={`${DEPOT}/issues`}>dis-le sur GitHub</a>.
        </p>
        <p>
          Les icônes viennent de <a href={FLUENT_EMOJI}>Fluent Emoji</a>, de Microsoft, sous licence MIT. Quand aucune
          ne parlait assez, nous avons dessiné la nôtre dans le même style (le micro-ondes, le lave-linge…).
        </p>
      </>
    ),
  },
]

/** La page « En savoir plus » : le projet, ses règles, les sources et la méthode, et l'empreinte du jeu. */
export function EcranEnSavoirPlus() {
  return (
    <PageDeLecture
      titre="En savoir plus"
      chapo="Pourquoi ce jeu, comment il se joue, d'où viennent ses chiffres et comment on s'en sert, et ce qu'il a coûté."
      parties={PARTIES}
    >
      <Renvoi adresse={ADRESSES.mentionsLegales}>Ce que le jeu garde de toi, et les mentions légales →</Renvoi>
    </PageDeLecture>
  )
}
