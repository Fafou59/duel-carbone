import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { capturerInvitationNative } from './navigateur/installation.ts'
import { chargerMesure, ecouterLesPlantages } from './navigateur/mesure.ts'
import { enregistrerServiceWorker } from './navigateur/mise-a-jour.ts'

// La mesure d'audience (GoatCounter, sans cookie), sur l'adresse publique du jeu seulement.
chargerMesure()
// Et les plantages du jeu (leur type seulement), pour repérer un téléphone ou un navigateur qui pose problème.
ecouterLesPlantages()

// La fenêtre d'installation du navigateur arrive au chargement : on la garde pour l'invitation de fin de Partie (#68).
capturerInvitationNative()

// L'application installable et jouable hors ligne (service worker), sur le site construit seulement.
void enregistrerServiceWorker()

// PROTOTYPE (jetable, branche prototype/mode-animateur) : l'écran projeté de l'Animateur, sur #prototype-animateur.
const PrototypeAnimateur = lazy(() =>
  import('./ecrans/prototype-animateur/PrototypeAnimateur.tsx').then((m) => ({ default: m.PrototypeAnimateur })),
)
// Et le téléphone du Participant, sur #prototype-participant.
const PrototypeParticipant = lazy(() =>
  import('./ecrans/prototype-animateur/PrototypeParticipant.tsx').then((m) => ({ default: m.PrototypeParticipant })),
)
const prototype = window.location.hash

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {prototype === '#prototype-animateur' ? (
      <Suspense fallback={null}>
        <PrototypeAnimateur />
      </Suspense>
    ) : prototype === '#prototype-participant' ? (
      <Suspense fallback={null}>
        <PrototypeParticipant />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
