/**
 * Une expression régulière qui cherche ce texte tel quel, où qu'il soit dans un nom accessible.
 * Les caractères spéciaux sont échappés : certains titres de Gestes contiennent des parenthèses
 * (« Acheter un ordinateur fixe (sans écran) »).
 */
export const contenant = (texte: string): RegExp => new RegExp(texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
