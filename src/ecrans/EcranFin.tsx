type Props = {
  /** Reçoit le titre, pour que la Partie puisse y placer le focus. */
  refTitre?: (element: HTMLElement | null) => void
  score: number
  total: number
  onRejouer: () => void
}

/** Écran de fin MINIMAL (ticket #7) ; le Récapitulatif et le partage arrivent avec les tickets #9 et #10. */
export function EcranFin({ refTitre, score, total, onRejouer }: Props) {
  return (
    <section className="fin" aria-labelledby="fin-titre">
      <h2 id="fin-titre" ref={refTitre} tabIndex={-1}>
        Partie terminée !
      </h2>
      <p className="fin__score">
        {score}
        <span>/{total}</span>
      </p>
      <button type="button" className="bouton" onClick={onRejouer}>
        Rejouer
      </button>
    </section>
  )
}
