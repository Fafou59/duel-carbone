/**
 * L'empreinte de la création du jeu par IA : une estimation, la méthode complète est dans docs/empreinte-ia.md.
 *
 * Le jeu a été codé avec Claude (Anthropic). Chaque échange avec le modèle est compté en jetons (des morceaux de
 * mots) : ceux qu'il lit (la demande, et le contexte de la conversation qu'il garde en mémoire d'un échange à
 * l'autre) et ceux qu'il écrit. Ce n'est pas un chiffre de l'ADEME : aucune source publique ne donne l'énergie d'un
 * jeton pour ce modèle. D'où une fourchette, et des hypothèses écrites noir sur blanc.
 */

/** Les jetons consommés, par sorte (lus dans les journaux des sessions de travail). */
export type Jetons = {
  /** Lus pour la première fois, sans mémoire. */
  entree: number
  /** Lus puis mis en mémoire, pour les échanges suivants. */
  ecritureCache: number
  /** Relus depuis la mémoire : le contexte de la conversation. */
  lectureCache: number
  /** Écrits par le modèle. */
  sortie: number
}

/**
 * Ce que coûte chaque sorte de jeton, comparée à un jeton lu. Hypothèse : le prix d'Anthropic suit le calcul
 * nécessaire. Tarifs du modèle utilisé, Claude Opus 5.5 : relire un contexte en mémoire coûte 20 fois moins que le
 * lire, le mettre en mémoire un quart de plus, et écrire un jeton 5 fois plus (le modèle les produit un par un).
 */
export const PONDERATIONS: Jetons = { entree: 1, ecritureCache: 1.25, lectureCache: 0.05, sortie: 5 }

/** Le nombre de « jetons lus » équivalents. */
export const jetonsEquivalents = (j: Jetons): number =>
  j.entree * PONDERATIONS.entree +
  j.ecritureCache * PONDERATIONS.ecritureCache +
  j.lectureCache * PONDERATIONS.lectureCache +
  j.sortie * PONDERATIONS.sortie

/** Une hypothèse de calcul : l'énergie d'un jeton lu (centre de données compris), et le CO2e d'un kWh. */
export type Hypothese = { whParJeton: number; kgCo2eParKwh: number }

/** L'énergie consommée et son empreinte, pour une hypothèse. */
export function empreinteDeLaCreation(j: Jetons, h: Hypothese): { energieKwh: number; kgCo2e: number } {
  const energieKwh = (jetonsEquivalents(j) * h.whParJeton) / 1000
  return { energieKwh, kgCo2e: energieKwh * h.kgCo2eParKwh }
}
