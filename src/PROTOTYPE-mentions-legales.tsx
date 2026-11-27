/**
 * PROTOTYPE JETABLE (issue 111, à ne jamais fusionner) : où ranger En savoir plus, la Vie privée et les Mentions
 * légales, et où ajouter la base légale et la possibilité de saisir la CNIL.
 *
 * Trois variantes par ?variant=A, B ou C (hors de l'adresse publique), sur les vraies pages du jeu :
 * - A « Deux pages » : En savoir plus (le jeu, les chiffres, l'IA, le projet) + Mentions légales et vie privée.
 * - B « Trois pages » : En savoir plus + Vie privée (une fiche par donnée) + Mentions légales.
 * - C « Portail » : En savoir plus devient un sommaire de chapitres, chacun sur sa propre adresse.
 *
 * Dans chaque variante, un encadré pointillé montre où ira la Séance du Mode animation (lot 4, ADR 0007).
 * Les textes nouveaux (base légale, droits, CNIL) sont des brouillons à relire à la construction.
 */
import { useEffect, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { variantePrototype } from './composants/PrototypeSwitcher.tsx'
import { EcranEnSavoirPlus, type ElementDuPlan, type IdPartie, type PartieEnPlus } from './ecrans/EcranEnSavoirPlus.tsx'
import { CONTACT, DEPOT, FLUENT_EMOJI, MENTIONS_LEGALES_ADEME } from './liens.ts'

export const VARIANTES_MENTIONS = {
  A: 'Deux pages',
  B: 'Trois pages, vie privée en fiches',
  C: 'Portail à chapitres',
} as const

export type VarianteMentions = keyof typeof VARIANTES_MENTIONS

/** La variante demandée par l'adresse, ou null hors prototype. */
export function varianteMentions(): VarianteMentions | null {
  const v = variantePrototype()
  return v && v in VARIANTES_MENTIONS ? (v as VarianteMentions) : null
}

const CNIL_PLAINTE = 'https://www.cnil.fr/fr/adresser-une-plainte'

/** Les liens du pied de page, selon la variante. */
export function liensDuPied(variante: VarianteMentions): { adresse: string; texte: string }[] {
  if (variante === 'A')
    return [
      { adresse: '#en-savoir-plus', texte: 'En savoir plus' },
      { adresse: '#mentions-legales', texte: 'Mentions légales' },
    ]
  if (variante === 'B')
    return [
      { adresse: '#en-savoir-plus', texte: 'En savoir plus' },
      { adresse: '#vie-privee', texte: 'Vie privée' },
      { adresse: '#mentions-legales', texte: 'Mentions légales' },
    ]
  return [
    { adresse: '#en-savoir-plus', texte: 'En savoir plus' },
    { adresse: '#en-savoir-plus/projet', texte: 'Mentions légales' },
  ]
}

// ——— L'ancre de l'adresse, suivie comme dans navigateur/adresse.ts ———

const surveiller = (prevenir: () => void) => {
  window.addEventListener('hashchange', prevenir)
  return () => window.removeEventListener('hashchange', prevenir)
}
const useAncre = () => useSyncExternalStore(surveiller, () => window.location.hash)

// ——— Les textes nouveaux, partagés par les variantes ———

/** L'encadré pointillé : ce que le lot 4 du Mode animation ajoutera ici. */
function Bientot({ children }: { children: ReactNode }) {
  const style: CSSProperties = {
    border: '2px dashed var(--bordure, #999)',
    borderRadius: 12,
    padding: '10px 14px',
    margin: '4px 0 8px',
    opacity: 0.85,
  }
  return (
    <div style={style}>
      <p style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Bientôt · Mode animation (lot 4)
      </p>
      {children}
    </div>
  )
}

const SEANCE: PartieEnPlus = {
  id: 'seance',
  titre: 'Pendant une Séance du Mode animation',
  contenu: (
    <Bientot>
      <p>
        Quand tu rejoins une Séance, ton téléphone tire au hasard un jeton qui te permet de retrouver ta place après une
        coupure. Le serveur de la Séance garde ce jeton, tes réponses et, s'il y a un Classement, ton pseudo. La Séance
        se ferme 3 heures après sa création, et tout est effacé sous 24 heures. Ce jeton est nécessaire pour jouer : il
        n'y a donc pas de bandeau à accepter.
      </p>
    </Bientot>
  ),
}

const EDITEUR: PartieEnPlus = {
  id: 'editeur',
  titre: 'Éditeur et hébergeur',
  contenu: (
    <>
      <p>
        Éditeur et directeur de la publication : Fabien Lesage. Contact : <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
      <p>Hébergeur : Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis, +1 650 319 8930.</p>
      <p>
        Duel Carbone est un projet personnel, gratuit et sans publicité, sans lien avec l'ADEME, dont il réutilise les
        données en citant leur source.
      </p>
    </>
  ),
}

const BASE_LEGALE: PartieEnPlus = {
  id: 'base-legale',
  titre: 'Qui est responsable, et sur quelle base',
  contenu: (
    <>
      <p>
        Le responsable du traitement est l'éditeur du jeu, Fabien Lesage. Ce que ton navigateur garde sur ton appareil
        sert seulement à faire marcher le jeu et ne nous est jamais envoyé. Les totaux du Rang du jour et de la part des
        réponses ne permettent de reconnaître personne : ce ne sont pas des données personnelles.
      </p>
      <p>
        Il reste ton adresse IP, que l'hébergeur reçoit pour t'envoyer les pages, et la mesure d'audience. Les deux
        reposent sur notre intérêt légitime (article 6.1.f du RGPD) : faire marcher et protéger le site, et savoir s'il
        plaît pour l'améliorer. La mesure d'audience ne dépose rien sur ton appareil : elle ne demande donc pas ton
        accord.
      </p>
    </>
  ),
}

const DROITS: PartieEnPlus = {
  id: 'droits',
  titre: 'Tes droits, et la CNIL',
  contenu: (
    <>
      <p>
        Tu peux demander à accéder aux données qui te concernent, à les faire corriger ou effacer, ou t'opposer à leur
        usage, en écrivant à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Comme le jeu ne garde rien qui permette de te
        reconnaître, il n'y aura le plus souvent rien à retrouver ; pour effacer ce que garde ton navigateur, il suffit
        de vider les données du site.
      </p>
      <p>
        Si tu estimes que tes droits ne sont pas respectés, tu peux adresser une réclamation à la CNIL, en ligne (
        <a href={CNIL_PLAINTE}>adresser une plainte à la CNIL</a>) ou par courrier : CNIL, 3 place de Fontenoy, TSA
        80715, 75334 Paris Cedex 07.
      </p>
    </>
  ),
}

const DONNEES_ADEME: PartieEnPlus = {
  id: 'donnees-ademe',
  titre: "Les données de l'ADEME",
  contenu: (
    <>
      <p>
        Les empreintes carbone viennent d'Impact CO2, de l'ADEME, qui en autorise la réutilisation non commerciale et
        pédagogique en citant leur origine et leur date (<a href={MENTIONS_LEGALES_ADEME}>mentions légales d'Impact
        CO2</a>). Elles restent la propriété de l'ADEME.
      </p>
      <p>
        Les valeurs affichées sont celles de l'ADEME pour une consommation en France, avec notamment le mix électrique
        français : les émissions d'un même Geste peuvent être différentes dans un autre pays.
      </p>
    </>
  ),
}

const LICENCES: PartieEnPlus = {
  id: 'licences',
  titre: 'Code et icônes',
  contenu: (
    <p>
      Le <a href={DEPOT}>code source du jeu</a> est public, sous licence MIT. Les icônes viennent de{' '}
      <a href={FLUENT_EMOJI}>Fluent Emoji</a>, de Microsoft, sous licence MIT ; celles que nous avons dessinées
      suivent le même style.
    </p>
  ),
}

/** Un lien vers une autre page, en fin de page (« Ta vie privée… → »). */
function Renvoi({ adresse, children }: { adresse: string; children: ReactNode }) {
  return (
    <p style={{ marginTop: 24, padding: '12px 16px', borderRadius: 12, background: 'var(--carte)' }}>
      <a href={adresse}>{children}</a>
    </p>
  )
}

// ——— Variante A : deux pages ———

const SAVOIR_SANS_VIE_PRIVEE: IdPartie[] = [
  'pourquoi',
  'regles',
  'conseils',
  'chiffres',
  'co2e',
  'calcul',
  'objets',
  'reglages',
  'installer',
  'empreinte',
  'projet',
]

function VarianteA({ ancre }: { ancre: string }) {
  if (ancre === '#mentions-legales')
    return (
      <EcranEnSavoirPlus
        titre="Mentions légales et vie privée"
        chapo="Qui édite le jeu, ce qu'il garde de toi, pourquoi il en a le droit, et ce que tu peux demander."
        plan={['vie-privee', SEANCE, BASE_LEGALE, DROITS, EDITEUR, DONNEES_ADEME]}
      />
    )
  return (
    <EcranEnSavoirPlus
      chapo="Pourquoi ce jeu, d'où viennent ses chiffres et comment on s'en sert, et ce qu'il a coûté."
      plan={SAVOIR_SANS_VIE_PRIVEE}
      apres={
        <Renvoi adresse="#mentions-legales">Ce que le jeu garde de toi, et les mentions légales →</Renvoi>
      }
    />
  )
}

// ——— Variante B : trois pages, la vie privée en fiches ———

type Fiche = { quoi: string; ou: string; duree: string; pourquoi: string; bientot?: boolean }

const FICHES: Fiche[] = [
  {
    quoi: 'Ton record, ta série, ta Partie du jour, tes derniers Duels et Conseils',
    ou: 'Ton navigateur, sur cet appareil. Jamais envoyés.',
    duree: 'Tant que tu ne vides pas les données du site.',
    pourquoi: 'Reprendre ta Partie et ne pas te reposer les mêmes Duels.',
  },
  {
    quoi: 'Une copie des fichiers du jeu (moins d’1 Mo)',
    ou: 'Ton navigateur, sur cet appareil.',
    duree: 'Jusqu’à la version suivante du jeu.',
    pourquoi: 'Jouer sans réseau, et installer le jeu.',
  },
  {
    quoi: 'Tes réponses, aussitôt fondues dans des totaux sans identité',
    ou: 'Le serveur du jeu, chez Cloudflare, dans l’Union européenne.',
    duree: 'Sans limite : ce ne sont plus que des totaux.',
    pourquoi: 'Le Rang du jour et « 72 % comme toi ». Personne ne peut savoir qui a répondu quoi.',
  },
  {
    quoi: 'Ton adresse IP',
    ou: 'Cloudflare, l’hébergeur. Le jeu ne la garde pas.',
    duree: 'Le temps de t’envoyer les pages.',
    pourquoi: 'Intérêt légitime : faire marcher et protéger le site.',
  },
  {
    quoi: 'Les visites et quelques moments de jeu, en chiffres agrégés',
    ou: 'GoatCounter, sans cookie ni identifiant.',
    duree: 'Des totaux, sans limite.',
    pourquoi: 'Intérêt légitime : savoir si le jeu plaît, pour l’améliorer.',
  },
  {
    quoi: 'Le texte ou l’image que tu partages',
    ou: 'Là où tu choisis de l’envoyer.',
    duree: '—',
    pourquoi: 'Défier tes proches, sans gâcher leur Partie.',
  },
  {
    quoi: 'Pendant une Séance : ton pseudo, tes réponses, un jeton',
    ou: 'Le serveur de la Séance, chez Cloudflare, dans l’Union européenne ; le jeton aussi sur ton téléphone.',
    duree: 'Effacés sous 24 heures.',
    pourquoi: 'Faire marcher la Séance : te reconnaître après une coupure, et le Classement.',
    bientot: true,
  },
]

function FicheVuePrivee({ fiche }: { fiche: Fiche }) {
  const ligne: CSSProperties = { display: 'grid', gridTemplateColumns: '7.5em 1fr', gap: 8, margin: 0 }
  const carte = (
    <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--carte)', margin: '0 0 10px' }}>
      <p style={{ fontWeight: 800, margin: '0 0 6px' }}>{fiche.quoi}</p>
      <p style={ligne}>
        <span style={{ opacity: 0.7 }}>Où</span> <span>{fiche.ou}</span>
      </p>
      <p style={ligne}>
        <span style={{ opacity: 0.7 }}>Combien de temps</span> <span>{fiche.duree}</span>
      </p>
      <p style={ligne}>
        <span style={{ opacity: 0.7 }}>Pourquoi</span> <span>{fiche.pourquoi}</span>
      </p>
    </div>
  )
  return fiche.bientot ? <Bientot>{carte}</Bientot> : carte
}

