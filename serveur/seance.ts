/**
 * SONDE TEMPORAIRE (lot 1, étape 1) : un Durable Object minimal, pour vérifier sur un aperçu qu'un objet SQLite
 * se crée bien dans la juridiction « eu » sur le plan gratuit. Remplacé par le vrai objet de la Séance ensuite.
 */
import { DurableObject } from 'cloudflare:workers'

export class Seance extends DurableObject {
  async fetch(): Promise<Response> {
    const sql = this.ctx.storage.sql
    sql.exec('CREATE TABLE IF NOT EXISTS visites (n INTEGER)')
    sql.exec('INSERT INTO visites (n) VALUES (1)')
    const visites = sql.exec<{ total: number }>('SELECT COUNT(*) AS total FROM visites').one().total
    return Response.json({ visites, jurisdiction: this.ctx.id.jurisdiction ?? null })
  }
}
