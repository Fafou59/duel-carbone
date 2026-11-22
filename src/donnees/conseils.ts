/**
 * Catalogue des Conseils de fin de Partie : 26 Conseils écrits maison et validés par Fabien (issue 88).
 *
 * Règles d'écriture :
 * - une suggestion (« Et si… »), jamais un ordre ; à l'échelle d'une personne ;
 * - seulement des gestes à fort effet, ou de petits gestes fréquents dont le cumul sur l'année pèse
 *   (la fréquence est alors écrite dans le texte) : jamais un Conseil sur un geste négligeable ;
 * - les chiffres ne sont jamais écrits en dur : chaque {repère} du texte est calculé à partir des valeurs
 *   Impact CO2 de l'Instantané (par le slug de l'Équivalent ADEME), pour ne jamais contredire un Duel.
 *   Les hypothèses (2 repas par semaine, 10 km de trajet, 220 jours de travail…) restent, elles, dans le texte.
 * - `relu` garde les chiffres tels qu'ils ont été relus. Après un import ADEME, si l'un d'eux change, un test
 *   nomme le Conseil : relire le texte autour (« plus que… », « presque zéro »), puis recopier la nouvelle valeur.
 * - le lien mène à une page de l'ADEME : une action de Nos Gestes Climat, ou la FAQ d'Impact CO2 (une seule page :
 *   son titre est alors celui de la question à ouvrir, dans la partie « Idées pour agir »).
 *
 * Si l'ADEME accepte qu'on cite ses « Idées pour agir » (demande de Fabien du 22/11), on ne remplacera que `texte`.
 *
 * `declencheurs` : les Gestes du catalogue (src/donnees/gestes.ts) qui amènent ce Conseil quand ils sont dans la
 * Partie (choix dans src/domaine/conseils.ts).
 */
import type { Conseil } from '../domaine/conseils.ts'

/** 52 semaines par an ; les trajets domicile-travail, sur 220 jours de travail par an. */
const SEMAINES = 52
const JOURS_TRAVAILLES = 220
/** 10 km pour aller au travail, aller et retour, 220 jours par an : 4 400 km. */
const TRAJETS_TRAVAIL_KM = 2 * 10 * JOURS_TRAVAILLES

const NGC = 'https://nosgestesclimat.fr/actions'
const FAQ_IMPACT_CO2 = 'https://impactco2.fr/doc/questions-frequentes'

