import { empreinteDeLaCreation } from '../domaine/empreinte-ia.ts'
import type { GesteCalcule } from '../domaine/geste.ts'
import { METHODE_EMPREINTE_IA } from '../liens.ts'
import { HYPOTHESES, JETONS } from './empreinte-ia.ts'

const kgCo2e = empreinteDeLaCreation(JETONS, HYPOTHESES.centrale).kgCo2e

/**
 * L'Easter Egg (#63) : la création de ce jeu avec une IA, devenue un Geste.
 *
 * Le seul Geste qui ne vient pas de l'ADEME (ADR 0004) : sa valeur est l'hypothèse centrale de notre estimation
 * (docs/empreinte-ia.md), recalculée depuis src/donnees/empreinte-ia.ts à chaque nouveau décompte. Il n'a pas de
 * Répartition, sa « fiche » est la méthode de l'estimation, et il n'est jamais tiré au hasard : on ne le croise
 * que dans ses deux Duels thématiques (src/donnees/duels-thematiques.ts).
 */
export const GESTE_CREATION_IA: GesteCalcule = {
  id: 'creer-duel-carbone',
  titre: 'Créer Duel Carbone',
  sousTitre: 'assisté par IA',
  quantite: 1,
  justification: "L'estimation de l'empreinte de la création du jeu avec une IA (hypothèse centrale), hors ADEME.",
  nature: 'usage',
  seulementEnDuelThematique: true,
  horsAdeme: true,
  equivalent: {
    slug: 'estimation-creation-ia',
    nom: 'Création de Duel Carbone avec une IA (estimation hors ADEME)',
    unite: null,
    valeur: kgCo2e,
    url: METHODE_EMPREINTE_IA,
  },
  empreinte: kgCo2e,
  etapes: [],
}
