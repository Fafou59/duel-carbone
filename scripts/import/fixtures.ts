/**
 * Extraits de réponses réelles de l'API Impact CO2 (GET /thematiques/ecv/{id}?detail=1&language=fr),
 * enregistrées le 2026-11-08. Les tests s'appuient dessus pour ne pas dépendre du réseau.
 */
import type { ReponseEcv } from './transformer.ts'

export const NUMERIQUE: ReponseEcv[] = [
  {
    name: 'Télévision ',
    slug: 'television',
    ecv: 369.71185999999994,
    footprint: 328.26,
    footprintDetail: [
      { id: 4, value: 3.26 },
      { id: 5, value: 325 },
    ],
    usage: { peryear: 3.6939825, defaultyears: 8 },
    endOfLife: 11.9,
  },
  {
    name: 'Smartphone',
    slug: 'smartphone',
    ecv: 80.15534312499999,
    footprint: 79.27,
    footprintDetail: [
      { id: 4, value: 2.27 },
      { id: 5, value: 77 },
    ],
    usage: { peryear: 0.25573725, defaultyears: 2.5 },
    endOfLife: 0.246,
  },
]

export const ALIMENTATION: ReponseEcv[] = [
  {
    name: 'Boeuf',
    slug: 'boeuf',
    ecv: 28.009169999999997,
    footprint: 28.009169999999997,
    footprintDetail: [
      { id: 30, value: 27.316666666666666 },
      { id: 31, value: 0.08891666666666666 },
      { id: 32, value: 0.217 },
      { id: 33, value: 0.3083333333333333 },
      { id: 34, value: 0.04396666666666666 },
      { id: 35, value: 0.03428666666666667 },
    ],
  },
  { name: 'Repas avec du boeuf', slug: 'repasavecduboeuf', ecv: 4.97, footprint: 4.97 },
]

export const ELECTROMENAGER: ReponseEcv[] = [
  {
    name: 'Lave-linge',
    slug: 'lavelinge',
    ecv: 513.42,
    footprint: 341.1,
    footprintDetail: [
      { id: 1, value: 191 },
      { id: 2, value: 12.2 },
      { id: 3, value: 47.6 },
      { id: 4, value: 90.3 },
    ],
    usage: { peryear: 18.08, defaultyears: 12 },
    endOfLife: -44.64,
  },
]

export const TRANSPORT: ReponseEcv[] = [
  {
    name: 'TGV',
    slug: 'tgv',
    ecv: 0.00293,
    footprint: 0.00293,
    footprintDetail: [
      { id: 5, value: 0.00062 },
      { id: 6, value: 0.00231 },
    ],
  },
]

export const CAS_PRATIQUES: ReponseEcv[] = [
  { name: 'A/R Paris - New-York en avion', slug: 'avion-pny', ecv: 2060, footprint: 2060 },
]

export const USAGE_NUMERIQUE: ReponseEcv[] = [
  { name: 'Streaming vidéo', slug: 'streamingvideo', ecv: 0.06401675291000002, footprint: 0.06401675291000002 },
]
