/**
 * La navigation entre les pages, sans bibliothèque : l'ancre de l'adresse (la partie après « # »).
 *
 * - « …/#en-savoir-plus » affiche la page En savoir plus ; « …/#animer », l'écran de l'Animateur d'une Séance (Mode
 *   animation) ; toute autre adresse affiche le jeu.
 * - Un lien <a href="#en-savoir-plus"> change l'ancre sans recharger la page : le navigateur prévient
 *   par l'événement « hashchange », et React réaffiche la bonne page.
 * - Le bouton « Retour » du téléphone et les liens partagés fonctionnent d'eux-mêmes.
 * - L'hébergeur n'a rien à configurer : le serveur reçoit toujours la même page, l'ancre ne lui est jamais envoyée.
 */
import { useSyncExternalStore } from 'react'

export type Page = 'jeu' | 'enSavoirPlus' | 'animer'

/** L'adresse (relative) de chaque page, pour les liens. */
export const ADRESSES: Record<Page, string> = { jeu: '#', enSavoirPlus: '#en-savoir-plus', animer: '#animer' }

/** L'ancienne adresse de la page (quand elle s'appelait « Sources et méthode ») : les liens déjà partagés marchent. */
const ANCIENNE_ADRESSE = '#sources'

const pageActuelle = (): Page => {
  const ancre = window.location.hash
  if (ancre === ADRESSES.enSavoirPlus || ancre === ANCIENNE_ADRESSE) return 'enSavoirPlus'
  return ancre === ADRESSES.animer ? 'animer' : 'jeu'
}

/**
 * L'adresse qu'ouvre le QR code d'une Séance : le téléphone y rejoint la Séance, son code déjà rempli (la page
 * elle-même vient avec le téléphone du Participant, lot 3 du Mode animation).
 */
export const adresseDeRejoindre = (origine: string, code: string): string => `${origine}/#rejoindre/${code}`

const surveiller = (prevenir: () => void) => {
  window.addEventListener('hashchange', prevenir)
  return () => window.removeEventListener('hashchange', prevenir)
}

/** La page demandée par l'adresse, tenue à jour quand l'ancre change. */
export function usePage(): Page {
  // useSyncExternalStore : la façon prévue par React de suivre une valeur qui vit hors de React (ici, l'adresse).
  return useSyncExternalStore(surveiller, pageActuelle)
}