function VarianteB({ ancre }: { ancre: string }) {
  if (ancre === '#vie-privee')
    return (
      <EcranEnSavoirPlus
        titre="Ta vie privée"
        chapo="Sans compte, sans cookie, et rien qui permette de te reconnaître. Voici tout ce que le jeu garde, où, et pour combien de temps."
        plan={[
          {
            id: 'fiches',
            titre: 'Ce que le jeu garde',
            contenu: FICHES.map((f) => <FicheVuePrivee key={f.quoi} fiche={f} />),
          },
          { id: 'detail', titre: 'Le détail', contenu: <DetailVieePrivee /> },
          BASE_LEGALE,
          DROITS,
        ]}
        apres={<Renvoi adresse="#mentions-legales">Les mentions légales →</Renvoi>}
      />
    )
  if (ancre === '#mentions-legales')
    return (
      <EcranEnSavoirPlus
        titre="Mentions légales"
        chapo="Qui édite le jeu, qui l'héberge, et à qui sont les données et le code."
        sansSommaire
        plan={[EDITEUR, DONNEES_ADEME, LICENCES]}
        apres={<Renvoi adresse="#vie-privee">Ta vie privée : ce que le jeu garde, et tes droits →</Renvoi>}
      />
    )
  return (
    <EcranEnSavoirPlus
      chapo="Pourquoi ce jeu, d'où viennent ses chiffres et comment on s'en sert, et ce qu'il a coûté."
      plan={SAVOIR_SANS_VIE_PRIVEE}
      apres={
        <>
          <Renvoi adresse="#vie-privee">Ta vie privée : ce que le jeu garde de toi →</Renvoi>
          <Renvoi adresse="#mentions-legales">Les mentions légales →</Renvoi>
        </>
      }
    />
  )
}

