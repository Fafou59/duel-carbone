import type { Hypothese, Jetons } from '../domaine/empreinte-ia.ts'

/**
 * Les mesures et les hypothèses de l'estimation de l'empreinte de la création du jeu par IA.
 * La méthode, les sources et les limites sont détaillées dans docs/empreinte-ia.md : à relire avant de changer
 * un chiffre ici. Les jetons se recomptent avec npm run empreinte-ia.
 */

/** Le jour du dernier décompte des jetons. */
export const DATE_DU_DECOMPTE = '2026-11-12'

/** Le premier jour de travail sur le projet. */
export const DEBUT_DU_PROJET = '2026-11-08'

/** Le nombre d'appels au modèle (Claude Opus) depuis le début du projet. */
export const APPELS = 1919

/** Les jetons consommés depuis le début du projet. */
export const JETONS: Jetons = {
  entree: 4_182,
  ecritureCache: 7_191_528,
  lectureCache: 675_877_238,
  sortie: 1_929_432,
}

/**
 * Trois hypothèses, de la plus favorable à la plus défavorable.
 * - Énergie d'un jeton lu, centre de données compris : Epoch AI estime qu'une demande à GPT-4o avec 10 000 jetons
 *   lus consomme environ 2,5 Wh, et environ 40 Wh avec 100 000 jetons, soit 0,2 à 0,4 mWh par jeton. Claude Opus
 *   est sans doute plus gros que GPT-4o : de 0,1 à 0,6 mWh, 0,3 au centre.
 * - CO2e d'un kWh : les serveurs d'Anthropic sont surtout aux États-Unis, dont l'électricité émet en moyenne
 *   environ 0,37 kg CO2e par kWh (de 0,2 dans les régions les moins carbonées à 0,45).
 */
export const HYPOTHESES: Record<'basse' | 'centrale' | 'haute', Hypothese> = {
  basse: { whParJeton: 0.0001, kgCo2eParKwh: 0.2 },
  centrale: { whParJeton: 0.0003, kgCo2eParKwh: 0.37 },
  haute: { whParJeton: 0.0006, kgCo2eParKwh: 0.45 },
}
