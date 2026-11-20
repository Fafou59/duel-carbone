/**
 * Taille de la mémoire : combien de Parties on garde. Une limite est nécessaire, sinon le stockage
 * grossirait à chaque Partie. Ce n'est pas une règle du jeu : si une tranche manque de paires,
 * le générateur réutilise une paire récente (assouplissement prévu par le PRD).
 *
 * Dans un fichier à part (sans rien du navigateur) pour que les scripts de simulation
 * (npm run calibrer, npm run analyse:paires) puissent l'utiliser.
 *
 * 10 depuis l'élargissement du catalogue (issue 93, 120 Gestes tirables) : sur 2 000 Parties libres simulées,
 * plus aucun Duel ni Duel thématique ne revient dans les 10 Parties suivantes (2,8 % et 10 % avec 3 Parties),
 * sans aucun assouplissement, pour quelques Ko de stockage.
 */
export const PARTIES_MEMORISEES = 10
