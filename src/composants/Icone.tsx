import { iconeDe } from '../donnees/icones.ts'
import './Icone.css'

/**
 * L'icône d'un Geste, à la taille du texte qui l'entoure, comme un emoji : il suffit de changer la taille
 * de police autour d'elle. Elle est décorative (alt vide) : le nom du Geste est toujours écrit à côté.
 */
export function Icone({ id }: { id: string }) {
  return <img className="icone" src={iconeDe(id)} alt="" width={32} height={32} decoding="async" draggable={false} />
}
