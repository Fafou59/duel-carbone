// PROTOTYPE JETABLE — refonte de l'accueil : trois variantes, trois situations du joueur, clair ou sombre.
// Branche prototype/accueil, jamais fusionnée. Page : /prototype-accueil.html
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import '../../src/ecrans/EcranDuel.css'
import './prototype.css'
import { SITUATIONS, type Situation } from './commun.tsx'
import { VarianteA } from './VarianteA.tsx'
import { VarianteB } from './VarianteB.tsx'
import { VarianteC } from './VarianteC.tsx'

type Variante = 'A' | 'B' | 'C'
type Theme = 'systeme' | 'clair' | 'sombre'

const VARIANTES: Record<Variante, string> = {
  A: 'A · Essaie tout de suite',
  B: 'B · La vitrine',
  C: 'C · Le rendez-vous quotidien',
}

/** Les choix sont gardés dans l'adresse (?v=B&s=hier&t=sombre) : un lien montre exactement le même écran. */
const lire = <T extends string>(cle: string, valeurs: readonly T[], defaut: T): T => {
  const v = new URLSearchParams(location.search).get(cle) as T | null
  return v && valeurs.includes(v) ? v : defaut
}

function Prototype() {
  const [variante, setVariante] = useState<Variante>(() => lire('v', ['A', 'B', 'C'], 'A'))
  const [situation, setSituation] = useState<Situation>(() => lire('s', ['jamais', 'aujourdhui', 'hier'], 'jamais'))
  const [theme, setTheme] = useState<Theme>(() => lire('t', ['systeme', 'clair', 'sombre'], 'systeme'))

  useEffect(() => {
    const adresse = new URL(location.href)
    adresse.searchParams.set('v', variante)
    adresse.searchParams.set('s', situation)
    adresse.searchParams.set('t', theme)
    history.replaceState(null, '', adresse)
    if (theme === 'systeme') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = theme
  }, [variante, situation, theme])

  return (
    <>
      <div className="proto-commandes">
        <label>
          <span>Variante</span>
          <select value={variante} onChange={(e) => setVariante(e.target.value as Variante)}>
            {Object.entries(VARIANTES).map(([v, nom]) => (
              <option key={v} value={v}>
                {nom}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Joueur</span>
          <select value={situation} onChange={(e) => setSituation(e.target.value as Situation)}>
            {Object.entries(SITUATIONS).map(([s, nom]) => (
              <option key={s} value={s}>
                {nom}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Thème</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
            <option value="systeme">Celui de l’appareil</option>
            <option value="clair">Clair</option>
            <option value="sombre">Sombre</option>
          </select>
        </label>
      </div>

      <div className="page">
        <header className="entete">
          <h1>Duel Carbone</h1>
        </header>
        <main>
          {/* key : changer de variante ou de situation repart d'un écran neuf. */}
          {variante === 'A' && <VarianteA key={situation} situation={situation} />}
          {variante === 'B' && <VarianteB key={situation} situation={situation} />}
          {variante === 'C' && <VarianteC key={situation} situation={situation} />}
        </main>
      </div>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Prototype />
  </StrictMode>,
)
