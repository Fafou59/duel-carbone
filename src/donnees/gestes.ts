/**
 * Catalogue des Gestes : le contenu éditorial du jeu.
 * Chaque Geste = un Équivalent ADEME × une Quantité (docs/adr/0001-geste-equivalent-fois-quantite.md).
 *
 * Pour ajouter un Geste, il suffit d'ajouter une entrée ici : les tests et l'import vérifient
 * automatiquement que l'Équivalent existe et que la Quantité est valide.
 *
 * Version de départ : les 18 Gestes validés dans le prototype (docs/prototypes/verdict-duel-ui.md).
 * Le catalogue complet (environ 80 Gestes) fait l'objet du ticket #12.
 */
import type { Geste } from '../domaine/geste.ts'

export const GESTES: Geste[] = [
  // Alimentation : Équivalents ADEME exprimés par kg
  {
    id: 'steak-boeuf',
    titre: 'Manger un steak de bœuf',
    sousTitre: '120 g',
    equivalent: 'boeuf',
    quantite: 0.12,
    justification: 'Portion individuelle courante de viande de bœuf.',
  },
  {
    id: 'poulet',
    titre: 'Manger du poulet',
    sousTitre: '150 g',
    equivalent: 'poulet',
    quantite: 0.15,
    justification: 'Portion individuelle courante de viande de volaille.',
  },
  {
    id: 'lentilles',
    titre: 'Manger des lentilles',
    sousTitre: '150 g',
    equivalent: 'lentilles',
    quantite: 0.15,
    justification:
      "Portion du prototype. À confirmer au ticket #12 : l'ADEME ne précise pas si le poids s'entend sec ou cuit.",
  },
  {
    id: 'avocat',
    titre: 'Manger un avocat',
    sousTitre: '200 g',
    equivalent: 'avocat',
    quantite: 0.2,
    justification: "Poids moyen d'un avocat entier.",
  },

  // Numérique, électroménager : Équivalents « par unité », usage sur la durée retenue par l'ADEME inclus
  {
    id: 'smartphone',
    titre: 'Acheter un smartphone',
    sousTitre: "et l'utiliser 2,5 ans",
    equivalent: 'smartphone',
    quantite: 1,
    justification: "Un appareil ; durée d'utilisation retenue par l'ADEME.",
  },
  {
    id: 'television',
    titre: 'Acheter une télévision',
    sousTitre: "et l'utiliser 8 ans",
    equivalent: 'television',
    quantite: 1,
    justification: "Un appareil ; durée d'utilisation retenue par l'ADEME.",
  },
  {
    id: 'enceinte-connectee',
    titre: 'Acheter une enceinte connectée',
    sousTitre: "et l'utiliser 5 ans",
    equivalent: 'enceintebluetooth',
    quantite: 1,
    justification: "Un appareil ; durée d'utilisation retenue par l'ADEME.",
  },
  {
    id: 'ordinateur-portable',
    titre: 'Acheter un ordinateur portable',
    sousTitre: "et l'utiliser 5 ans",
    equivalent: 'ordinateurportable',
    quantite: 1,
    justification: "Un appareil ; durée d'utilisation retenue par l'ADEME.",
  },
  {
    id: 'micro-ondes',
    titre: 'Acheter un micro-ondes',
    sousTitre: "et l'utiliser 12 ans",
    equivalent: 'microondes',
    quantite: 1,
    justification: "Un appareil ; durée d'utilisation retenue par l'ADEME.",
  },
  {
    id: 'lave-linge',
    titre: 'Acheter un lave-linge',
    sousTitre: "et l'utiliser 12 ans",
    equivalent: 'lavelinge',
    quantite: 1,
    justification: "Un appareil ; durée d'utilisation retenue par l'ADEME.",
  },
  {
    id: 'refrigerateur',
    titre: 'Acheter un réfrigérateur',
    sousTitre: "et l'utiliser 10 ans",
    equivalent: 'refrigirateur',
    quantite: 1,
    justification: "Un appareil ; durée d'utilisation retenue par l'ADEME.",
  },

  // Habillement : Équivalents « par unité », entretien sur 5 ans inclus
  {
    id: 'jean',
    titre: 'Acheter un jean',
    sousTitre: 'et le porter 5 ans',
    equivalent: 'jeans',
    quantite: 1,
    justification: "Un vêtement ; durée d'utilisation retenue par l'ADEME.",
  },
  {
    id: 'tshirt-coton',
    titre: 'Acheter un t-shirt en coton',
    sousTitre: 'et le porter 5 ans',
    equivalent: 'tshirtencoton',
    quantite: 1,
    justification: "Un vêtement ; durée d'utilisation retenue par l'ADEME.",
  },
  {
    id: 'tshirt-polyester',
    titre: 'Acheter un t-shirt en polyester',
    sousTitre: 'et le porter 5 ans',
    equivalent: 'tshirtenpolyester',
    quantite: 1,
    justification: "Un vêtement ; durée d'utilisation retenue par l'ADEME.",
  },
  {
    id: 'pull-laine',
    titre: 'Acheter un pull en laine',
    sousTitre: 'et le porter 5 ans',
    equivalent: 'pullenlaine',
    quantite: 1,
    justification: "Un vêtement ; durée d'utilisation retenue par l'ADEME.",
  },

  // Transport, livraison
  {
    id: 'paris-new-york',
    titre: 'Faire un aller-retour Paris–New York en avion',
    sousTitre: '1 passager',
    equivalent: 'avion-pny',
    quantite: 1,
    justification: "Cas pratique de l'ADEME : un aller-retour, pour un passager.",
  },
  {
    id: 'livraison-domicile',
    titre: 'Se faire livrer un colis de 1 kg',
    sousTitre: 'à domicile',
    equivalent: 'livraisondomicile',
    quantite: 1,
    justification: "Scénario de l'ADEME : un colis de 1 kg livré à domicile.",
  },
  {
    id: 'colis-magasin-voiture',
    titre: 'Aller chercher un colis de 1 kg en magasin',
    sousTitre: 'en voiture, 15 km aller',
    equivalent: 'magasin',
    quantite: 1,
    justification: "Scénario de l'ADEME : achat en magasin à 15 km, aller-retour en voiture, colis de 1 kg.",
  },
]
