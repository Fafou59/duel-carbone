// PROTOTYPE JETABLE — refonte de l'accueil, 2e tour : vitrine pour un nouveau joueur, tableau de bord pour celui qui revient.
// Branche prototype/accueil, jamais fusionnée. Page : /prototype-accueil.html
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import '../../src/ecrans/EcranDuel.css'
import '../../src/composants/ExplicationDuel.css'
import './prototype.css'
import { ACCROCHES, SITUATIONS, TITRES, useSimulation, type Accroche, type Situation, type Titre } from './commun.tsx'
import { adresseLogo, ImageLogo, LOGOS, type Logo } from './logos.tsx'
import { Nouveau } from './Nouveau.tsx'
import { Retour } from './Retour.tsx'
import { FORMES, Tutoriel, type FormeTutoriel } from './Tutoriel.tsx'

type Theme = 'systeme' | 'clair' | 'sombre'

/** Les choix sont gardés dans l'adresse (?s=hier&a=t2&f=guide&t=sombre) : un lien montre exactement le même écran. */
const lire = <T extends string>(cle: string, valeurs: readonly T[], defaut: T): T => {
  const v = new URLSearchParams(location.search).get(cle) as T | null
  return v && valeurs.includes(v) ? v : defaut
}

function Menu<T extends string>({ titre, valeur, options, onChange }: { titre: string; valeur: T; options: Record<T, string>; onChange: (v: T) => void }) {
  return (
    <label>
      <span>{titre}</span>
      <select value={valeur} onChange={(e) => onChange(e.target.value as T)}>
        {(Object.entries(options) as [T, string][]).map(([v, nom]) => (
          <option key={v} value={v}>
            {nom}
          </option>
        ))}
      </select>
    </label>
  )
}

function Prototype() {
  const [situation, setSituation] = useState<Situation>(() => lire('s', ['jamais', 'aujourdhui', 'hier'], 'jamais'))
  const [accroche, setAccroche] = useState<Accroche>(() => lire('a', ['pese', 'emet'], 'pese'))
  const [titre, setTitre] = useState<Titre>(() => lire('c', ['pastille', 'court', 'etoile'], 'pastille'))
  const [logo, setLogo] = useState<Logo>(() => lire('l', ['aucun', 'nuages', 'balance', 'eclair'], 'nuages'))
  const [forme, setForme] = useState<FormeTutoriel>(() => lire('f', ['diaporama', 'guide'], 'diaporama'))
  const [theme, setTheme] = useState<Theme>(() => lire('t', ['systeme', 'clair', 'sombre'], 'systeme'))
  const [tutoriel, setTutoriel] = useState(false)
  const { simuler, bulle } = useSimulation()

  useEffect(() => {
    const adresse = new URL(location.href)
    for (const [cle, valeur] of Object.entries({ s: situation, a: accroche, c: titre, l: logo, f: forme, t: theme })) adresse.searchParams.set(cle, valeur)
    history.replaceState(null, '', adresse)
    if (theme === 'systeme') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = theme
    // L'icône de l'onglet suit le logo choisi.
    const icone = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (icone) icone.href = logo === 'aucun' ? '/favicon.svg' : adresseLogo(logo)
  }, [situation, accroche, titre, logo, forme, theme])

  const actions = {
    onJouer: simuler('lancerait le Duel du jour'),
    onPartieLibre: simuler('lancerait une Partie libre'),
    onTutoriel: () => setTutoriel(true),
  }

  return (
    <>
      <div className="proto-commandes">
        <Menu titre="Joueur" valeur={situation} options={SITUATIONS} onChange={setSituation} />
        <Menu titre="Logo" valeur={logo} options={LOGOS} onChange={setLogo} />
        <Menu titre="Titre" valeur={titre} options={TITRES} onChange={setTitre} />
        <Menu titre="Accroche" valeur={accroche} options={ACCROCHES} onChange={setAccroche} />
        <Menu titre="Tutoriel" valeur={forme} options={FORMES} onChange={setForme} />
        <Menu titre="Thème" valeur={theme} options={{ systeme: 'Appareil', clair: 'Clair', sombre: 'Sombre' }} onChange={setTheme} />
      </div>

      <div className="page">
        <header className="entete">
          <h1 className="proto-marque">
            <ImageLogo logo={logo} />
            Duel Carbone
          </h1>
        </header>
        <main>
          {situation === 'jamais' ? (
            <Nouveau accroche={accroche} titre={titre} {...actions} />
          ) : (
            <Retour key={situation} situation={situation} onPartager={simuler('ouvrirait le partage')} {...actions} />
          )}
        </main>
      </div>
      <Tutoriel forme={forme} ouvert={tutoriel} onFermer={() => setTutoriel(false)} onJouer={actions.onJouer} />
      {bulle}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Prototype />
  </StrictMode>,
)
