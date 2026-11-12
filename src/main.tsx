import { StrictMode } from 'react'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
