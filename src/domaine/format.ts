/** Mise en forme des nombres pour le joueur : conventions françaises, unités lisibles. */

const nombre = (n: number, decimales: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: decimales, minimumFractionDigits: 0 })
    .format(n)
    // Le vrai signe moins (−), plus lisible que le tiret (-).
    .replace('-', '−')

/**
 * Une empreinte en kg CO2e, dans l'unité la plus parlante :
 * « 311 g CO2e », « 3,4 kg CO2e », « 370 kg CO2e », « 2,1 t CO2e ».
 */
export function formaterEmpreinte(kg: number, { co2e = true }: { co2e?: boolean } = {}): string {
  const suffixe = co2e ? ' CO2e' : ''
  const absolu = Math.abs(kg)
  if (absolu >= 1000) return `${nombre(kg / 1000, 1)} t${suffixe}`
  if (absolu >= 100) return `${nombre(kg, 0)} kg${suffixe}`
  // Sous 1 kg, on passe en grammes, sauf si l'arrondi donnerait « 1 000 g ».
  if (absolu < 1 && Math.round(absolu * 1000) < 1000) return `${nombre(kg * 1000, 0)} g${suffixe}`
  return `${nombre(kg, 1)} kg${suffixe}`
}

/** Le Rapport d'un Duel : « ×11 » (sans décimale dès ×10), « ×1,6 ». */
export function formaterRapport(rapport: number): string {
  return `×${nombre(rapport, rapport >= 10 ? 0 : 1)}`
}

/**
 * « que » ou « qu' » selon le mot qui suit, avec une minuscule initiale :
 * « que manger un avocat », « qu'acheter un micro-ondes ».
 */
export function queDevant(texte: string): string {
  const minuscule = texte.charAt(0).toLowerCase() + texte.slice(1)
  return /^[aeiouyàâäéèêëîïôöùûüh]/i.test(minuscule) ? `qu'${minuscule}` : `que ${minuscule}`
}

/** Le multiple d'une équivalence « 1 A = 10,8 B ». */
export function formaterMultiple(multiple: number): string {
  return nombre(multiple, 1)
}
