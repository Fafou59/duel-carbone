/**
 * L'icône de chaque Geste (ticket #14) : un fichier SVG par Geste, public/icones/<identifiant du Geste>.svg.
 *
 * Les icônes viennent de Fluent Emoji « Flat » (Microsoft, licence MIT), complétées par des dessins maison
 * dans le même style quand l'icône officielle n'est pas parlante. Elles sont fabriquées par npm run icones
 * (scripts/icones/) : pour un nouveau Geste, on lui choisit une icône là-bas, puis on relance le script.
 *
 * Contrairement aux emojis du système, ces images s'affichent à l'identique sur Android, iOS, Windows et macOS.
 */
export const iconeDe = (idGeste: string): string => `${import.meta.env.BASE_URL}icones/${idGeste}.svg`
