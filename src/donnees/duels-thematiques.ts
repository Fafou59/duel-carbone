/**
 * Catalogue des Duels thématiques : les pièges choisis et rédigés à la main (ticket #13), validés par Fabien.
 *
 * Pour chacun : les deux Gestes (identifiants du catalogue), le titre et l'accroche de l'annonce
 * (qui ne donnent jamais la réponse), puis le texte affiché après la réponse.
 * Règle d'écriture : uniquement des chiffres publiés par l'ADEME (Répartition de l'Instantané ou page
 * Impact CO2), aucune explication de cause qui ne serait pas dans les données.
 *
 * Leur place dans la Partie vient de leur Rapport (src/domaine/thematiques.ts) : pas de Difficulté à écrire.
 */
import type { DuelThematique } from '../domaine/thematiques.ts'

export const DUELS_THEMATIQUES: DuelThematique[] = [
  // ─── Boissons et alimentation ───
  {
    a: 'eau-bouteille',
    b: 'eau-robinet',
    titre: 'Robinet contre bouteille',
    accroche: "Même eau, même verre… mais pas le même chemin pour arriver jusqu'à toi.",
    texte:
      "L'eau du robinet arrive par des canalisations déjà en place : 0,2 g de CO2e pour 1,5 L. En bouteille, presque tout vient de l'emballage (58 %) et du transport (36 %). Ce qu'on paie en carbone, c'est le plastique et le camion, pas l'eau.",
  },
  {
    a: 'mangue-avion',
    b: 'mangue-bateau',
    titre: 'Le match des mangues',
    accroche: 'Même fruit, même poids… mais pas le même voyage.',
    texte:
      "Les deux mangues sont cultivées de la même façon : 60 g de CO2e chacune. Tout se joue pendant le voyage. Par avion, le transport pèse 4,6 kg, soit 98 % de l'empreinte ; par bateau, 189 g.",
  },
  {
    a: 'cafe',
    b: 'the',
    titre: 'La pause boisson',
    accroche: 'Deux boissons chaudes du matin : laquelle pèse le plus ?',
    texte:
      "La différence se joue dès la plantation : l'agriculture pèse 109 g pour un mug de café, contre 5,6 g pour un mug de thé. Même en comptant l'eau chauffée pour le thé (2,9 g), il reste près de 15 fois moins émetteur.",
  },
  {
    a: 'crevettes',
    b: 'canard',
    titre: 'Fruits de mer contre volaille',
    accroche: 'Une petite portion de crevettes (100 g) ou un demi-magret de canard (150 g) ?',
    texte:
      "Au kilo, les crevettes émettent 20,3 kg de CO2e, plus de deux fois le canard (8,1 kg). L'étape agricole pèse à elle seule 1,8 kg, soit 88 % de leur empreinte. Même en portion plus petite, elles l'emportent.",
  },
  {
    a: 'cabillaud',
    b: 'porc',
    titre: 'Poisson ou viande ?',
    accroche: 'Un filet de cabillaud ou une côte de porc ?',
    texte:
      "On imagine souvent le poisson plus léger que la viande. Pourtant, au kilo, le cabillaud émet 12,1 kg de CO2e, presque deux fois le porc (6,7 kg). L'essentiel vient de l'étape de production (85 %), loin devant le transport (11 %).",
  },
  {
    a: 'pizza',
    b: 'repas-vegetarien',
    titre: 'Deux assiettes sans viande',
    accroche: 'Deux repas végétariens : une pizza quatre fromages, ou un repas type avec légumes, pain et dessert ?',
    texte:
      "Le repas végétarien type de l'ADEME (légumes, 120 g de protéines animales hors viande, pain et dessert) émet 0,85 kg. La pizza quatre fromages, végétarienne elle aussi, émet 1,44 kg : presque autant qu'un repas avec du poulet (1,46 kg).",
  },
  {
    a: 'mangue-avion',
    b: 'steak-boeuf',
    titre: 'Fruit exotique contre viande rouge',
    accroche: 'Un steak de bœuf ou une mangue importée par avion ?',
    texte:
      "Le bœuf a la réputation d'être très émetteur, à juste titre : 28 kg de CO2e au kilo. Mais une mangue arrivée par avion fait plus encore : 4,66 kg pour un fruit de 400 g, dont 98 % pour le transport. Par bateau, la même mangue ne pèse que 291 g, plus de dix fois moins que le steak.",
  },
  {
    a: 'pain-au-chocolat',
    b: 'croissant',
    titre: 'Croissant ou chocolatine ?',
    accroche: 'Même pâte feuilletée, même poids : croissant ou pain au chocolat ?',
    texte:
      "À poids égal, le pain au chocolat émet près de deux fois plus que le croissant : 344 g contre 177 g. La différence se joue à l'étape agricole, qui pèse 285 g pour le pain au chocolat, contre 121 g pour le croissant.",
  },
  {
    a: 'lait',
    b: 'boisson-soja',
    titre: 'Vache ou soja ?',
    accroche: 'Au petit-déjeuner : un verre de lait de vache ou un verre de boisson au soja ?',
    texte:
      "Pour le lait, l'étape agricole pèse 203 g, soit 71 % de son empreinte. Pour la boisson au soja, seulement 22 g : le reste se répartit entre la transformation, l'emballage et le transport. Au total, le verre de lait émet 2,7 fois plus.",
  },
  {
    a: 'poulet',
    b: 'nuggets-vegetaux',
    titre: 'Nuggets végétaux contre poulet',
    accroche: 'Une portion de poulet, ou la même quantité de nuggets végétaux ?',
    texte:
      "Le poulet émet plus : 684 g contre 266 g. Mais l'écart n'est « que » de 2,6 : pour les nuggets végétaux, l'étape agricole ne pèse que 31 %, et la transformation, l'emballage et le transport font l'essentiel.",
  },
  {
    a: 'repas-boeuf',
    b: 'repas-poulet',
    titre: 'Bœuf ou poulet ?',
    accroche: "Deux assiettes du midi : l'une avec du bœuf, l'autre avec du poulet.",
    texte:
      'Un repas avec du bœuf émet 4,97 kg de CO2e, un repas avec du poulet 1,46 kg : 3,4 fois moins. Un repas végétarien descend encore, à 0,85 kg.',
  },
  {
    a: 'repas-vegetarien',
    b: 'repas-vegetalien',
    titre: 'Végétarien ou végétalien ?',
    accroche: 'Deux repas sans viande : végétarien ou végétalien ?',
    texte:
      "Sans viande, l'empreinte d'un repas chute déjà : 0,85 kg pour un repas végétarien, contre 4,97 kg avec du bœuf. Sans aucun produit animal (ni œufs, ni produits laitiers), le repas végétalien descend à 0,54 kg, soit 1,6 fois moins.",
  },

  // ─── Transports ───
  {
    a: 'paris-marseille-covoiturage',
    b: 'paris-marseille-tgv',
    titre: "Covoit' ou TGV ?",
    accroche: 'À quatre dans la voiture, on partage les frais… et les émissions. Assez pour battre le train ?',
    texte:
      'Le covoiturage divise bien l’empreinte de la voiture par quatre : ta part tombe à 27,6 kg. Mais le TGV part de beaucoup plus bas, avec 2,2 kg par passager, car il roule à l’électricité. Même à quatre, la voiture émet 12 fois plus que le train.',
  },
  {
    a: 'paris-marseille-avion',
    b: 'paris-marseille-voiture',
    titre: 'Ciel ou autoroute ?',
    accroche: 'Paris–Marseille, aller simple : en avion, ou seul au volant de ta voiture ?',
    texte:
      "L'avion reste devant, mais de peu : 148 kg contre 110 kg. Près de la moitié de son empreinte (45 %) vient des traînées de condensation, que l'ADEME compte en plus du carburant. À quatre en covoiturage, ta part tombe à 28 kg, et à 2,2 kg en TGV.",
  },
  {
    a: 'velo-electrique-10km',
    b: 'metro-10km',
    titre: 'Deux-roues contre souterrain',
    accroche: '10 km pour aller au travail : en pédalant avec un coup de pouce électrique, ou sous terre en métro ?',
    texte:
      'Le vélo électrique émet surtout à sa fabrication (80 %), et un seul cycliste l’utilise. Le métro roule à l’électricité et partage ses rames entre des milliers de voyageurs : 44 g pour 10 km. Les deux restent très loin de la voiture (1,4 kg).',
  },
  {
    a: 'bus-10km',
    b: 'voiture-electrique-10km',
    titre: 'Bus ou voiture électrique ?',
    accroche: '10 km en bus avec les autres passagers, ou seul au volant d’une voiture électrique ?',
    texte:
      "Le bus thermique brûle du gazole : ta part pèse 1,2 kg pour 10 km, avec le remplissage moyen retenu par l'ADEME. La voiture électrique émet surtout à sa fabrication (82 %), puis roule avec peu d'émissions. Un bus électrique, lui, ne pèse que 217 g.",
  },
  {
    a: 'trottinette-10km',
    b: 'metro-10km',
    titre: 'Trottinette ou métro ?',
    accroche: '10 km en ville : en trottinette électrique, ou en métro ?',
    texte:
      "La trottinette électrique émet surtout à sa fabrication : 92 % de son empreinte, soit 229 g pour 10 km. Le métro pèse 44 g pour le même trajet, dont 95 % pour l'électricité qui le fait rouler : 5,6 fois moins.",
  },
  {
    a: 'bus-electrique-10km',
    b: 'tramway-10km',
    titre: 'Bus électrique ou tramway ?',
    accroche: 'Deux transports en commun électriques, 10 km en ville. Lequel pèse le plus ?',
    texte:
      'Tous deux roulent à l’électricité, mais le bus électrique émet 217 g pour 10 km, contre 43 g pour le tramway. Plus de la moitié de l’empreinte du bus vient de sa construction (56 %), contre 11 % pour le tramway.',
  },
  {
    a: 'ter-100km',
    b: 'tgv-100km',
    titre: 'Train contre train',
    accroche: '100 km en train : en TER ou en TGV ?',
    texte:
      "Tous les trains ne se valent pas : 2,8 kg pour 100 km en TER, contre 0,3 kg en TGV, 9,5 fois moins. Pour le TER, l'énergie qui le fait rouler pèse 2,3 kg (83 %).",
  },
  {
    a: 'autocar-100km',
    b: 'ter-100km',
    titre: 'Car ou TER ?',
    accroche: '100 km : en autocar ou en TER ?',
    texte:
      'Le TER garde l’avantage, mais de peu : 2,8 kg contre 3,8 kg pour l’autocar thermique. Les deux restent très loin de la voiture seul au volant (14,2 kg pour 100 km).',
  },

  // ─── Livraison ───
  {
    a: 'colis-magasin-voiture',
    b: 'livraison-domicile',
    titre: 'Le colis du jour',
    accroche: 'Un colis de 1 kg : on se le fait livrer, ou on va le chercher en voiture au magasin, à 15 km ?',
    texte:
      "La livraison a mauvaise réputation, mais ici, c'est ton trajet qui pèse : 30 km aller-retour en voiture, soit 89 % de l'empreinte de l'achat en magasin. Le livreur, lui, répartit sa tournée entre de nombreux colis. Et à pied ou à vélo, le magasin reprend l'avantage (545 g).",
  },
  {
    a: 'livraison-point-relais',
    b: 'livraison-domicile',
    titre: 'Le détour du point relais',
    accroche: 'Ton colis t’attend. Chez toi, ou au point relais, où tu passes le prendre en voiture ?',
    texte:
      'Le point relais évite au livreur de passer chez chacun… mais si tu y vas en voiture, tes 7 km aller-retour pèsent 1 kg, soit 60 % de l’empreinte. Livré chez toi, le même colis émet 2,3 fois moins. À pied ou à vélo, il ne reste que 656 g : un peu moins qu’à domicile.',
  },

  // ─── Objets, numérique et chauffage ───
  {
    a: 'pull-laine',
    b: 'pull-acrylique',
    titre: 'Laine ou synthétique ?',
    accroche: "Deux pulls bien chauds, portés 5 ans. L'un est naturel, l'autre synthétique.",
    texte:
      'Naturel ne veut pas dire peu émetteur : fabriquer un pull en laine émet 52,9 kg de CO2e, deux fois plus qu’un pull en acrylique (25,5 kg).',
  },
  {
    a: 'smartphone',
    b: 'chauffage-pac',
    titre: 'Smartphone contre chauffage',
    accroche:
      'Un smartphone utilisé 2 ans et demi, ou une année entière de chauffage à la pompe à chaleur pour ta part du logement ?',
    texte:
      "Presque tout se joue avant même d'allumer le téléphone : la fabrication représente 99 % de son empreinte (79 kg). Le recharger pendant 2 ans et demi ne pèse que 0,6 kg. Plus on le garde longtemps, plus sa fabrication se répartit sur de nombreuses années d'usage.",
  },
  {
    a: 'chauffage-gaz',
    b: 'chauffage-pac',
    titre: 'Bien au chaud',
    accroche: 'Même logement, même hiver, même température. Seul le chauffage change.',
    texte:
      "La pompe à chaleur ne brûle rien : elle puise la chaleur de l'air extérieur et rend plus de chaleur qu'elle ne consomme d'électricité. Résultat : une année au gaz émet autant que près de 15 années à la pompe à chaleur.",
  },
  {
    a: 'emails',
    b: 'the',
    titre: 'Une matinée de bureau',
    accroche: "Un mug de thé d'un côté, dix e-mails envoyés de l'autre.",
    texte:
      "Un e-mail pèse surtout par la fabrication des appareils (52 %) et des data-centers (38 %) qui servent à l'écrire, l'envoyer et le stocker. L'électricité pour les faire fonctionner ne compte que pour 10 %. Dix e-mails pèsent ainsi 24,6 g, plus du double d'un mug de thé.",
  },
  {
    a: 'streaming-film',
    b: 'telecharger-film',
    titre: 'En direct ou en différé ?',
    accroche: 'Ce soir, un film de 2 h : en streaming, ou téléchargé avant de le regarder ?',
    texte:
      "Regarder un film en streaming pendant 2 h émet 62 g, contre 38 g pour le télécharger (4 Go). Des deux côtés, la transmission des données fait l'essentiel. Pour regarder ensuite le film téléchargé, l'écran consommera environ 6 g d'électricité : le streaming reste devant.",
  },

  // ─── Les géants : une année d'émissions en France ───
  {
    a: 'numerique-france',
    b: 'aviation-france',
    titre: 'Les géants : écrans contre avions',
    accroche: "À l'échelle de la France, sur un an : le numérique ou l'aviation civile ?",
    texte:
      "Selon l'ADEME, le numérique émet chaque année 29,5 millions de tonnes de CO2e en France, fabrication des appareils comprise : 6,7 fois plus que l'aviation civile (4,4 millions de tonnes, vols au départ de la France).",
  },
  {
    a: 'bovins-france',
    b: 'aviation-france',
    titre: 'Les géants : vaches contre avions',
    accroche: "Sur un an en France : les émissions de tous les bovins, ou celles de l'aviation civile ?",
    texte:
      "Le parc bovin français émet chaque année 38 millions de tonnes de CO2e, 8,7 fois plus que l'aviation civile (4,4 millions de tonnes, vols au départ de la France).",
  },
  {
    a: 'voitures-france',
    b: 'numerique-france',
    titre: 'Les géants : voitures contre écrans',
    accroche: 'Sur un an en France : les voitures thermiques, ou le numérique, fabrication des appareils comprise ?',
    texte:
      'Les voitures particulières thermiques émettent en moyenne 70,7 millions de tonnes de CO2e par an en France, 2,4 fois plus que le numérique (29,5 millions de tonnes en 2022, fabrication des appareils comprise).',
  },
  {
    a: 'voitures-france',
    b: 'chauffage-france',
    titre: 'Les géants : routes contre radiateurs',
    accroche: 'Sur un an en France : les voitures thermiques, ou le chauffage des logements ?',
    texte:
      'Les voitures thermiques émettent en moyenne 70,7 millions de tonnes de CO2e par an, 1,6 fois plus que le chauffage des logements, eau chaude et cuisson comprises (43,3 millions de tonnes).',
  },
  {
    a: 'bovins-france',
    b: 'numerique-france',
    titre: 'Les géants : vaches contre écrans',
    accroche: 'Sur un an en France : tous les bovins, ou tout le numérique ?',
    texte:
      'Le parc bovin français émet 38 millions de tonnes de CO2e par an, 1,3 fois plus que le numérique, pourtant compté avec la fabrication de tous les appareils (29,5 millions de tonnes).',
  },
  {
    a: 'trains-france',
    b: 'voitures-france-jour',
    titre: 'Une journée contre une année',
    accroche: 'Tous les trains de France pendant un an, ou toutes les voitures thermiques pendant une seule journée ?',
    texte:
      'Les trains (voyageurs et marchandises) émettent 430 000 tonnes de CO2e par an. Les voitures thermiques en émettent 194 000 en une seule journée : en un peu plus de deux jours, elles dépassent une année entière de trains.',
  },
]
