/**
 * La navigation entre les pages, sans bibliothèque : l'ancre de l'adresse (la partie après « # »).
 *
 * - « …/#en-savoir-plus » affiche la page En savoir plus ; toute autre adresse affiche le jeu.
 * - Un lien <a href="#en-savoir-plus"> change l'ancre sans recharger la page : le navigateur prévient
 *   par l'événement « hashchange », et React réaffiche la bonne page.
 * - Le bouton « Retour » du téléphone et les liens partagés fonctionnent d'eux-mêmes.
 * - L'hébergeur n'a rien à configurer : le serveur reçoit toujours la même page, l'ancre ne lui est jamais envoyée.
 */
import { useSyncExternalStore } from 'react'

export type Page = 'jeu' | 'enSavoirPlus'

/** L'adresse (relative) de chaque page, pour les liens. */
export const ADRESSES: Record<Page, string> = { jeu: '#', enSavoirPlus: '#en-savoir-plus' }

/** L'ancienne adresse de la page (quand elle s'appelait « Sources et méthode ») : les liens déjà partagés marchent. */
const ANCIENNE_ADRESSE = '#sources'

const pageActuelle = (): Page =>
  window.location.hash === ADRESSES.enSavoirPlus || window.location.hash === ANCIENNE_ADRESSE ? 'enSavoirPlus' : 'jeu'

const surveiller = (prevenir: () => void) => {
  window.addEventListener('hashchange', prevenir)
  return () => window.removeEventListener('hashchange', prevenir)
}

/** La page demandée par l'adresse, tenue à jour quand l'ancre change. */
export function usePage(): Page {
  // useSyncExternalStore : la façon prévue par React de suivre une valeur qui vit hors de React (ici, l'adresse).
  return useSyncExternalStore(surveiller, pageActuelle)
}
