/**
 * Taille de la mémoire : combien de Parties on garde. Une limite est nécessaire, sinon le stockage
 * grossirait à chaque Partie. Ce n'est pas une règle du jeu : si une tranche manque de paires,
 * le générateur réutilise une paire récente (assouplissement prévu par le PRD).
 *
 * Dans un fichier à part (sans rien du navigateur) pour que les scripts de simulation
 * (npm run calibrer, npm run analyse:paires) puissent l'utiliser.
 */
export const PARTIES_MEMORISEES = 3
