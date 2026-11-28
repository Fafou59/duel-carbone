import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Racine } from './Racine.tsx'
import { ancreDuCheminCourt } from './domaine/adresse-courte.ts'
import { capturerInvitationNative } from './navigateur/installation.ts'
import { chargerMesure, ecouterLesPlantages } from './navigateur/mesure.ts'
import { enregistrerServiceWorker } from './navigateur/mise-a-jour.ts'

// L'adresse courte d'une Séance (duelcarbone.fr/rejoindre) : le serveur la renvoie vers /#rejoindre, mais le service
// worker du jeu installé peut servir la page sans passer par lui. On fait alors le même chemin ici, avant tout le reste.
const ancreCourte = ancreDuCheminCourt(window.location.pathname)
if (ancreCourte) window.history.replaceState(null, '', `${import.meta.env.BASE_URL}${window.location.search}${ancreCourte}`)

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
    <Racine />
  </StrictMode>,
)
