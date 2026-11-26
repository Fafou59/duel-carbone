/**
 * Les types de l'environnement des tests du Durable Object : ce que wrangler.jsonc et vitest.objet.config.ts
 * donnent au Worker (env), et ce qu'exporte le Worker (exports, pour l'appeler comme le ferait un navigateur).
 */
import type { D1Migration } from 'cloudflare:test'
import type { Seance } from '../seance.ts'

declare global {
  namespace Cloudflare {
    interface Env {
      SEANCE: DurableObjectNamespace<Seance>
      BASE: D1Database
      MIGRATIONS: D1Migration[]
    }
    interface GlobalProps {
      mainModule: typeof import('../index.ts')
      durableNamespaces: 'Seance'
    }
  }
}
