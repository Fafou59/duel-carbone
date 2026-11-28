/**
 * Les deux chiffres du Rappel du matin (ADR 0008), partagés par le serveur (serveur/rappel.ts) et les pages à lire
 * (En savoir plus, Mentions légales et vie privée) : changer l'un les change partout.
 */

/** L'heure du Rappel, à Paris, été comme hiver. */
export const HEURE_DU_RAPPEL = 7

/** Sans ouverture du jeu pendant ce nombre de jours, l'abonnement est effacé (la CNIL attend une durée précise). */
export const JOURS_DE_CONSERVATION = 90
