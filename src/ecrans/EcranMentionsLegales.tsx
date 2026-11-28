import { REGLES } from '../domaine/regles.ts'
import { HEURE_DU_RAPPEL, JOURS_DE_CONSERVATION } from '../domaine/rappel.ts'
import { CNIL_PLAINTE, CONTACT, GOATCOUNTER, MENTIONS_LEGALES_ADEME } from '../liens.ts'
import { ADRESSES } from '../navigateur/adresse.ts'
import { PageDeLecture, Renvoi, type PartieDeLecture } from '../composants/PageDeLecture.tsx'

/** L'adresse de contact, en lien « mailto: » : on y écrit pour toute question ou demande sur ses données. */
const Contact = () => <a href={`mailto:${CONTACT}`}>{CONTACT}</a>

const { dureeMaxEnHeures, effacementEnHeures, longueurMaxDuPseudo } = REGLES.seance

/**
 * Les parties de la page, dans l'ordre : ce que le jeu garde de toi d'abord (c'est ce qu'on vient chercher), puis
 * pourquoi il en a le droit, ce que tu peux demander, qui l'édite, et à quelles conditions il reprend les données de
 * l'ADEME (décision de l'issue 111, variante A). Juste après « Ta vie privée », la Séance du Mode animation, seul
 * moment où le serveur garde des données personnelles, et pour 24 heures au plus (ADR 0007, lot 4 : issue 137).
 * Puis le Rappel du matin (ADR 0008) : la seule donnée personnelle que le serveur garde dans la durée, et seulement
 * si le joueur la demande (90 jours au plus après sa dernière visite).
 *
 * Les faits sur les prestataires ont été vérifiés le 27/11/2026 dans leurs pages officielles : GoatCounter
 * (goatcounter.com/help/privacy, /help/sessions : données chez Hetzner en Finlande et en Allemagne, adresse IP jamais
 * enregistrée) et Cloudflare (cloudflare.com/privacypolicy, /cloudflare-customer-dpa : sous-traitant, Data Privacy
 * Framework et clauses contractuelles types, pas de durée de conservation publiée). À revoir s'ils changent.
 */
