import { Icone } from './Icone.tsx'
import { formaterEmpreinte } from '../domaine/format.ts'
import type { GesteCalcule } from '../domaine/geste.ts'
import './CarteGeste.css'

/**
 * État d'une carte :
 * - « question » : le joueur n'a pas encore choisi ;
 * - « plus-emetteur » : révélée, c'est le Geste qui émet le plus ;
 * - « mauvais-choix » : révélée, le joueur l'a choisie à tort ;
 * - « autre » : révélée, ni gagnante ni choisie.
 */
export type EtatCarte = 'question' | 'plus-emetteur' | 'mauvais-choix' | 'autre'

type Props = {
  geste: GesteCalcule
  etat: EtatCarte
  /** La carte a été choisie par le joueur. */
  choisie: boolean
  /** Touche du clavier qui choisit cette carte (1 ou 2), s'il y en a une. */
  raccourci?: string
  /**
   * Séance du Mode animation : la réponse est envoyée et attend la révélation de l'Animateur. La carte ne se choisit
   * plus, et la carte choisie le dit (« Ton choix »), sans rien révéler.
   */
  envoyee?: boolean
  onChoisir: () => void
}

export function CarteGeste({ geste, etat, choisie, raccourci, envoyee = false, onChoisir }: Props) {
  const revelee = etat !== 'question'
  // Le bon choix du joueur : la carte fait un petit bond (voir CarteGeste.css).
  const bonChoix = etat === 'plus-emetteur' && choisie
  return (
    <button
      type="button"
      className={`carte carte--${etat}${bonChoix ? ' carte--bon-choix' : ''}${envoyee ? (choisie ? ' carte--envoyee' : ' carte--ecartee') : ''}`}
      onClick={onChoisir}
      disabled={revelee || envoyee}
      aria-keyshortcuts={raccourci}
    >
      {etat === 'plus-emetteur' && (
        <span className="carte__etiquette carte__etiquette--bon">✓ {choisie ? 'Ton choix · ' : ''}émet le plus</span>
      )}
      {etat === 'mauvais-choix' && <span className="carte__etiquette carte__etiquette--mauvais">✗ Ton choix</span>}
      {!revelee && envoyee && choisie && <span className="carte__etiquette carte__etiquette--envoyee">Ton choix</span>}
      <span className="carte__icone" aria-hidden="true">
        <Icone id={geste.id} />
      </span>
      <span className="carte__titre">{geste.titre}</span>
      <span className="carte__sous-titre">{geste.sousTitre}</span>
      {revelee && <span className="carte__valeur">{formaterEmpreinte(geste.empreinte)}</span>}
    </button>
  )
}
