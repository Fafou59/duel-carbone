/**
 * Ce que voient les moteurs de recherche et les aperçus de lien (WhatsApp, LinkedIn, Messenger, X…).
 *
 * Ces robots ne lancent pas le JavaScript du jeu : ils lisent seulement index.html, tel qu'il est envoyé.
 * Les balises sont donc écrites à la main dans index.html ; ce fichier réunit les valeurs que le code du jeu
 * doit répéter (le titre de l'onglet), et un test (referencement.test.ts) vérifie que les deux concordent.
 */

/** L'adresse officielle (canonique) du jeu : celle que les moteurs doivent retenir, quelle que soit l'adresse visitée. */
export const ADRESSE_CANONIQUE = 'https://duelcarbone.fr/'

/**
 * Le titre de l'accueil : dans l'onglet, dans les résultats de recherche et en tête des aperçus de lien.
 * Le nom du jeu d'abord (il reste lisible dans un onglet étroit), puis ce qu'on y fait.
 */
export const TITRE_ACCUEIL = 'Duel Carbone : le jeu qui compare l’empreinte carbone des gestes du quotidien'

/** Le titre de l'onglet sur la page En savoir plus. */
export const TITRE_EN_SAVOIR_PLUS = 'En savoir plus · Duel Carbone'

/** L'image des aperçus de lien (npm run image-partage), aux dimensions conseillées par Facebook et LinkedIn. */
export const IMAGE_PARTAGE = { fichier: 'apercu-partage.png', largeur: 1200, hauteur: 630 } as const
