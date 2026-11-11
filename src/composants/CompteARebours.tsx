import { useEffect, useState } from 'react'
import { formaterDuree, secondesAvantMinuitAParis } from '../domaine/jour.ts'

/** Le temps qui reste avant minuit à Paris (l'arrivée du prochain Duel du jour), mis à jour chaque seconde. */
export function CompteARebours() {
  const [secondes, setSecondes] = useState(() => secondesAvantMinuitAParis(new Date()))
  useEffect(() => {
    const minuterie = setInterval(() => setSecondes(secondesAvantMinuitAParis(new Date())), 1000)
    return () => clearInterval(minuterie)
  }, [])
  return <>{formaterDuree(secondes)}</>
}
