/** Avant les tests du Durable Object : la base D1 locale reçoit ses tables (migrations/), comme la vraie. */
import { applyD1Migrations } from 'cloudflare:test'
import { env } from 'cloudflare:workers'

await applyD1Migrations(env.BASE, env.MIGRATIONS)
