import { lazy, Suspense } from 'react'
import App from './App.tsx'
import { usePage } from './navigateur/adresse.ts'

// Le Mode animation (#animer) : l'écran de l'Animateur, chargé à part, seulement quand on l'ouvre. Un joueur seul ne
// télécharge jamais son code (ni celui du QR code).
const ModeAnimation = lazy(() => import('./ecrans/animation/ModeAnimation.tsx').then((m) => ({ default: m.ModeAnimation })))

/** Le jeu, ou l'écran de l'Animateur : un écran projeté, sans l'en-tête ni le pied de page du jeu. */
export function Racine() {
  const page = usePage()
  if (page !== 'animer') return <App />
  return (
    <Suspense fallback={null}>
      <ModeAnimation />
    </Suspense>
  )
}
