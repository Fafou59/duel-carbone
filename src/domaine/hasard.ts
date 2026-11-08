/**
 * Une « source de hasard » est une fonction qui renvoie un nombre entre 0 (inclus) et 1 (exclu),
 * comme Math.random. Le jeu utilise Math.random ; les tests utilisent une source reproductible :
 * même graine = même suite de nombres, donc des tests qui donnent toujours le même résultat.
 */
export type SourceDeHasard = () => number

/** Générateur pseudo-aléatoire « mulberry32 » : court, rapide et reproductible à partir d'une graine. */
export function hasardReproductible(graine: number): SourceDeHasard {
  let etat = graine >>> 0
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0
    let t = etat
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Mélange une copie du tableau (algorithme de Fisher-Yates), sans modifier l'original. */
export function melanger<T>(elements: readonly T[], hasard: SourceDeHasard): T[] {
  const copie = [...elements]
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1))
    ;[copie[i], copie[j]] = [copie[j], copie[i]]
  }
  return copie
}
