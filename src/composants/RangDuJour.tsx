import { phraseDuRang, type RangDuJour as Rang } from '../domaine/rang-du-jour.ts'
import './RangDuJour.css'

/**
 * Le Rang du jour, sous le score du Duel du jour (écran de fin et accueil) : « Tu as fait mieux ou autant que
 * 72 % des joueurs jusqu'ici ». Rien tant que le serveur n'a pas répondu, ni s'il ne répond pas, ni sous
 * 5 joueurs : le jeu ne dépend jamais du serveur.
 *
 * La zone existe dès l'affichage (vide) : « aria-live » fait lire la phrase par les lecteurs d'écran quand elle arrive.
 */
export function RangDuJour({ rang }: { rang: Rang | null }) {
  return (
    <div className="rang-du-jour" aria-live="polite">
      {rang && <p className="rang-du-jour__phrase">{phraseDuRang(rang)}</p>}
    </div>
  )
}
