/**
 * Catalogue des Duels thématiques : les pièges choisis et rédigés à la main (ticket #13), validés par Fabien.
 *
 * Pour chacun : les deux Gestes (identifiants du catalogue), le titre et l'accroche de l'annonce
 * (qui ne donnent jamais la réponse), puis le texte affiché après la réponse.
 * Règle d'écriture : uniquement des chiffres publiés par l'ADEME (Répartition de l'Instantané ou page
 * Impact CO2), aucune explication de cause qui ne serait pas dans les données.
 *
 * Les chiffres restent justes après un import ADEME (npm run import) :
 * - {a}, {b} (empreinte des deux Gestes) et {rapport} sont calculés à l'affichage : toujours à jour ;
 * - les autres chiffres, écrits à la main, sont surveillés : `cites` liste les autres Gestes dont le texte
 *   donne un chiffre, et `relu` garde l'empreinte des valeurs ADEME au moment de la dernière relecture.
 *   Si l'une change, un test nomme les Duels à relire (texte, et années dans le sous-titre des agrégats)
 *   et donne la nouvelle valeur de `relu` à écrire une fois la relecture faite.
 *
 * Leur place dans la Partie vient de leur Rapport (src/domaine/thematiques.ts) : pas de Difficulté à écrire.
 */
import type { DuelThematique } from '../domaine/thematiques.ts'