/** Le texte actuel de la vie privée, replié sous « Le détail » (variante B). */
function DetailVieePrivee() {
  return (
    <details>
      <summary style={{ cursor: 'pointer', fontWeight: 700, minHeight: 24 }}>
        Comment ça marche, échange par échange
      </summary>
      <EcranEnSavoirPlusPartie id="vie-privee" />
    </details>
  )
}

/** Une seule partie de la page actuelle, sans titre de page ni bouton (pour la replier dans un « détail »). */
function EcranEnSavoirPlusPartie({ id }: { id: IdPartie }) {
  return (
    <div className="prototype-partie-seule">
      <style>{`.prototype-partie-seule .savoir > h2, .prototype-partie-seule .savoir__chapo,
        .prototype-partie-seule .savoir__suite, .prototype-partie-seule .savoir__partie > h3 { display: none; }`}</style>
      <EcranEnSavoirPlus plan={[id]} sansSommaire />
    </div>
  )
}

// ——— Variante C : un portail, un chapitre par adresse ———

type Chapitre = { id: string; titre: string; resume: string; plan: ElementDuPlan[] }

const CHAPITRES: Chapitre[] = [
  {
    id: 'jeu',
    titre: 'Le jeu',
    resume: 'Pourquoi Duel Carbone, ses règles, le Rang du jour et les Conseils.',
    plan: ['pourquoi', 'regles', 'conseils'],
  },
  {
    id: 'chiffres',
    titre: 'Les chiffres et la méthode',
    resume: "D'où viennent les empreintes, l'unité, le calcul et les réglages de l'ADEME.",
    plan: ['chiffres', 'co2e', 'calcul', 'objets', 'reglages'],
  },
  {
    id: 'installer',
    titre: 'Installer le jeu',
    resume: 'Sur ton écran d’accueil, pour jouer hors ligne.',
    plan: ['installer'],
  },
  {
    id: 'vie-privee',
    titre: 'Ta vie privée',
    resume: 'Ce que le jeu garde de toi (presque rien), sur quelle base, et tes droits.',
    plan: ['vie-privee', SEANCE, BASE_LEGALE, DROITS],
  },
  {
    id: 'empreinte',
    titre: "L'empreinte de ce jeu",
    resume: 'Ce qu’a coûté sa création avec une IA.',
    plan: ['empreinte'],
  },
  {
    id: 'projet',
    titre: 'Le projet et les mentions légales',
    resume: 'Le code, le contact, l’éditeur, l’hébergeur et les licences.',
    plan: ['projet', EDITEUR, DONNEES_ADEME],
  },
]

