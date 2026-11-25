/** PROTOTYPE (jetable) : les petits morceaux communs aux trois variantes (pas la mise en page). */
import { Icone } from '../../composants/Icone.tsx'
import { formaterEmpreinte } from '../../domaine/format.ts'
import type { GesteCalcule } from '../../domaine/geste.ts'
import type { DuelTire } from '../../domaine/generateur.ts'

/** Un faux QR code (motif reproductible) : le vrai sera généré à partir de l'adresse de la Séance. */
export function QrFactice({ taille = 180 }: { taille?: number }) {
  const cases: [number, number][] = []
  for (let y = 0; y < 21; y++)
    for (let x = 0; x < 21; x++) {
      const coin = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)
      if (coin ? x % 6 === 0 || y % 6 === 0 || (x % 7 > 1 && x % 7 < 5 && y % 7 > 1 && y % 7 < 5) || x === 20 || y === 20 : (x * 7 + y * 13 + x * y) % 3 === 0)
        cases.push([x, y])
    }
  return (
    <svg className="pa-qr" width={taille} height={taille} viewBox="-1 -1 23 23" role="img" aria-label="QR code de la Séance">
      <rect x="-1" y="-1" width="23" height="23" fill="#fff" />
      {cases.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#111" />
      ))}
    </svg>
  )
}

export function Rejoindre({ code, compact = false }: { code: string; compact?: boolean }) {
  return (
    <div className={`pa-rejoindre${compact ? ' pa-rejoindre--compact' : ''}`}>
      <QrFactice taille={compact ? 110 : 220} />
      <div>
        <p className="pa-rejoindre__adresse">duelcarbone.fr/rejoindre</p>
        <p className="pa-rejoindre__code" aria-label={`Code ${code.split('').join(' ')}`}>
          {code}
        </p>
      </div>
    </div>
  )
}

export function Geste({ geste, montrerEmpreinte = false }: { geste: GesteCalcule; montrerEmpreinte?: boolean }) {
  return (
    <>
      <span className="pa-geste__icone">
        <Icone id={geste.id} />
      </span>
      <span className="pa-geste__titre">{geste.titre}</span>
      <span className="pa-geste__sous-titre">{geste.sousTitre}</span>
      {montrerEmpreinte && <span className="pa-geste__empreinte">{formaterEmpreinte(geste.empreinte)}</span>}
    </>
  )
}

export const NOMS_DIFFICULTE: Record<string, string> = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile', ultime: 'Ultime' }

export function Annonce({ duel }: { duel: DuelTire }) {
  if (!duel.thematique) return null
  return (
    <p className="pa-annonce">
      <strong>{duel.thematique.titre}</strong> {duel.thematique.accroche}
    </p>
  )
}