const PARTIES: PartieDeLecture[] = [
  {
    id: 'vie-privee',
    titre: 'Ta vie privée',
    contenu: (
      <>
        <p>
          Sans cookie, sans compte. Ton record, ta Partie du jour (pour la reprendre ou revoir ton résultat), ta
          série, les derniers Duels joués et les derniers Conseils lus (pour ne pas te reposer les mêmes) et ton éventuel « Non merci » à
          l’invitation à installer le jeu ou au Rappel du matin sont gardés dans ton navigateur, sur cet appareil. Ils ne sont envoyés nulle part.
        </p>
        <p>
          Pour le Rang du jour et la part des réponses identiques à la tienne, le jeu échange deux fois avec son serveur
          pendant ton Duel du jour. Au début, il lui demande, pour chacune des {REGLES.nombreDeDuels} paires de gestes,
          combien de réponses ont été données et combien étaient fausses. À la fin, il envoie une seule fois le numéro
          du Duel et les {REGLES.nombreDeDuels} gestes que tu as choisis. Le serveur recalcule ton score et tes bonnes
          réponses, ajoute 1 au nombre de joueurs qui ont fait ce score ce jour-là, et ajoute ta réponse au total de
          chaque paire. C’est tout ce qu’il garde : pour chaque jour, combien de joueurs ont fait 0, 1…{' '}
          {REGLES.nombreDeDuels} ; pour chaque paire de gestes, combien de réponses et combien de fausses, tous jours
          confondus. Ni tes choix un par un, ni l’heure, ni ton adresse IP, ni aucun identifiant : personne, pas même
          nous, ne peut savoir qui a répondu quoi. Ces chiffres sont gardés chez Cloudflare, dans l’Union européenne.
          La Partie libre fait de même pour la part des réponses (ses {REGLES.nombreDeDuels} paires au début, ses{' '}
          {REGLES.nombreDeDuels} Duels et tes choix à la fin), sans rien pour le Rang du jour. Sans réseau, le jeu marche
          tout autant.
        </p>
        <p>
          Pour que le jeu marche sans réseau (et s'installe sur ton écran d'accueil), ton navigateur garde aussi une
          copie de ses fichiers, moins d'1 Mo : le code, les icônes et le calendrier des Duels du jour. Une nouvelle
          version du jeu la remplace d'elle-même, jamais en pleine Partie.
        </p>
        <p>
          Rien ne part sans toi : quand tu défies tes proches, c'est toi qui choisis où envoyer le texte. Il ne contient
          que ton score, une case verte ou rouge par Duel et le lien du jeu, jamais le nom des gestes : il ne gâche pas
          la Partie des autres. L'image à partager en Story est fabriquée sur ton appareil, avec les mêmes
          informations, et ne part que là où tu l'envoies.
        </p>
        <p>
          Le jeu est hébergé par Cloudflare : comme tout hébergeur, il reçoit les demandes de ton navigateur (dont ton
          adresse IP) pour t'envoyer les pages du jeu.
        </p>
        <p>
          Pour savoir si le jeu plaît, nous comptons les visites et quelques moments de jeu (une Partie lancée, terminée
          et sa durée approximative, la longueur de ta série quand tu lances le Duel du jour, « Rejouer », un partage en texte ou en image, le lien « En savoir plus » d'un Conseil, l'invitation à installer le jeu et sa réponse, l'ouverture du QR code sur ordinateur, la proposition du Rappel du matin et sa réponse (acceptée, refusée ou bloquée par le navigateur), l'ouverture du jeu depuis un Rappel, les Séances du Mode animation créées, rejointes et terminées, avec leur nombre de Participants, et les plantages du jeu, sans leur détail) avec{' '}
          <a href={GOATCOUNTER}>GoatCounter</a>, une mesure
          d'audience sans cookie ni identifiant. Elle ne donne que des chiffres agrégés : elle ne peut pas te suivre
          d'un site à l'autre, n'enregistre pas ton adresse IP, et ni ton score ni tes réponses ne lui sont envoyés. Si
          ton navigateur la bloque, le jeu marche tout autant.
        </p>
      </>
    ),
  },
  {
    id: 'seance',
    titre: 'Pendant une Séance du Mode animation',
    contenu: (
      <>
        <p>
          Une Séance fait jouer toute une salle en direct : l'Animateur projette les Duels, chacun répond sur son
          téléphone. C'est le seul moment où le serveur du jeu garde des données qui te concernent, et seulement le
          temps de la Séance.
        </p>
        <p>
          Quand tu rejoins une Séance, ton téléphone tire au hasard un jeton, qu'il garde dans ton navigateur et envoie
          avec chacune de tes réponses : il te rend ta place si la connexion se coupe ou si ton téléphone se met en
          veille. Il ne vaut que pour cette Séance : il ne permet pas de te reconnaître d'une Séance à l'autre. Le
          serveur de la Séance garde ce jeton, tes réponses (pour ton score, le classement et la part de la salle) et,
          si l'Animateur a choisi un classement, ton pseudo ({longueurMaxDuPseudo} caractères au plus), que
          l'Animateur peut retirer d'un clic. L'ordinateur de l'Animateur garde de même son propre jeton, qui lui
          seul permet de faire avancer la Séance. Jamais ton adresse IP.
        </p>
        <p>
          Ces données restent chez Cloudflare, dans l'Union européenne. La Séance se ferme {dureeMaxEnHeures} heures
          après sa création, et tout est effacé au bout de {effacementEnHeures} heures. Ne restent que des totaux sans
          nom : tes réponses s'ajoutent à la part des réponses fausses de chaque paire de gestes, comme dans une
          Partie, et la mesure d'audience compte les Séances créées, les Participants qui les rejoignent et leur
          nombre à la fin.
        </p>
        <p>
          Le responsable de ces données est l'éditeur du jeu, pas l'Animateur : il se sert d'un outil public et
          gratuit. Les jetons gardés sur ton téléphone et sur l'ordinateur de l'Animateur sont strictement nécessaires
          pour jouer la Séance que tu as choisi de rejoindre : la loi n'exige pas d'accord pour eux, il n'y a donc pas
          de bandeau à accepter.
        </p>
      </>
    ),
  },
  {
    id: 'rappel',
    titre: 'Si tu demandes le Rappel du matin',
    contenu: (
      <>
        <p>
          Le Rappel du matin est une notification envoyée chaque jour à {HEURE_DU_RAPPEL} h à ceux qui l'ont demandé. C'est la seule
          donnée personnelle que le jeu confie à son serveur dans la durée, et seulement si tu la demandes, en touchant
          « Activer le Rappel » puis en autorisant les notifications.
        </p>
        <p>
          Ton navigateur reçoit alors de son service de notification une adresse d'envoi, propre à ce navigateur sur
          cet appareil, et deux clés de chiffrement. Le serveur garde cet « abonnement », et le jour où tu as ouvert le
          jeu pour la dernière fois (le jour seulement, pas l'heure) : à chaque ouverture, le jeu le lui renvoie.
          Rien d'autre : ni ton score, ni ta série, ni si tu as joué ce jour-là, ni ton adresse IP. Ces données sont
          gardées chez Cloudflare, dans l'Union européenne.
        </p>
        <p>
          Chaque matin, le serveur confie le Rappel au service de notification de ton navigateur, qui le porte jusqu'à
          ton appareil : Apple (Safari, sur iPhone, iPad et Mac), Google (Chrome, et la plupart des navigateurs
          Android), Mozilla (Firefox) ou Microsoft (Edge sur ordinateur), des sociétés américaines. C'est ton
          navigateur qui le choisit, pas nous. Le message est chiffré : ce service voit l'adresse d'envoi et
          l'heure, mais ne peut pas le lire.
        </p>
        <p>
          L'abonnement est effacé dès que tu arrêtes le Rappel (à la fin du Duel du jour, ou dans la page En savoir
          plus), dès que le service de notification le dit invalide (notifications coupées dans les réglages, jeu
          désinstallé), et au plus tard {JOURS_DE_CONSERVATION} jours après ta dernière ouverture du jeu. Il repose sur
          ton accord (article 6.1.a du RGPD), que tu retires en arrêtant le Rappel ou en coupant les notifications.
        </p>
      </>
    ),
  },
  {
    id: 'base-legale',
    titre: 'Qui est responsable, et sur quelle base',
    contenu: (
      <>
        <p>
          Le responsable du traitement est l'éditeur du jeu, Fabien Lesage (<Contact />). Ce que ton navigateur garde
          sur ton appareil sert seulement à faire marcher le jeu et ne nous est jamais envoyé. Les totaux du Rang du
          jour et de la part des réponses ne permettent de reconnaître personne : ce ne sont pas des données
          personnelles.
        </p>
        <p>
          Pendant une Séance du Mode animation, le serveur garde aussi ton pseudo, tes réponses et ton jeton,{' '}
          {effacementEnHeures} heures au plus, et l'abonnement au Rappel du matin si tu l'as demandé, sur ton accord
          (voir plus haut). Il reste enfin ton adresse IP, que deux prestataires
          voient passer. Cloudflare, l'hébergeur, la reçoit pour t'envoyer les pages du jeu et protéger le site des
          attaques : il agit pour notre compte, et le jeu lui-même ne la garde pas. GoatCounter, la mesure d'audience, s'en sert quelques heures au plus, en mémoire, pour ne pas
          compter deux fois la même visite et en déduire ton pays, sans jamais l'enregistrer.
        </p>
        <p>
          Tout cela repose sur notre intérêt légitime (article 6.1.f du RGPD) : faire marcher et protéger le site, y
          compris la Séance que tu as rejointe, et savoir s'il plaît pour l'améliorer. La mesure d'audience ne dépose rien sur ton appareil, ni cookie ni autre
          trace : elle ne demande donc pas ton accord.
        </p>
        <p>
          Les chiffres de GoatCounter sont gardés en Finlande et en Allemagne, dans l'Union européenne. Cloudflare,
          société américaine, peut traiter les demandes de ton navigateur hors de l'Union européenne, notamment aux
          États-Unis : ce transfert est encadré par le Data Privacy Framework entre l'Union européenne et les
          États-Unis, auquel Cloudflare adhère, et par les clauses contractuelles types de la Commission européenne.
          Cloudflare garde ses journaux pour une durée limitée, qu'il ne précise pas.
        </p>
      </>
    ),
  },
  {
    id: 'droits',
    titre: 'Tes droits, et la CNIL',
    contenu: (
      <>
        <p>
          Tu peux demander à accéder aux données qui te concernent, à les faire corriger ou effacer, à en limiter
          l'usage ou t'y opposer, en écrivant à <Contact />. En dehors d'une Séance du Mode animation, effacée au
          bout de {effacementEnHeures} heures, et de l'abonnement au Rappel du matin, que tu effaces toi-même en
          arrêtant le Rappel, le jeu ne garde rien qui permette de te reconnaître : il n'y aura le plus souvent rien
          à retrouver. Pour effacer ce que garde ton navigateur, il suffit de vider les
          données du site dans ses réglages.
        </p>
        <p>
          Si tu estimes que tes droits ne sont pas respectés (sans réponse de notre part sous un mois, par exemple), tu
          peux adresser une réclamation à la CNIL, la Commission nationale de l'informatique et des libertés : en ligne
          (<a href={CNIL_PLAINTE}>adresser une plainte à la CNIL</a>), ou par courrier, au Service des plaintes de la
          CNIL, 3 place de Fontenoy, 75007 Paris.
        </p>
      </>
    ),
  },
  {
    id: 'editeur',
    titre: 'Éditeur et hébergeur',
    contenu: (
      <>
        <p>
          Éditeur et directeur de la publication : Fabien Lesage. Contact : <Contact />.
        </p>
        <p>Hébergeur : Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis, +1 650 319 8930.</p>
        <p>
          Duel Carbone est un projet personnel, gratuit et sans publicité, sans lien avec l'ADEME, dont il réutilise
          les données en citant leur source.
        </p>
      </>
    ),
  },
  {
    id: 'donnees-ademe',
    titre: "Les données de l'ADEME",
    contenu: (
      <>
        <p>
          Les empreintes carbone viennent d'Impact CO2, de l'ADEME, qui en autorise la réutilisation non commerciale
          et pédagogique, à condition d'en respecter le sens et d'en citer l'origine et la date (
          <a href={MENTIONS_LEGALES_ADEME}>mentions légales d'Impact CO2</a>). Elles restent la propriété de l'ADEME.
        </p>
        <p>
          Les valeurs affichées sont celles de l'ADEME pour une consommation en France, avec notamment le mix
          électrique français : les émissions d'un même Geste peuvent être différentes dans un autre pays.
        </p>
      </>
    ),
  },
]

/** La page « Mentions légales et vie privée » (#mentions-legales) : ce que le jeu garde de toi, et qui l'édite. */
export function EcranMentionsLegales() {
  return (
    <PageDeLecture
      titre="Mentions légales et vie privée"
      chapo="Ce que le jeu garde de toi, pourquoi il en a le droit, ce que tu peux demander, et qui l'édite."
      parties={PARTIES}
    >
      <Renvoi adresse={ADRESSES.enSavoirPlus}>Pourquoi ce jeu, ses règles et d'où viennent ses chiffres →</Renvoi>
    </PageDeLecture>
  )
}
