import type { Guide } from '../navigateur/installation.ts'

/**
 * Les étapes de chaque navigateur mobile, sans capture d'écran (elles vieilliraient à chaque mise à jour).
 * Firefox sur Android : libellés vérifiés sur un vrai téléphone (la dernière fenêtre est celle d'Android, dont
 * le libellé varie : « Ajouter », « Ajouter automatiquement »…). Safari : guide d'Apple pour iOS 26.
 */
export const ETAPES: Record<Guide, string[]> = {
  'firefox-android': [
    'Touche ⋮ en bas à droite, puis « Plus ».',
    'Touche « Ajouter l’application à l’écran d’accueil ».',
    'Confirme avec « Ajouter ».',
  ],
  'safari-ios': [
    'Touche ⋯ puis « Partager » (ou directement le bouton Partager).',
    'Fais défiler et touche « Sur l’écran d’accueil ».',
    'Laisse « Ouvrir comme app web » activé et touche « Ajouter ».',
  ],
  'ios-autre': [
    'Touche le bouton Partager de la barre d’adresse.',
    'Touche « Sur l’écran d’accueil ».',
    'Touche « Ajouter ».',
  ],
  'mobile-autre': ['Ouvre le menu de ton navigateur.', 'Cherche « Ajouter à l’écran d’accueil » ou « Installer ».'],
}