function VarianteC({ ancre }: { ancre: string }) {
  const id = ancre.startsWith('#en-savoir-plus/') ? ancre.slice('#en-savoir-plus/'.length) : null
  const index = CHAPITRES.findIndex((c) => c.id === id)
  if (index >= 0) {
    const chapitre = CHAPITRES[index]
    const suivant = CHAPITRES[(index + 1) % CHAPITRES.length]
    return (
      <EcranEnSavoirPlus
        titre={chapitre.titre}
        chapo={chapitre.resume}
        plan={chapitre.plan}
        sansSommaire={chapitre.plan.length < 3}
        apres={<Renvoi adresse={`#en-savoir-plus/${suivant.id}`}>Chapitre suivant : {suivant.titre} →</Renvoi>}
        retour={{ adresse: '#en-savoir-plus', texte: '← En savoir plus' }}
      />
    )
  }
  return (
    <EcranEnSavoirPlus
      chapo="Tout ce qu'il y a à savoir sur Duel Carbone, en six chapitres."
      plan={[]}
      avant={
        <nav aria-label="Chapitres" style={{ display: 'grid', gap: 10, margin: '12px 0' }}>
          {CHAPITRES.map((c) => (
            <a
              key={c.id}
              href={`#en-savoir-plus/${c.id}`}
              style={{
                display: 'block',
                padding: '14px 16px',
                borderRadius: 12,
                background: 'var(--carte)',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              <strong style={{ display: 'block', fontSize: 18 }}>{c.titre} →</strong>
              <span style={{ opacity: 0.8 }}>{c.resume}</span>
            </a>
          ))}
        </nav>
      }
    />
  )
}

/** La page affichée pour l'ancre en cours, selon la variante. */
export function SavoirPrototype({ variante }: { variante: VarianteMentions }) {
  const ancre = useAncre()
  // Chaque nouvelle page repart du haut.
  useEffect(() => window.scrollTo(0, 0), [ancre, variante])
  const cle = `${variante}${ancre}`
  if (variante === 'A') return <VarianteA key={cle} ancre={ancre} />
  if (variante === 'B') return <VarianteB key={cle} ancre={ancre} />
  return <VarianteC key={cle} ancre={ancre} />
}