export const CONSEILS: Conseil[] = [
  // ─── Alimentation et boissons ───
  {
    id: 'repas-vegetarien',
    texte: 'Et si 2 repas au bœuf par semaine devenaient végétariens ? Environ {economie} kg CO2e de moins par an.',
    chiffres: {
      economie: { calcul: (v) => 2 * SEMAINES * (v.valeur('repasavecduboeuf') - v.valeur('repasvegetarien')), arrondi: 10 },
    },
    relu: { economie: '430' },
    lien: { url: `${NGC}/alimentation/reduire-viande`, titre: 'Manger moins de viande, par où commencer ?' },
    declencheurs: ['repas-boeuf', 'steak-boeuf', 'cheeseburger', 'kebab', 'repas-vegetarien', 'repas-vegetalien'],
  },
  {
    id: 'boeuf-poulet',
    texte:
      'Pas prêt à passer au végétarien ? Remplacer le bœuf par du poulet 2 fois par semaine, c’est déjà {economie} kg de moins par an.',
    chiffres: {
      economie: { calcul: (v) => 2 * SEMAINES * (v.valeur('repasavecduboeuf') - v.valeur('repasavecdupoulet')), arrondi: 5 },
    },
    relu: { economie: '365' },
    lien: {
      url: `${NGC}/alimentation/reduire-viande-rouge`,
      titre: 'Préserver sa santé en limitant sa consommation de viande',
    },
    declencheurs: ['repas-boeuf', 'steak-boeuf', 'cheeseburger', 'poulet', 'repas-poulet'],
  },
  {
    id: 'mangue-bateau',
    texte:
      'Une mangue venue par avion émet {fois} fois plus qu’une venue par bateau ({avion} kg contre {bateau} kg pour 400 g) : pour les fruits exotiques, cherche « transporté par bateau ».',
    chiffres: {
      fois: { calcul: (v) => v.valeur('mangue') / v.valeur('manguebateau'), arrondi: 1 },
      avion: { calcul: (v) => 0.4 * v.valeur('mangue'), arrondi: 0.1 },
      bateau: { calcul: (v) => 0.4 * v.valeur('manguebateau'), arrondi: 0.1 },
    },
    relu: { fois: '16', avion: '4,7', bateau: '0,3' },
    lien: { url: FAQ_IMPACT_CO2, titre: 'Comment reconnaître les aliments de saison au supermarché ?' },
    declencheurs: ['mangue-avion', 'mangue-bateau'],
  },
  {
    id: 'eau-du-robinet',
    // « Presque zéro » : l'eau du robinet émet 0,13 g CO2e par litre (Équivalent « eaudurobinet »).
    texte:
      '1,5 L d’eau en bouteille par jour, c’est {bouteille} kg CO2e par an. Une canette de soda par jour, {soda} kg par an. L’eau du robinet : presque zéro.',
    chiffres: {
      bouteille: { calcul: (v) => 1.5 * 365 * v.valeur('eauenbouteille'), arrondi: 5 },
      soda: { calcul: (v) => 0.33 * 365 * v.valeur('soda'), arrondi: 5 },
    },
    relu: { bouteille: '175', soda: '60' },
    lien: { url: FAQ_IMPACT_CO2, titre: 'Comment réduire l’impact carbone de l’alimentation ?' },
    declencheurs: ['eau-bouteille', 'eau-robinet', 'eau-bouteille-33cl', 'soda'],
  },
  {
    id: 'boisson-soja',
    texte: '1 L de lait de vache par semaine remplacé par une boisson au soja : {economie} kg de moins par an.',
    chiffres: {
      economie: { calcul: (v) => SEMAINES * (v.valeur('laitdevache') - v.valeur('soja')), arrondi: 1 },
    },
    relu: { economie: '38' },
    lien: {
      url: FAQ_IMPACT_CO2,
      titre: 'Comment concilier impact carbone, plaisir, prix et équilibre nutritionnel ?',
    },
    declencheurs: ['lait', 'boisson-soja'],
  },
  {
    id: 'produits-de-la-mer',
    texte: '100 g de crevettes émettent {fois} fois plus que 100 g de sardines ({crevettes} kg contre {sardines} kg).',
    chiffres: {
      fois: { calcul: (v) => v.valeur('crevettes') / v.valeur('sardines'), arrondi: 1 },
      crevettes: { calcul: (v) => 0.1 * v.valeur('crevettes'), arrondi: 0.1 },
      sardines: { calcul: (v) => 0.1 * v.valeur('sardines'), arrondi: 0.1 },
    },
    relu: { fois: '9', crevettes: '2', sardines: '0,2' },
    lien: {
      url: `${NGC}/alimentation/consommation-responsable-produit-mer`,
      titre: 'Comment choisir ses produits de la mer ?',
    },
    declencheurs: ['crevettes', 'cabillaud', 'sushis', 'repas-saumon'],
  },
  {
    id: 'legumineuses',
    texte: 'Un steak de bœuf de 150 g émet {fois} fois plus que 100 g de lentilles ({steak} kg contre {lentilles} kg).',
    chiffres: {
      fois: { calcul: (v) => (0.15 * v.valeur('boeuf')) / (0.1 * v.valeur('lentilles')), arrondi: 10 },
      steak: { calcul: (v) => 0.15 * v.valeur('boeuf'), arrondi: 0.1 },
      lentilles: { calcul: (v) => 0.1 * v.valeur('lentilles'), arrondi: 0.01 },
    },
    relu: { fois: '70', steak: '4,2', lentilles: '0,06' },
    lien: {
      url: `${NGC}/alimentation/cuisiner-plus-de-legumineuses`,
      titre: 'Pourquoi et comment cuisiner des légumineuses ?',
    },
    declencheurs: ['steak-boeuf', 'lentilles', 'tofu'],
  },

  // ─── Transport ───
  {
    id: 'avion-long-courrier',
    texte:
      'Un aller-retour Paris–New York, c’est environ {allerRetour} t CO2e : plus que tout le budget annuel visé en 2050 ({objectif} t).',
    chiffres: {
      allerRetour: { calcul: (v) => (2 * 5840 * v.valeur('avion-longcourrier')) / 1000, arrondi: 0.1 },
      // L'objectif 2050 de l'ADEME pour l'empreinte d'un Français, par an (Équivalent « 2050 »).
      objectif: { calcul: (v) => v.valeur('2050') / 1000, arrondi: 0.1 },
    },
    relu: { allerRetour: '2,1', objectif: '2' },
    lien: {
      url: `${NGC}/transport/limiter-avion-longues-distances`,
      titre: 'Avez-vous mesuré l’impact de votre voyage ?',
    },
    declencheurs: ['paris-new-york'],
  },
  {
    id: 'train-plutot-qu-avion',
    texte:
      'Paris–Marseille en TGV plutôt qu’en avion : {fois} fois moins, environ {economie} kg de moins pour un aller-retour.',
    chiffres: {
      fois: { calcul: (v) => (660 * v.valeur('avion-courtcourrier')) / (750 * v.valeur('tgv')), arrondi: 1 },
      economie: { calcul: (v) => 2 * (660 * v.valeur('avion-courtcourrier') - 750 * v.valeur('tgv')), arrondi: 10 },
    },
    relu: { fois: '67', economie: '290' },
    lien: {
      url: `${NGC}/transport/limiter-avion-courtes-distances`,
      titre: 'Explorer les alternatives aux vols courts-courriers',
    },
    declencheurs: ['paris-marseille-avion', 'paris-marseille-tgv'],
  },
  {
    id: 'velo-electrique',
    texte:
      '10 km pour aller au travail, à vélo électrique plutôt qu’en voiture : environ {economie} kg de moins par an (220 jours, aller-retour).',
    chiffres: {
      economie: {
        calcul: (v) => TRAJETS_TRAVAIL_KM * (v.valeur('voiturethermique') - v.valeur('veloelectrique')),
        arrondi: 10,
      },
    },
    relu: { economie: '580' },
    lien: { url: FAQ_IMPACT_CO2, titre: 'Quelles sont les alternatives à la voiture ?' },
    declencheurs: ['voiture-10km', 'velo-electrique-10km', 'trottinette-10km', 'scooter-10km'],
  },
  {
    id: 'voiture-electrique',
    // Seul à l'écran, ce Conseil ne peut pas renvoyer au précédent (« la même distance ») : la distance est redite.
    texte:
      'Si la voiture est indispensable pour aller au travail (10 km), la même distance en électrique : environ {economie} kg de moins par an.',
    chiffres: {
      economie: {
        calcul: (v) => TRAJETS_TRAVAIL_KM * (v.valeur('voiturethermique') - v.valeur('voitureelectrique')),
        arrondi: 10,
      },
    },
    relu: { economie: '330' },
    lien: {
      url: `${NGC}/transport/voiture-electrique`,
      titre: 'Acquérir un véhicule électrique : qu’est-ce que vous y gagnez ?',
    },
    declencheurs: ['voiture-10km', 'voiture-electrique-10km', 'paris-marseille-voiture'],
  },
  {
    id: 'teletravail',
    // 46 semaines travaillées, 20 km par jour (10 km aller, 10 km retour).
    texte:
      'Un jour de télétravail par semaine, quand on va au travail en voiture (10 km) : environ {economie} kg de trajets en moins par an.',
    chiffres: { economie: { calcul: (v) => 46 * 20 * v.valeur('voiturethermique'), arrondi: 10 } },
    relu: { economie: '130' },
    lien: {
      url: FAQ_IMPACT_CO2,
      titre: 'Est-ce que le télétravail permet de diminuer l’impact carbone de mes déplacements ?',
    },
    declencheurs: ['voiture-10km', 'visioconference'],
  },
  {
    id: 'covoiturage-longue-distance',
    texte:
      'Partir à 4 en covoiturage divise ta part par 4 : un aller-retour Paris–Marseille passe de {seul} à {aQuatre} kg.',
    chiffres: {
      seul: { calcul: (v) => 2 * 775 * v.valeur('voiturethermique'), arrondi: 10 },
      aQuatre: { calcul: (v) => (2 * 775 * v.valeur('voiturethermique')) / 4, arrondi: 5 },
    },
    relu: { seul: '220', aQuatre: '55' },
    lien: {
      url: `${NGC}/transport/covoiturage-vacances`,
      titre: 'Covoiturer sur de longs trajets : astuces et précautions',
    },
    declencheurs: ['paris-marseille-voiture', 'paris-marseille-covoiturage', 'paris-marseille-camping-car'],
  },
  {
    id: 'cent-kilometres',
    texte: '100 km seul en voiture, c’est {voiture} kg ; en TER, {ter} kg ; en TGV, {tgv} kg.',
    chiffres: {
      voiture: { calcul: (v) => 100 * v.valeur('voiturethermique'), arrondi: 1 },
      ter: { calcul: (v) => 100 * v.valeur('ter'), arrondi: 0.1 },
      tgv: { calcul: (v) => 100 * v.valeur('tgv'), arrondi: 0.1 },
    },
    relu: { voiture: '14', ter: '2,8', tgv: '0,3' },
    lien: { url: FAQ_IMPACT_CO2, titre: 'Quel est le moyen de transport le moins impactant pour le climat ?' },
    declencheurs: ['ter-100km', 'tgv-100km', 'autocar-100km'],
  },
  {
    id: 'petits-trajets',
    // 3 allers-retours de 3 km par semaine, toute l'année ; le vélo (mécanique) compte sa fabrication.
    texte:
      'Les trajets de moins de 3 km, à pied ou à vélo plutôt qu’en voiture : 3 allers-retours par semaine, c’est {economie} kg de moins par an.',
    chiffres: {
      economie: { calcul: (v) => 3 * 2 * 3 * SEMAINES * (v.valeur('voiturethermique') - v.valeur('velo')), arrondi: 1 },
    },
    relu: { economie: '133' },
    lien: {
      url: `${NGC}/transport/petits-trajets-sans-voiture`,
      titre: 'Laisser la voiture au garage pour les petits trajets',
    },
    declencheurs: ['voiture-10km', 'scooter-10km'],
  },
  {
    id: 'ecole-sans-voiture',
    // 2 km jusqu'à l'école, aller et retour, matin et soir : 8 km par jour, 180 jours d'école par an.
    texte:
      'Emmener les enfants à l’école (2 km) à pied ou à vélo plutôt qu’en voiture : environ {economie} kg de moins par an.',
    chiffres: {
      economie: { calcul: (v) => 8 * 180 * (v.valeur('voiturethermique') - v.valeur('velo')), arrondi: 10 },
    },
    relu: { economie: '200' },
    lien: {
      url: `${NGC}/transport/emmener-enfants-ecole`,
      titre: 'Parent ? Emmener les enfants à l’école sans voiture',
    },
    declencheurs: ['voiture-10km'],
  },
  {
    id: 'covoiturage-quotidien',
    texte:
      'Covoiturer à 2 pour aller au travail (10 km) divise ta part par deux : environ {economie} kg de moins par an.',
    chiffres: { economie: { calcul: (v) => (TRAJETS_TRAVAIL_KM * v.valeur('voiturethermique')) / 2, arrondi: 10 } },
    relu: { economie: '310' },
    lien: {
      url: `${NGC}/transport/covoiturage-quotidien`,
      titre: 'Covoiturer au quotidien : comment s’y prendre ?',
    },
    declencheurs: ['voiture-10km', 'paris-marseille-covoiturage'],
  },
  {
    id: 'transports-en-commun',
    texte:
      '10 km pour aller au travail en métro ou en tram plutôt qu’en voiture : {fois} fois moins, environ {economie} kg de moins par an.',
    chiffres: {
      fois: { calcul: (v) => v.valeur('voiturethermique') / v.valeur('metro'), arrondi: 1 },
      economie: { calcul: (v) => TRAJETS_TRAVAIL_KM * (v.valeur('voiturethermique') - v.valeur('metro')), arrondi: 100 },
    },
    relu: { fois: '32', economie: '600' },
    lien: {
      url: `${NGC}/transport/transports-en-commun`,
      titre: 'Découvrir les lignes de transports en commun à proximité',
    },
    declencheurs: ['voiture-10km', 'metro-10km', 'tramway-10km', 'bus-10km', 'bus-electrique-10km'],
  },

  // ─── Objets, achats et logement ───
  {
    id: 'garder-son-smartphone',
    texte:
      '{part} % de l’empreinte d’un smartphone vient de sa fabrication : le garder plus longtemps ou le faire réparer, c’est le geste numérique qui compte vraiment.',
    chiffres: {
      part: { calcul: (v) => (100 * v.etape('smartphone', 'Construction')) / v.valeur('smartphone'), arrondi: 1 },
    },
    relu: { part: '96' },
    lien: { url: FAQ_IMPACT_CO2, titre: 'Le réemploi des appareils permet-il de réduire leur impact ?' },
    declencheurs: ['smartphone', 'tablette'],
  },
  {
    id: 'reparer-sa-television',
    texte:
      'Une télévision, c’est {total} kg CO2e, dont {part} % pour sa fabrication. La faire réparer prolonge sa durée de vie et émet moins que d’en acheter une nouvelle.',
    chiffres: {
      total: { calcul: (v) => v.valeur('television'), arrondi: 10 },
      part: { calcul: (v) => (100 * v.etape('television', 'Construction')) / v.valeur('television'), arrondi: 1 },
    },
    relu: { total: '370', part: '88' },
    lien: { url: `${NGC}/consommation/reparer-objet`, titre: 'Réparer ou faire réparer : est-ce bien rentable ?' },
    declencheurs: ['television', 'ecran'],
  },
  {
    id: 'vetements-seconde-main',
    // « Avant que tu le portes » : toutes les étapes avant l'usage (matières, fabrication, distribution), sur le total.
    texte:
      '{part} % de l’empreinte d’un jean est émise avant que tu le portes. Seconde main, réparation : chaque vêtement qu’on n’achète pas neuf compte.',
    chiffres: { part: { calcul: (v) => (100 * v.fabrication('jeans')) / v.valeur('jeans'), arrondi: 1 } },
    relu: { part: '92' },
    lien: {
      url: `${NGC}/consommation/achat-seconde-main`,
      titre: 'Acheter d’occasion, qu’est-ce que vous allez y gagner ?',
    },
    declencheurs: [
      'jean',
      'tshirt-coton',
      'tshirt-polyester',
      'chemise-coton',
      'sweat-coton',
      'pull-acrylique',
      'pull-laine',
      'manteau',
      'chaussures-sport',
    ],
  },
  {
    id: 'meubles-d-occasion',
    texte:
      'Un canapé neuf, c’est {total} kg CO2e, autant que {repas} repas au bœuf : l’occasion, c’est autant de fabrication évitée.',
    chiffres: {
      total: { calcul: (v) => v.valeur('canapetextile'), arrondi: 1 },
      repas: { calcul: (v) => v.valeur('canapetextile') / v.valeur('repasavecduboeuf'), arrondi: 1 },
    },
    relu: { total: '179', repas: '36' },
    lien: {
      url: `${NGC}/consommation/achat-seconde-main`,
      titre: 'Acheter d’occasion, qu’est-ce que vous allez y gagner ?',
    },
    declencheurs: ['canape', 'lit', 'armoire', 'table', 'chaise'],
  },
  {
    id: 'pompe-a-chaleur',
    texte:
      'Remplacer une chaudière au gaz par une pompe à chaleur, c’est environ {gaz} kg CO2e de moins par an pour ta part du logement (40 m²). Depuis une chaudière au fioul, environ {fioul} kg.',
    chiffres: {
      gaz: { calcul: (v) => 40 * (v.valeur('chauffagegaz') - v.valeur('pompeachaleur')), arrondi: 5 },
      fioul: { calcul: (v) => 40 * (v.valeur('chauffagefioul') - v.valeur('pompeachaleur')), arrondi: 10 },
    },
    relu: { gaz: '665', fioul: '1 350' },
    lien: {
      url: `${NGC}/logement/chauffage-energies-renouvables`,
      titre: 'Quelle énergie choisir pour votre chauffage ?',
    },
    declencheurs: ['chauffage-gaz', 'chauffage-fioul', 'chauffage-pac'],
  },
  {
    id: 'grouper-ses-achats',
    // 2 achats par mois : 24 trajets de 30 km aller-retour par an, comparés à 24 livraisons d'un colis de 1 kg.
    texte:
      'Faire 30 km en voiture pour un achat, c’est {fois} fois une livraison à domicile. Pour 2 achats par mois, ça fait {economie} kg par an : groupe tes courses, ou fais-toi livrer.',
    chiffres: {
      fois: { calcul: (v) => v.valeur('magasin') / v.valeur('livraisondomicile'), arrondi: 0.1 },
      economie: { calcul: (v) => 24 * (v.valeur('magasin') - v.valeur('livraisondomicile')), arrondi: 10 },
    },
    relu: { fois: '6,7', economie: '100' },
    lien: { url: 'https://impactco2.fr/outils/livraison', titre: 'Livraison' },
    declencheurs: ['colis-magasin-voiture', 'livraison-domicile', 'livraison-point-relais', 'colis-magasin-velo'],
  },
  {
    id: 'ordinateur-reconditionne',
    texte:
      'Un ordinateur portable reconditionné plutôt que neuf, c’est la fabrication d’un neuf en moins : {fabrication} kg CO2e.',
    chiffres: { fabrication: { calcul: (v) => v.etape('ordinateurportable', 'Construction'), arrondi: 10 } },
    relu: { fabrication: '170' },
    lien: {
      url: `${NGC}/consommation/achat-reconditionne`,
      titre: 'Produits reconditionnés : des bons plans pour bien acheter',
    },
    declencheurs: ['ordinateur-portable', 'ordinateur-fixe'],
  },
  {
    id: 'frais-sans-clim',
    texte:
      'Un climatiseur, c’est {total} kg CO2e sur sa durée de vie. Volets fermés le jour, fenêtres ouvertes la nuit : le frais sans en acheter un.',
    chiffres: { total: { calcul: (v) => v.valeur('climatiseur'), arrondi: 10 } },
    relu: { total: '420' },
    lien: {
      url: `${NGC}/logement/logement-frais-sans-climatisation`,
      titre: 'Comment conserver le frais chez soi sans clim’ ?',
    },
    declencheurs: ['climatiseur'],
  },
]
