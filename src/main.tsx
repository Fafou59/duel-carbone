import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Racine } from './Racine.tsx'
import { capturerInvitationNative } from './navigateur/installation.ts'
import { chargerMesure, ecouterLesPlantages } from './navigateur/mesure.ts'
import { enregistrerServiceWorker } from './navigateur/mise-a-jour.ts'
import { serviceDuRappel } from './navigateur/rappel.ts'

// La mesure d'audience (GoatCounter, sans cookie), sur l'adresse publique du jeu seulement.
chargerMesure()
// Et les plantages du jeu (leur type seulement), pour repérer un téléphone ou un navigateur qui pose problème.
ecouterLesPlantages()

// La fenêtre d'installation du navigateur arrive au chargement : on la garde pour l'invitation de fin de Partie (#68).
capturerInvitationNative()

// L'application installable et jouable hors ligne (service worker), sur le site construit seulement.
void enregistrerServiceWorker()

// Le Rappel du matin (ADR 0008) : à chaque ouverture, le jeu renvoie son abonnement au serveur, s'il en a un. Le
// serveur note le jour de la visite (rien d'autre), et efface l'abonnement après 90 jours sans visite.
void serviceDuRappel().renvoyer()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Racine />
  </StrictMode>,
)