export const DUELS_THEMATIQUES: DuelThematique[] = [
  // ─── Boissons et alimentation ───
  {
    a: 'eau-bouteille',
    b: 'eau-robinet',
    relu: 'ee11066c',
    titre: 'Robinet contre bouteille',
    accroche: "Même eau, même verre… mais pas le même chemin pour arriver jusqu'à toi.",
    texte:
      "L'eau du robinet arrive par des canalisations déjà en place : 0,2 g de CO2e pour 1,5 L. En bouteille, presque tout vient de l'emballage (58 %) et du transport (36 %). Ce qu'on paie en carbone, c'est le plastique et le camion, pas l'eau.",
  },
  {
    a: 'mangue-avion',
    b: 'mangue-bateau',
    relu: '4b3feb03',
    titre: 'Le match des mangues',
    accroche: 'Même fruit, même poids… mais pas le même voyage.',
    texte:
      "Les deux mangues sont cultivées de la même façon : 60 g de CO2e chacune. Tout se joue pendant le voyage. Par avion, le transport pèse 4,6 kg, soit 98 % de l'empreinte ; par bateau, 189 g.",
  },
  {
    a: 'cafe',
    b: 'the',
    relu: 'ca435a77',
    titre: 'La pause boisson',
    accroche: 'Deux boissons chaudes du matin : laquelle pèse le plus ?',
    texte:
      "La différence se joue dès la plantation : l'agriculture pèse 109 g pour un mug de café, contre 5,6 g pour un mug de thé. Même en comptant l'eau chauffée pour le thé (2,9 g), il reste {rapport} fois moins émetteur.",
  },
  {
    a: 'crevettes',
    b: 'canard',
    relu: '6227d1c1',
    titre: 'Fruits de mer contre volaille',
    accroche: 'Une petite portion de crevettes (100 g) ou un demi-magret de canard (150 g) ?',
    texte:
      "Au kilo, les crevettes émettent 20,3 kg de CO2e, plus de deux fois le canard (8,1 kg). L'étape agricole pèse à elle seule 1,8 kg, soit 88 % de leur empreinte. Même en portion plus petite, elles l'emportent.",
  },
  {
    a: 'cabillaud',
    b: 'porc',
    relu: 'ee4b7a90',
    titre: 'Poisson ou viande ?',
    accroche: 'Un filet de cabillaud ou une côte de porc ?',
    texte:
      "On imagine souvent le poisson plus léger que la viande. Pourtant, au kilo, le cabillaud émet 12,1 kg de CO2e, presque deux fois le porc (6,7 kg). L'essentiel vient de l'étape de production (85 %), loin devant le transport (11 %).",
  },
  {
    a: 'pizza',
    b: 'repas-vegetarien',
    relu: '87b4a42e',
    cites: ['repas-poulet'],
    titre: 'Deux assiettes sans viande',
    accroche: 'Deux repas végétariens : une pizza quatre fromages, ou un repas type avec légumes, pain et dessert ?',
    texte:
      "Le repas végétarien type de l'ADEME (légumes, 120 g de protéines animales hors viande, pain et dessert) émet 0,85 kg. La pizza quatre fromages, végétarienne elle aussi, émet 1,44 kg : presque autant qu'un repas avec du poulet (1,46 kg).",
  },
  {
    a: 'mangue-avion',
    b: 'steak-boeuf',
    relu: '7a73e20e',
    cites: ['mangue-bateau'],
    titre: 'Fruit exotique contre viande rouge',
    accroche: 'Un steak de bœuf ou une mangue importée par avion ?',
    texte:
      "Le bœuf a la réputation d'être très émetteur, à juste titre : 28 kg de CO2e au kilo. Mais une mangue arrivée par avion fait plus encore : 4,66 kg pour un fruit de 400 g, dont 98 % pour le transport. Par bateau, la même mangue ne pèse que 291 g, plus de dix fois moins que le steak.",
  },
  {
    a: 'pain-au-chocolat',
    b: 'croissant',
    relu: '85c8e253',
    titre: 'Croissant ou chocolatine ?',
    accroche: 'Même pâte feuilletée, même poids : croissant ou pain au chocolat ?',
    texte:
      "À poids égal, le pain au chocolat émet {rapport} fois plus que le croissant : {a} contre {b}. La différence se joue à l'étape agricole, qui pèse 285 g pour le pain au chocolat, contre 121 g pour le croissant.",
  },
  {
    a: 'lait',
    b: 'boisson-soja',
    relu: '1de0b045',
    titre: 'Vache ou soja ?',
    accroche: 'Au petit-déjeuner : un verre de lait de vache ou un verre de boisson au soja ?',
    texte:
      "Pour le lait, l'étape agricole pèse 203 g, soit 71 % de son empreinte. Pour la boisson au soja, seulement 22 g : le reste se répartit entre la transformation, l'emballage et le transport. Au total, le verre de lait émet {rapport} fois plus.",
  },
  {
    a: 'poulet',
    b: 'nuggets-vegetaux',
    relu: '10bdb23d',
    titre: 'Nuggets végétaux contre poulet',
    accroche: 'Une portion de poulet, ou la même quantité de nuggets végétaux ?',
    texte:
      "Le poulet émet plus : {a} contre {b}. Mais l'écart n'est « que » de {rapport} : pour les nuggets végétaux, l'étape agricole ne pèse que 31 %, et la transformation, l'emballage et le transport font l'essentiel.",
  },
  {
    a: 'repas-boeuf',
    b: 'repas-poulet',
    relu: '9a770be1',
    cites: ['repas-vegetarien'],
    titre: 'Bœuf ou poulet ?',
    accroche: "Deux assiettes du midi : l'une avec du bœuf, l'autre avec du poulet.",
    texte:
      'Un repas avec du bœuf émet 4,97 kg de CO2e, un repas avec du poulet 1,46 kg : {rapport} fois moins. Un repas végétarien descend encore, à 0,85 kg.',
  },
  {
    a: 'repas-vegetarien',
    b: 'repas-vegetalien',
    relu: '9ba4a014',
    cites: ['repas-boeuf'],
    titre: 'Végétarien ou végétalien ?',
    accroche: 'Deux repas sans viande : végétarien ou végétalien ?',
    texte:
      "Sans viande, l'empreinte d'un repas chute déjà : 0,85 kg pour un repas végétarien, contre 4,97 kg avec du bœuf. Sans aucun produit animal (ni œufs, ni produits laitiers), le repas végétalien descend à 0,54 kg, soit {rapport} fois moins.",
  },

  // ─── Transports ───
  {
    a: 'paris-marseille-covoiturage',
    b: 'paris-marseille-tgv',
    relu: 'e1fdcf39',
    titre: "Covoit' ou TGV ?",
    accroche: 'À quatre dans la voiture, on partage les frais… et les émissions. Assez pour battre le train ?',
    texte:
      'Le covoiturage divise bien l’empreinte de la voiture par quatre : ta part tombe à {a}. Mais le TGV part de beaucoup plus bas, avec {b} par passager, car il roule à l’électricité. Même à quatre, la voiture émet {rapport} fois plus que le train.',
  },
  {
    a: 'paris-marseille-avion',
    b: 'paris-marseille-voiture',
    relu: 'da235a5d',
    cites: ['paris-marseille-covoiturage', 'paris-marseille-tgv'],
    titre: 'Ciel ou autoroute ?',
    accroche: 'Paris–Marseille, aller simple : en avion, ou seul au volant de ta voiture ?',
    texte:
      "L'avion reste devant, mais de peu : {a} contre {b}. Près de la moitié de son empreinte (45 %) vient des traînées de condensation, que l'ADEME compte en plus du carburant. À quatre en covoiturage, ta part tombe à 28 kg, et à 2,2 kg en TGV.",
  },
  {
    a: 'velo-electrique-10km',
    b: 'metro-10km',
    relu: '91c3f736',
    cites: ['voiture-10km'],
    titre: 'Deux-roues contre souterrain',
    accroche: '10 km pour aller au travail : en pédalant avec un coup de pouce électrique, ou sous terre en métro ?',
    texte:
      'Le vélo électrique émet surtout à sa fabrication (80 %), et un seul cycliste l’utilise. Le métro roule à l’électricité et partage ses rames entre des milliers de voyageurs : {b} pour 10 km. Les deux restent très loin de la voiture (1,4 kg).',
  },
  {
    a: 'bus-10km',
    b: 'voiture-electrique-10km',
    relu: 'cc520d27',
    cites: ['bus-electrique-10km'],
    titre: 'Bus ou voiture électrique ?',
    accroche: '10 km en bus avec les autres passagers, ou seul au volant d’une voiture électrique ?',
    texte:
      "Le bus thermique brûle du gazole : ta part pèse {a} pour 10 km, avec le remplissage moyen retenu par l'ADEME. La voiture électrique émet surtout à sa fabrication (82 %), puis roule avec peu d'émissions. Un bus électrique, lui, ne pèse que 217 g.",
  },
  {
    a: 'trottinette-10km',
    b: 'metro-10km',
    relu: '446fa400',
    titre: 'Trottinette ou métro ?',
    accroche: '10 km en ville : en trottinette électrique, ou en métro ?',
    texte:
      "La trottinette électrique émet surtout à sa fabrication : 92 % de son empreinte, soit 229 g pour 10 km. Le métro pèse {b} pour le même trajet, dont 95 % pour l'électricité qui le fait rouler : {rapport} fois moins.",
  },
  {
    a: 'bus-electrique-10km',
    b: 'tramway-10km',
    relu: '795dcd59',
    titre: 'Bus électrique ou tramway ?',
    accroche: 'Deux transports en commun électriques, 10 km en ville. Lequel pèse le plus ?',
    texte:
      'Tous deux roulent à l’électricité, mais le bus électrique émet {a} pour 10 km, contre {b} pour le tramway. Plus de la moitié de l’empreinte du bus vient de sa construction (56 %), contre 11 % pour le tramway.',
  },
  {
    a: 'ter-100km',
    b: 'tgv-100km',
    relu: '8900baab',
    titre: 'Train contre train',
    accroche: '100 km en train : en TER ou en TGV ?',
    texte:
      "Tous les trains ne se valent pas : {a} pour 100 km en TER, contre {b} en TGV, {rapport} fois moins. Pour le TER, l'énergie qui le fait rouler pèse 2,3 kg (83 %).",
  },
  {
    a: 'autocar-100km',
    b: 'ter-100km',
    relu: '4a6a61a8',
    cites: ['voiture-10km'],
    titre: 'Car ou TER ?',
    accroche: '100 km : en autocar ou en TER ?',
    texte:
      'Le TER garde l’avantage, mais de peu : {b} contre {a} pour l’autocar thermique. Les deux restent très loin de la voiture seul au volant (14,2 kg pour 100 km).',
  },

  // ─── Livraison ───
  {
    a: 'colis-magasin-voiture',
    b: 'livraison-domicile',
    relu: '53cf33af',
    cites: ['colis-magasin-velo'],
    titre: 'Le colis du jour',
    accroche: 'Un colis de 1 kg : on se le fait livrer, ou on va le chercher en voiture au magasin, à 15 km ?',
    texte:
      "La livraison a mauvaise réputation, mais ici, c'est ton trajet qui pèse : 30 km aller-retour en voiture, soit 89 % de l'empreinte de l'achat en magasin. Le livreur, lui, répartit sa tournée entre de nombreux colis. Et à pied ou à vélo, le magasin reprend l'avantage (545 g).",
  },
  {
    a: 'livraison-point-relais',
    b: 'livraison-domicile',
    relu: '8ad4ff6a',
    titre: 'Le détour du point relais',
    accroche: 'Ton colis t’attend. Chez toi, ou au point relais, où tu passes le prendre en voiture ?',
    texte:
      'Le point relais évite au livreur de passer chez chacun… mais si tu y vas en voiture, tes 7 km aller-retour pèsent 1 kg, soit 60 % de l’empreinte. Livré chez toi, le même colis émet {rapport} fois moins. À pied ou à vélo, il ne reste que 656 g : un peu moins qu’à domicile.',
  },

  // ─── Objets, numérique et chauffage ───
  {
    a: 'pull-laine',
    b: 'pull-acrylique',
    relu: '64e32eb7',
    titre: 'Laine ou synthétique ?',
    accroche: "Deux pulls bien chauds, portés 5 ans. L'un est naturel, l'autre synthétique.",
    texte:
      'Naturel ne veut pas dire peu émetteur : fabriquer un pull en laine émet 52,9 kg de CO2e, deux fois plus qu’un pull en acrylique (25,5 kg).',
  },
  {
    a: 'smartphone',
    b: 'chauffage-pac',
    relu: 'db5d85e8',
    titre: 'Smartphone contre chauffage',
    accroche:
      'Un smartphone utilisé 2 ans et demi, ou une année entière de chauffage à la pompe à chaleur pour ta part du logement ?',
    texte:
      "Presque tout se joue avant même d'allumer le téléphone : la fabrication représente 99 % de son empreinte (79 kg). Le recharger pendant 2 ans et demi ne pèse que 0,6 kg. Plus on le garde longtemps, plus sa fabrication se répartit sur de nombreuses années d'usage.",
  },
  {
    a: 'chauffage-gaz',
    b: 'chauffage-pac',
    relu: 'bec97b3c',
    titre: 'Bien au chaud',
    accroche: 'Même logement, même hiver, même température. Seul le chauffage change.',
    texte:
      "La pompe à chaleur ne brûle rien : elle puise la chaleur de l'air extérieur et rend plus de chaleur qu'elle ne consomme d'électricité. Résultat : une année au gaz émet autant que {rapport} années à la pompe à chaleur.",
  },
  {
    a: 'emails',
    b: 'the',
    relu: '3471c21c',
    titre: 'Une matinée de bureau',
    accroche: "Un mug de thé d'un côté, dix e-mails envoyés de l'autre.",
    texte:
      "Un e-mail pèse surtout par la fabrication des appareils (52 %) et des data-centers (38 %) qui servent à l'écrire, l'envoyer et le stocker. L'électricité pour les faire fonctionner ne compte que pour 10 %. Dix e-mails pèsent ainsi 24,6 g, plus du double d'un mug de thé.",
  },
  {
    a: 'streaming-film',
    b: 'telecharger-film',
    relu: 'b4bd62b6',
    titre: 'En direct ou en différé ?',
    accroche: 'Ce soir, un film de 2 h : en streaming, ou téléchargé avant de le regarder ?',
    texte:
      "Regarder un film en streaming pendant 2 h émet {a}, contre {b} pour le télécharger (4 Go). Des deux côtés, la transmission des données fait l'essentiel. Pour regarder ensuite le film téléchargé, l'écran consommera environ 6 g d'électricité : le streaming reste devant.",
  },

  // ─── Les géants : une année d'émissions en France ───
  {
    a: 'numerique-france',
    b: 'aviation-france',
    relu: '74c214f0',
    titre: 'Les géants : écrans contre avions',
    accroche: "À l'échelle de la France, sur un an : le numérique ou l'aviation civile ?",
    texte:
      "Selon l'ADEME, le numérique émet chaque année {a} en France, fabrication des appareils comprise : {rapport} fois plus que l'aviation civile ({b}, vols au départ de la France).",
  },
  {
    a: 'bovins-france',
    b: 'aviation-france',
    relu: 'a90c3d7c',
    titre: 'Les géants : vaches contre avions',
    accroche: "Sur un an en France : les émissions de tous les bovins, ou celles de l'aviation civile ?",
    texte:
      "Le parc bovin français émet chaque année {a}, {rapport} fois plus que l'aviation civile ({b}, vols au départ de la France).",
  },
  {
    a: 'voitures-france',
    b: 'numerique-france',
    relu: 'acbc5992',
    titre: 'Les géants : voitures contre écrans',
    accroche: 'Sur un an en France : les voitures thermiques, ou le numérique, fabrication des appareils comprise ?',
    texte:
      'Les voitures particulières thermiques émettent en moyenne {a} par an en France, {rapport} fois plus que le numérique ({b} en 2022, fabrication des appareils comprise).',
  },
  {
    a: 'voitures-france',
    b: 'chauffage-france',
    relu: 'c6fdda66',
    titre: 'Les géants : routes contre radiateurs',
    accroche: 'Sur un an en France : les voitures thermiques, ou le chauffage des logements ?',
    texte:
      'Les voitures thermiques émettent en moyenne {a} par an, {rapport} fois plus que le chauffage des logements, eau chaude et cuisson comprises ({b}).',
  },
  {
    a: 'bovins-france',
    b: 'numerique-france',
    relu: '9123cb95',
    titre: 'Les géants : vaches contre écrans',
    accroche: 'Sur un an en France : tous les bovins, ou tout le numérique ?',
    texte:
      'Le parc bovin français émet {a} par an, {rapport} fois plus que le numérique, pourtant compté avec la fabrication de tous les appareils ({b}).',
  },
  {
    a: 'trains-france',
    b: 'voitures-france-jour',
    relu: '646d45ba',
    titre: 'Une journée contre une année',
    accroche: 'Tous les trains de France pendant un an, ou toutes les voitures thermiques pendant une seule journée ?',
    texte:
      'Les trains (voyageurs et marchandises) émettent {a} par an. Les voitures thermiques émettent {b} en une seule journée : en {rapport} jours, elles dépassent une année entière de trains.',
  },
]
