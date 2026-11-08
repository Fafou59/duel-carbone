// Harnais de test : joue le rôle de la Partie autour d'un écran Duel isolé (garde le choix, permet de rejouer).
import { useState } from 'react'
import type { Duel } from '../domaine/duel.ts'
import { EcranDuel } from '../ecrans/EcranDuel.tsx'

export function DuelDeTest({ duel }: { duel: Duel }) {
  const [choix, setChoix] = useState<string | null>(null)
  return (
    <EcranDuel
      duel={duel}
      choix={choix}
      onChoisir={setChoix}
      suite={
        <button type="button" onClick={() => setChoix(null)}>
          Rejouer ce Duel
        </button>
      }
    />
  )
}
