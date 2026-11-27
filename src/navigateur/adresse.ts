/**
 * La navigation entre les pages, sans bibliothèque : l'ancre de l'adresse (la partie après « # »).
 *
 * - « …/#en-savoir-plus » affiche la page En savoir plus ; « …/#mentions-legales », la page Mentions légales et vie
 *   privée ; « …/#animer », l'écran de l'Animateur d'une Séance (Mode
 *   animation) ; « …/#rejoindre/K7RM4P », le téléphone du Participant, avec le code de la Séance (celle qu'ouvre le
 *   QR code ; « …/#rejoindre » seul demande le code) ; toute autre adresse affiche le jeu.
 * - Un lien <a href="#en-savoir-plus"> change l'ancre sans recharger la page : le navigateur prévient
 *   par l'événement « hashchange », et React réaffiche la bonne page.
 * - Le bouton « Retour » du téléphone et les liens partagés fonctionnent d'eux-mêmes.
 * - L'hébergeur n'a rien à configurer : le serveur reçoit toujours la même page, l'ancre ne lui est jamais envoyée.
 */
import { useSyncExternalStore } from 'react'

export type Page = 'jeu' | 'enSavoirPlus' | 'mentionsLegales' | 'animer' | 'rejoindre'

/** L'adresse (relative) de chaque page, pour les liens. */
export const ADRESSES: Record<Page, string> = {
  jeu: '#',
  enSavoirPlus: '#en-savoir-plus',
  mentionsLegales: '#mentions-legales',
  animer: '#animer',
  rejoindre: '#rejoindre',
}

/** L'ancienne adresse de la page (quand elle s'appelait « Sources et méthode ») : les liens déjà partagés marchent. */
const ANCIENNE_ADRESSE = '#sources'

const pageActuelle = (): Page => {
  const ancre = window.location.hash
  if (ancre === ADRESSES.enSavoirPlus || ancre === ANCIENNE_ADRESSE) return 'enSavoirPlus'
  if (ancre === ADRESSES.mentionsLegales) return 'mentionsLegales'
  if (ancre === ADRESSES.rejoindre || ancre.startsWith(`${ADRESSES.rejoindre}/`)) return 'rejoindre'
  return ancre === ADRESSES.animer ? 'animer' : 'jeu'
}

/**
 * L'adresse qu'ouvre le QR code d'une Séance : le téléphone y rejoint la Séance, son code déjà rempli (la page
 * elle-même vient avec le téléphone du Participant, lot 3 du Mode animation).
 */
export const adresseDeRejoindre = (origine: string, code: string): string => `${origine}/${ADRESSES.rejoindre}/${code}`

/** Le code écrit dans l'adresse « #rejoindre/K7RM4P » (tel quel, à vérifier), ou une chaîne vide. */
export function codeDeLAdresse(ancre: string = window.location.hash): string {
  if (!ancre.startsWith(`${ADRESSES.rejoindre}/`)) return ''
  try {
    return decodeURIComponent(ancre.slice(ADRESSES.rejoindre.length + 1))
  } catch {
    return '' // une adresse abîmée (« %E9 » seul) : on demandera le code
  }
}

const surveiller = (prevenir: () => void) => {
  window.addEventListener('hashchange', prevenir)
  return () => window.removeEventListener('hashchange', prevenir)
}

/** La page demandée par l'adresse, tenue à jour quand l'ancre change. */
export function usePage(): Page {
  // useSyncExternalStore : la façon prévue par React de suivre une valeur qui vit hors de React (ici, l'adresse).
  return useSyncExternalStore(surveiller, pageActuelle)
}
