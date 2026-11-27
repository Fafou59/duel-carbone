import { useMemo } from 'react'
import { create } from 'qrcode'

/**
 * Le QR code d'une Séance, calculé dans le navigateur à partir de son adresse (rien n'est demandé à un autre site).
 * La bibliothèque « qrcode » donne la grille des cases noires ; on la dessine nous-mêmes en SVG, d'un seul tracé,
 * pour qu'elle reste nette à toutes les tailles, sur un fond blanc (un QR code se lit mal en couleurs inversées,
 * d'où le blanc même en thème sombre).
 */
export function QrCode({ texte, taille }: { texte: string; taille: number }) {
  const { cote, trace } = useMemo(() => {
    // Niveau de correction « M » : le code se lit encore s'il est abîmé à 15 % (reflet du projecteur).
    const { modules } = create(texte, { errorCorrectionLevel: 'M' })
    let chemin = ''
    for (let y = 0; y < modules.size; y++)
      for (let x = 0; x < modules.size; x++) if (modules.get(y, x)) chemin += `M${x} ${y}h1v1h-1z`
    return { cote: modules.size, trace: chemin }
  }, [texte])
  // Une marge blanche de 2 cases autour : les lecteurs en ont besoin pour trouver le code.
  return (
    <svg className="an-qr" width={taille} height={taille} viewBox={`-2 -2 ${cote + 4} ${cote + 4}`} role="img" aria-label="QR code pour rejoindre la Séance" shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={cote + 4} height={cote + 4} fill="#fff" />
      <path d={trace} fill="#111" />
    </svg>
  )
}
