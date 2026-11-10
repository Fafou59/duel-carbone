/** Le joueur a demandé à son appareil de réduire les animations (réglage d'accessibilité du système). */
export const mouvementReduit = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
