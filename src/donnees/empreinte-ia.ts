import type { Hypothese, Jetons } from '../domaine/empreinte-ia.ts'

/**
 * Les mesures et les hypothèses de l'estimation de l'empreinte de la création du jeu par IA.
 * La méthode, les sources et les limites sont détaillées dans docs/empreinte-ia.md : à relire avant de changer
 * un chiffre ici. Les jetons se recomptent avec npm run empreinte-ia.
 */

/** Le jour du dernier décompte des jetons. */
export const DATE_DU_DECOMPTE = '2026-11-13'

/** Le premier jour de travail sur le projet. */
export const DEBUT_DU_PROJET = '2026-11-08'

/** Le nombre d'appels au modèle (Claude Opus 5.5) depuis le début du projet. */
export const APPELS = 2401

/** Les jetons consommés depuis le début du projet. */
export const JETONS: Jetons = {
  entree: 5_264,
  ecritureCache: 8_753_360,
  lectureCache: 784_011_822,
  sortie: 2_273_283,
}

/**
 * Trois hypothèses, de la plus favorable à la plus défavorable (sources et calculs : docs/empreinte-ia.md).
 * - Énergie d'un jeton lu équivalent, centre de données compris. Deux estimations indépendantes, pour des demandes
 *   longues comme les nôtres, tombent au même endroit : Epoch AI pour GPT-4o (0,2 à 0,4 mWh), Jegham et al. pour
 *   Claude 3.7 Sonnet (0,32 mWh). Des mesures sur du matériel récent (ML.ENERGY) montrent qu'on peut faire bien
 *   moins : de 0,15 à 0,45 mWh, 0,3 au centre.
 * - CO2e d'un kWh : les centres de données d'AWS, principal hébergeur de Claude, selon leur répartition par région
 *   (0,287 kg CO2e par kWh, Jegham et al.) : 0,3 au centre ; de 0,25 à 0,4 (la moyenne des États-Unis, 0,37).
 */
export const HYPOTHESES: Record<'basse' | 'centrale' | 'haute', Hypothese> = {
  basse: { whParJeton: 0.00015, kgCo2eParKwh: 0.25 },
  centrale: { whParJeton: 0.0003, kgCo2eParKwh: 0.3 },
  haute: { whParJeton: 0.00045, kgCo2eParKwh: 0.4 },
}
