import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { ADRESSES } from '../navigateur/adresse.ts'
import { mouvementReduit } from '../navigateur/mouvement.ts'
import './PageDeLecture.css'

/** Une partie d'une page de lecture : son identifiant (pour le sommaire), son titre et son texte. */
export type PartieDeLecture = { id: string; titre: string; contenu: ReactNode }

type Props = {
  /** Le titre de la page (le seul titre de niveau 2). */
  titre: string
  /** La phrase sous le titre, qui dit ce que la page contient. */
  chapo: ReactNode
  /** Les parties, dans l'ordre : le sommaire est construit à partir de cette liste, il suit toujours la page. */
  parties: PartieDeLecture[]
  /** Ce qui suit la dernière partie (un renvoi vers l'autre page). */
  children?: ReactNode
}

/** Descend jusqu'à un élément de la page, et y place le clavier et le lecteur d'écran. */
function allerA(element: HTMLElement | null) {
  if (!element) return
  element.focus({ preventScroll: true })
  element.scrollIntoView({ behavior: mouvementReduit() ? 'auto' : 'smooth', block: 'start' })
}

/**
 * Une page à lire, hors du jeu : En savoir plus, et Mentions légales et vie privée. Les deux se présentent de la
 * même façon (titre, chapo, sommaire, parties, « Retour au jeu » collé en bas, bouton ↑) : ce composant le fait une
 * seule fois, et chaque page ne fournit que ses textes.
 */
export function PageDeLecture({ titre, chapo, parties, children }: Props) {
  const titreDeLaPage = useRef<HTMLHeadingElement>(null)
  const sommaire = useRef<HTMLElement>(null)
  const titreDuSommaire = useRef<HTMLParagraphElement>(null)
  // Le bouton « ↑ » n'apparaît qu'une fois le sommaire sorti de l'écran (toujours, sans IntersectionObserver).
  const [sommaireVisible, setSommaireVisible] = useState(true)

  // À l'ouverture de la page, le lecteur d'écran (et le clavier) partent de son titre.
  useEffect(() => titreDeLaPage.current?.focus(), [])

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
  const versPartie = (id: string) => (evenement: MouseEvent<HTMLAnchorElement>) => {
    evenement.preventDefault()
    allerA(document.getElementById(`lecture-${id}`))
  }

  return (
    <article className="lecture" aria-labelledby="lecture-titre">
      <h2 id="lecture-titre" ref={titreDeLaPage} tabIndex={-1}>
        {titre}
      </h2>
      <p className="lecture__chapo">{chapo}</p>

      <nav ref={sommaire} className="lecture__sommaire" aria-labelledby="lecture-sommaire">
        <p id="lecture-sommaire" ref={titreDuSommaire} className="lecture__sommaire-titre" tabIndex={-1}>
          Sommaire
        </p>
        <ol>
          {parties.map(({ id, titre }) => (
            <li key={id}>
              <a href={`#lecture-${id}`} onClick={versPartie(id)}>
                {titre}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {parties.map(({ id, titre, contenu }) => (
        <section key={id} className="lecture__partie" aria-labelledby={`lecture-${id}`}>
          <h3 id={`lecture-${id}`} tabIndex={-1}>
            {titre}
          </h3>
          {contenu}
        </section>
      ))}

      {children}

      {/* « Retour au jeu » reste collé en bas de l'écran, comme « Duel suivant » : pas besoin de remonter. */}
      <div className="lecture__suite">
        <div className="lecture__suite-barre">
          <a className="bouton" href={ADRESSES.jeu}>
            ← Retour au jeu
          </a>
          {!sommaireVisible && (
            <button
              type="button"
              className="bouton bouton--secondaire lecture__haut"
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

/** Un renvoi vers l'autre page de lecture, en fin de page (« Ce que le jeu garde de toi… → »). */
export function Renvoi({ adresse, children }: { adresse: string; children: ReactNode }) {
  return (
    <p className="lecture__renvoi">
      <a href={adresse}>{children}</a>
    </p>
  )
}
