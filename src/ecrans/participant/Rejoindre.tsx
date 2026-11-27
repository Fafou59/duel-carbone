import { useEffect, useId, useState, type FormEvent, type Ref } from 'react'
import { LONGUEUR_DU_CODE, normaliserCode, normaliserPseudo } from '../../domaine/seance.ts'
import { REGLES } from '../../domaine/regles.ts'
import type { InformationsDeSeance, ServeurDesSeances } from '../../navigateur/seance.ts'

type Props = {
  /** Le code lu dans l'adresse du QR code (peut être vide ou faux : le Participant le corrige). */
  codeInitial: string
  /** Le pseudo d'une tentative précédente (pseudo refusé, Participant retiré), à corriger. */
  pseudoInitial?: string
  /** Un message à montrer au-dessus du formulaire : pourquoi on y revient (Séance terminée, retrait…). */
  message?: string | null
  serveur: ServeurDesSeances
  onRejoindre: (demande: { code: string; pseudo: string | null }) => void
  /** Reçoit le titre, pour y placer le focus en revenant au formulaire. */
  refTitre?: Ref<HTMLHeadingElement>
}

/** Ce que le serveur a répondu pour ce code, à cet essai. */
type Lecture = { code: string; essai: number; resultat: InformationsDeSeance | 'inconnue' | 'injoignable' }

/**
 * Rejoindre une Séance : le code (rempli tout seul par le QR code, sinon tapé), puis le pseudo si l'Animateur a
 * choisi un Classement. Dès que le code a ses 6 caractères, le téléphone demande au serveur si la Séance existe et
 * s'il faut un pseudo : le formulaire s'adapte avant même qu'on touche « Rejoindre ».
 */
export function Rejoindre({ codeInitial, pseudoInitial = '', message = null, serveur, onRejoindre, refTitre }: Props) {
  const [saisie, setSaisie] = useState(codeInitial)
  const [pseudo, setPseudo] = useState(pseudoInitial)
  const [lecture, setLecture] = useState<Lecture | null>(null)
  const [erreurPseudo, setErreurPseudo] = useState(false)
  // Chaque nouvel essai (« Rejoindre » quand le serveur ne répondait pas) relance la lecture.
  const [essai, setEssai] = useState(0)
  const id = useId()
  const code = normaliserCode(saisie)

  // Le code est complet : on demande au serveur ce qu'il en est (une fois par code).
  useEffect(() => {
    if (!code) return
    let actif = true
    serveur.lire(code).then((resultat) => {
      if (actif) setLecture({ code, essai, resultat: resultat ?? 'injoignable' })
    })
    return () => {
      actif = false
    }
  }, [code, serveur, essai])

  // Tant que la réponse pour ce code (et cet essai) n'est pas arrivée, on la cherche.
  const informations = !code ? null : lecture?.code === code && lecture.essai === essai ? lecture.resultat : 'lecture'
  const seance = typeof informations === 'object' && informations !== null ? informations : null
  const avecClassement = seance?.avecClassement ?? false
  const ouverte = seance?.ouverte ?? false

  const soumettre = (evenement: FormEvent) => {
    evenement.preventDefault()
    if (informations === 'injoignable') {
      setEssai((n) => n + 1)
      return
    }
    if (!code || !ouverte) return
    const propre = avecClassement ? normaliserPseudo(pseudo) : null
    if (avecClassement && propre === null) {
      setErreurPseudo(true)
      return
    }
    onRejoindre({ code, pseudo: propre })
  }

  // Ce que l'on dit sous le code, selon la réponse du serveur.
  let etatDuCode: string | null = null
  if (saisie.trim() && !code && saisie.replace(/[\s-]/g, '').length >= LONGUEUR_DU_CODE) etatDuCode = 'Ce code n’existe pas : vérifie-le sur l’écran.'
  else if (informations === 'lecture') etatDuCode = 'On cherche la Séance…'
  else if (informations === 'inconnue') etatDuCode = 'Aucune Séance avec ce code : vérifie-le sur l’écran.'
  else if (informations === 'injoignable') etatDuCode = 'La Séance ne répond pas : vérifie ta connexion, puis réessaie.'
  else if (seance && !ouverte) etatDuCode = 'Cette Séance est terminée : on ne peut plus la rejoindre.'

  return (
    <section className="telephone__rejoindre" aria-labelledby={`${id}-titre`}>
      <h2 id={`${id}-titre`} ref={refTitre} tabIndex={-1}>
        Rejoindre la Séance
      </h2>
      {message && (
        <p className="telephone__message" role="alert">
          {message}
        </p>
      )}
      <form className="telephone__formulaire" onSubmit={soumettre} noValidate>
        <label htmlFor={`${id}-code`}>Code de la Séance</label>
        <input
          id={`${id}-code`}
          className="telephone__code"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value.toUpperCase())}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          maxLength={LONGUEUR_DU_CODE + 4}
          aria-describedby={`${id}-aide-code`}
        />
        <p id={`${id}-aide-code`} className="telephone__aide" aria-live="polite">
          {etatDuCode ?? 'Rempli tout seul quand tu scannes le QR code ; sinon, tape celui de l’écran.'}
        </p>

        {avecClassement && ouverte && (
          <>
            <label htmlFor={`${id}-pseudo`}>Ton pseudo (affiché au Classement)</label>
            <input
              id={`${id}-pseudo`}
              value={pseudo}
              onChange={(e) => {
                setPseudo(e.target.value)
                setErreurPseudo(false)
              }}
              maxLength={REGLES.seance.longueurMaxDuPseudo}
              autoComplete="nickname"
              enterKeyHint="go"
              aria-invalid={erreurPseudo}
              aria-describedby={`${id}-aide-pseudo`}
            />
            <p id={`${id}-aide-pseudo`} className={erreurPseudo ? 'telephone__aide telephone__aide--erreur' : 'telephone__aide'}>
              {erreurPseudo
                ? `Choisis un pseudo, de ${REGLES.seance.longueurMaxDuPseudo} caractères au plus.`
                : 'Il est effacé à la fin de la Séance.'}
            </p>
          </>
        )}

        <button type="submit" className="bouton telephone__bouton-large" disabled={!code || (!ouverte && informations !== 'injoignable')}>
          Rejoindre
        </button>
      </form>
    </section>
  )
}
