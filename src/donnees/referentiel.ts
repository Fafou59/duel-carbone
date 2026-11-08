/**
 * Ce que l'on sait du Référentiel Impact CO2 de l'ADEME et que son API ne fournit pas :
 * les Thématiques à importer, leur unité de référence et les libellés des étapes de la Répartition.
 * Voir docs/adr/0002-instantane-par-script-d-import.md.
 */

/** Une Thématique de l'ADEME, avec l'unité de référence de ses Équivalents. */
export type Thematique = {
  id: number
  slug: string
  nom: string
  /** Unité de référence par défaut des Équivalents de la Thématique (ex. « kg »). */
  unite: string
}

/** Une étape du cycle de vie dans la Répartition d'un Équivalent. */
export type Etape = {
  id: number
  libelle: string
  /** Empreinte carbone de l'étape, en kg CO2e pour une unité de référence. */
  valeur: number
}

/** Une entrée du Référentiel, figée dans l'Instantané. */
export type Equivalent = {
  slug: string
  nom: string
  thematique: string
  /** Unité de référence de la valeur ; null quand elle reste à vérifier. */
  unite: string | null
  /** Empreinte carbone totale (cycle de vie complet), en kg CO2e pour une unité de référence. */
  valeur: number
  /** Étapes de fabrication, de transport, etc. Vide quand l'ADEME ne publie pas le détail. */
  etapes: Etape[]
  /** Usage inclus dans la valeur, pour les objets utilisés plusieurs années. */
  usage?: { parAn: number; dureeAns: number; total: number }
  /** Fin de vie incluse dans la valeur ; négative quand le recyclage évite des émissions. */
  finDeVie?: number
  /** Page de détail de l'Équivalent sur Impact CO2. */
  url: string
}

/** Copie datée du Référentiel, seule source de données lue par le jeu. */
export type Instantane = {
  source: string
  api: string
  /** Date de l'import, au format AAAA-MM-JJ. */
  dateImport: string
  equivalents: Equivalent[]
}

export const API_IMPACT_CO2 = 'https://impactco2.fr/api/v1'

/**
 * Thématiques importées. La Livraison (id 12) n'est pas listée par /thematiques
 * mais l'API la sert bien : on l'importe aussi.
 */
export const THEMATIQUES: Thematique[] = [
  { id: 1, slug: 'numerique', nom: 'Numérique', unite: 'unité' },
  { id: 2, slug: 'alimentation', nom: 'Alimentation', unite: 'kg' },
  { id: 3, slug: 'boisson', nom: 'Boisson', unite: 'litre' },
  { id: 4, slug: 'transport', nom: 'Transport', unite: 'km parcouru par passager' },
  { id: 5, slug: 'habillement', nom: 'Habillement', unite: 'unité' },
  { id: 6, slug: 'electromenager', nom: 'Électroménager', unite: 'unité' },
  { id: 7, slug: 'mobilier', nom: 'Mobilier', unite: 'unité' },
  { id: 8, slug: 'chauffage', nom: 'Chauffage', unite: 'm² chauffé pendant 1 an' },
  { id: 9, slug: 'fruitsetlegumes', nom: 'Fruits et légumes', unite: 'kg' },
  { id: 10, slug: 'usagenumerique', nom: 'Usage numérique', unite: 'unité' },
  { id: 12, slug: 'livraison', nom: 'Livraison', unite: 'colis' },
  { id: 13, slug: 'caspratiques', nom: 'Cas pratiques', unite: 'unité' },
]

/**
 * Équivalents dont l'unité diffère de celle de leur Thématique,
 * relevés dans le code source d'Impact CO2 (src/data/categories/*.ts).
 */
export const UNITES_PARTICULIERES: Record<string, string> = {
  repasavecduboeuf: 'repas',
  repasvegetarien: 'repas',
  repasvegetalien: 'repas',
  repasavecdupoissonblanc: 'repas',
  repasavecdupoissongras: 'repas',
  repasavecdupoulet: 'repas',
  repasavecduporc: 'repas',
  repasavecduveau: 'repas',
  repasavecdulieunoir: 'repas',
  repasavecduthon: 'repas',
  francais: 'an',
  '2050': 'an',
  'game-of-thrones': 'épisode',
  friends: 'intégrale',
  email: 'email',
  spam: 'email',
  rechercheweb: 'recherche',
  stockagedonnee: 'Go stocké pendant 1 an',
  telechargement: 'Go téléchargé',
}

/** Équivalents dont l'unité n'est pas documentée clairement par l'ADEME : à vérifier avant usage. */
export const UNITES_A_VERIFIER = new Set(['streamingvideo', 'visioconference'])

/** Libellés des étapes de la Répartition, repris de l'ADEME (src/data/ecv.ts d'Impact CO2). */
export const ETAPES: Record<number, string> = {
  1: 'Matières premières',
  2: 'Approvisionnement',
  3: 'Mise en forme',
  4: 'Assemblage et distribution',
  5: 'Construction',
  6: 'Carburant',
  7: 'Traînées de condensation',
  8: 'Usage',
  9: 'Fin de vie',
  13: 'Construction des terminaux',
  14: 'Usage des terminaux',
  15: 'Transmission',
  16: 'Construction des data-centers',
  17: 'Usage des data-centers',
  18: 'Construction des réseaux',
  30: 'Agriculture',
  31: 'Transformation',
  32: 'Emballage',
  33: 'Transport',
  34: 'Supermarché et distribution',
  35: 'Consommation',
  40: 'Construction des terminaux',
  41: 'Usage des terminaux',
  42: 'Transmission',
  43: 'Data-centers',
  50: "Consommation d'énergie",
  51: "Services d'entretien",
  52: 'Déplacement du personnel',
  53: 'Construction des infrastructures',
  54: 'Commande et préparation',
  55: 'Stockage et transit',
  56: 'Déplacement de 7 km aller-retour',
  57: 'Déplacement de 30 km aller-retour',
  58: 'Fabrication',
}
