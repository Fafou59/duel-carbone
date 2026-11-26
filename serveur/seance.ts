/**
 * Le Durable Object d'une Séance du Mode animation (ADR 0007, recherche docs/recherches/durable-objects-seance.md).
 *
 * Un Durable Object est un petit serveur à mémoire, créé à la demande et désigné par un nom : ici, le code de la
 * Séance. L'Animateur et tous les Participants se branchent sur le même objet par WebSocket (une connexion qui
 * reste ouverte, où le serveur peut parler le premier), et l'objet pousse chaque étape à tous les écrans.
 *
 * - Il garde la Séance dans sa propre petite base SQLite (dans l'UE : juridiction « eu », voir seance-api.ts), car
 *   sa mémoire ne survit pas à la mise en veille : entre deux messages, Cloudflare le retire de la mémoire tout en
 *   gardant les connexions ouvertes, et ne facture alors rien (« WebSocket Hibernation »). Il relit sa base au réveil.
 * - Les règles viennent de src/domaine/seance.ts (fonctions pures) : ici, on ne fait que les appliquer, enregistrer
 *   ce qui change et prévenir les écrans.
 * - Une seule alarme par objet : programmée à la création pour la fermeture (+3 h), elle reprogramme ensuite
 *   l'effacement (+24 h), qui vide toute la base. Cloudflare nettoie alors l'objet de lui-même.
 */
import { DurableObject } from 'cloudflare:workers'
import { duelsDepuisCodes } from '../src/domaine/calendrier.ts'
import {
  ajouterParticipant,
  avancerSeance,
  creerSeance,
  estFermee,
  heureDeFermeture,
  heureDEffacement,
  repondre,
  reponsesPourLeTauxDErreur,
  retirerParticipant,
  type EtatSeance,
  type Etape,
} from '../src/domaine/seance.ts'
import { lireMessageDuClient, preparerLesVues, type MessageDuServeur, type RefusDuServeur } from '../src/domaine/seance-messages.ts'
import { CONSEILS } from '../src/donnees/conseils.ts'
import { DUELS_THEMATIQUES } from '../src/donnees/duels-thematiques.ts'
import { GESTES_CALCULES } from '../src/donnees/index.ts'
import { compterUneSalle, type BaseD1 } from './base.ts'

/** Ce que Cloudflare passe à l'objet : la base D1, pour ajouter les réponses de la salle au Taux d'erreur. */
export type EnvironnementDeLaSeance = { BASE?: BaseD1 }

/** La fiche attachée à chaque connexion (elle survit à la mise en veille) : qui parle. */
type Fiche = { role: 'animateur' } | { role: 'participant'; numero: number }

/** Ce que l'objet garde en mémoire tant qu'il est éveillé (relu dans la base au réveil). */
type Memoire = {
  code: string
  creeeLe: number
  jetonAnimateur: string
  /** Mise à vrai par l'alarme de fermeture (et vraie de toute façon 3 h après la création). */
  fermee: boolean
  etat: EtatSeance
  /** Jeton → numéro du Participant. */
  jetons: Map<string, number>
}

// Codes de fermeture des WebSockets (4000 à 4999 : réservés aux applications).
const FERMETURE_NORMALE = 1000
const FERMETURE_RETIRE = 4001
const FERMETURE_REFUS = 4003

const TABLES = `
  CREATE TABLE seance (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    code TEXT NOT NULL,
    classement INTEGER NOT NULL,
    duels TEXT NOT NULL,
    etape TEXT NOT NULL,
    cree_le INTEGER NOT NULL,
    jeton_animateur TEXT NOT NULL,
    fermee INTEGER NOT NULL DEFAULT 0,
    conseil TEXT,
    dernier_numero INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE participants (
    numero INTEGER PRIMARY KEY,
    jeton TEXT NOT NULL UNIQUE,
    pseudo TEXT,
    premier_duel INTEGER NOT NULL
  );
  CREATE TABLE reponses (
    ordre INTEGER PRIMARY KEY AUTOINCREMENT,
    numero INTEGER NOT NULL,
    duel INTEGER NOT NULL,
    geste TEXT NOT NULL,
    UNIQUE (numero, duel)
  );
`

/** 32 octets de vrai hasard en base64url (43 caractères) : le jeton de l'Animateur. */
function tirerUnJeton(): string {
  const octets = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...octets))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const CONSEILS_CONNUS = new Set(CONSEILS.map((c) => c.id))

export class Seance extends DurableObject<EnvironnementDeLaSeance> {
  private memoire: Memoire | null = null

  constructor(ctx: DurableObjectState, env: EnvironnementDeLaSeance) {
    super(ctx, env)
    // Les « ping » de maintien en vie des téléphones reçoivent « pong » sans réveiller l'objet ni rien facturer.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
  }

  // --- Appelé par le Worker (seance-api.ts) ---

  /**
   * Crée la Séance, avec des Duels déjà vérifiés par le Worker. Refusé si ce code est déjà pris : le Worker en
   * tire alors un autre. Renvoie le jeton de l'Animateur, qui seul pourra faire avancer la Séance.
   */
  async creer({ code, classement, duels }: { code: string; classement: boolean; duels: string[] }): Promise<{ jetonAnimateur: string } | { refus: 'occupe' }> {
    if (this.existe()) return { refus: 'occupe' }
    const creeeLe = Date.now()
    const jetonAnimateur = tirerUnJeton()
    const etat = creerSeance({ classement, duels: duelsDepuisCodes(duels, GESTES_CALCULES, DUELS_THEMATIQUES) })
    const sql = this.ctx.storage.sql
    sql.exec(TABLES)
    sql.exec(
      'INSERT INTO seance (id, code, classement, duels, etape, cree_le, jeton_animateur) VALUES (1, ?, ?, ?, ?, ?, ?)',
      code,
      classement ? 1 : 0,
      JSON.stringify(duels),
      JSON.stringify(etat.etape),
      creeeLe,
      jetonAnimateur,
    )
    await this.ctx.storage.setAlarm(heureDeFermeture(creeeLe))
    this.memoire = { code, creeeLe, jetonAnimateur, fermee: false, etat, jetons: new Map() }
    return { jetonAnimateur }
  }

  /** Ce que l'écran « Rejoindre » doit savoir avant de se connecter ; null si la Séance n'existe pas (ou plus). */
  async informations(): Promise<{ avecClassement: boolean; ouverte: boolean } | null> {
    const memoire = this.charger()
    if (!memoire) return null
    return { avecClassement: memoire.etat.classement, ouverte: !this.estFermee(memoire) && memoire.etat.etape.phase !== 'fin' }
  }

  /** Une connexion WebSocket d'un écran (le Worker ne transmet que celles-là). */
  async fetch(requete: Request): Promise<Response> {
    if (requete.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket attendue', { status: 426 })
    if (!this.charger()) return new Response('Séance inconnue', { status: 404 })
    const [client, serveur] = Object.values(new WebSocketPair())
    // acceptWebSocket (et non accept) : la connexion survit à la mise en veille de l'objet.
    this.ctx.acceptWebSocket(serveur)
    return new Response(null, { status: 101, webSocket: client })
  }

  // --- Les messages des écrans ---

  async webSocketMessage(ws: WebSocket, texte: string | ArrayBuffer): Promise<void> {
    const memoire = this.charger()
    if (!memoire) return this.refuser(ws, 'inconnue', true)
    const message = lireMessageDuClient(texte)
    const fiche = ws.deserializeAttachment() as Fiche | null
    if (!message) return this.refuser(ws, 'message', !fiche)

    if (message.type === 'bonjour') {
      if (message.role === 'animateur') {
        if (message.jeton !== memoire.jetonAnimateur) return this.refuser(ws, 'jeton', true)
        ws.serializeAttachment({ role: 'animateur' } satisfies Fiche)
        return this.envoyerLaVue(ws, memoire)
      }
      return this.accueillirUnParticipant(ws, memoire, message.jeton, message.pseudo)
    }

    // Toute autre commande demande de s'être présenté.
    if (!fiche) return this.refuser(ws, 'message', true)
    if (this.estFermee(memoire)) return this.refuser(ws, 'fermee')

    switch (message.type) {
      case 'repondre': {
        if (fiche.role !== 'participant') return this.refuser(ws, 'jeton')
        const apres = repondre(memoire.etat, fiche.numero, message.duel, message.idChoisi)
        if (apres === memoire.etat) return this.envoyerLaVue(ws, memoire) // trop tard, déjà répondu… on le remet à jour
        this.ctx.storage.sql.exec('INSERT INTO reponses (numero, duel, geste) VALUES (?, ?, ?)', fiche.numero, message.duel, message.idChoisi)
        memoire.etat = apres
        return this.diffuser(memoire)
      }
      case 'avancer': {
        if (fiche.role !== 'animateur') return this.refuser(ws, 'jeton')
        const conseil = message.conseil !== null && CONSEILS_CONNUS.has(message.conseil) ? message.conseil : null
        const apres = avancerSeance(memoire.etat, message.depuis, conseil)
        if (apres === memoire.etat) return this.envoyerLaVue(ws, memoire)
        this.ctx.storage.sql.exec('UPDATE seance SET etape = ?, conseil = ? WHERE id = 1', JSON.stringify(apres.etape), apres.conseil)
        memoire.etat = apres
        this.diffuser(memoire)
        // À la révélation, les réponses se ferment : celles de la salle s'ajoutent au Taux d'erreur (ADR 0006).
        if (apres.etape.phase === 'revelation') await this.compterLaSalle(memoire.etat, apres.etape)
        return
      }
      case 'retirer': {
        if (fiche.role !== 'animateur') return this.refuser(ws, 'jeton')
        const apres = retirerParticipant(memoire.etat, message.numero)
        if (apres === memoire.etat) return this.envoyerLaVue(ws, memoire)
        this.ctx.storage.sql.exec('DELETE FROM reponses WHERE numero = ?', message.numero)
        this.ctx.storage.sql.exec('DELETE FROM participants WHERE numero = ?', message.numero)
        memoire.etat = apres
        for (const [jeton, numero] of memoire.jetons) if (numero === message.numero) memoire.jetons.delete(jeton)
        for (const autre of this.ctx.getWebSockets()) {
          const sienne = autre.deserializeAttachment() as Fiche | null
          if (sienne?.role === 'participant' && sienne.numero === message.numero) {
            this.envoyer(autre, { type: 'retire' })
            autre.close(FERMETURE_RETIRE, 'Retiré par l’Animateur')
          }
        }
        return this.diffuser(memoire)
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    // Le téléphone a fermé (veille, réseau) : on ferme notre côté. Il reviendra avec son jeton.
    try {
      ws.close(code === 1005 || code === 1006 ? FERMETURE_NORMALE : code)
    } catch {
      // déjà fermée
    }
  }

  // --- L'alarme : fermeture à +3 h, puis effacement à +24 h ---

  async alarm(): Promise<void> {
    const memoire = this.charger()
    if (!memoire) return
    if (!memoire.fermee) {
      // La fermeture : chacun reçoit la Séance telle qu'elle finit, puis les connexions se ferment.
      this.ctx.storage.sql.exec('UPDATE seance SET fermee = 1 WHERE id = 1')
      memoire.fermee = true
      this.diffuser(memoire)
      this.fermerToutesLesConnexions('Séance fermée')
      await this.ctx.storage.setAlarm(heureDEffacement(memoire.creeeLe))
      return
    }
    // L'effacement : plus rien ne reste de la Séance, ni pseudos, ni jetons, ni réponses.
    this.fermerToutesLesConnexions('Séance effacée')
    await this.ctx.storage.deleteAll()
    this.memoire = null
  }

  // --- Les rouages ---

  /** La Séance existe-t-elle ? Lire sqlite_master n'écrit rien : un code inconnu ne crée pas d'objet à effacer. */
  private existe(): boolean {
    return this.ctx.storage.sql.exec("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'seance'").toArray().length > 0
  }

  /** La Séance en mémoire, relue dans la base au réveil ; null si elle n'existe pas. */
  private charger(): Memoire | null {
    if (this.memoire) return this.memoire
    if (!this.existe()) return null
    const sql = this.ctx.storage.sql
    const ligne = sql
      .exec<{
        code: string
        classement: number
        duels: string
        etape: string
        cree_le: number
        jeton_animateur: string
        fermee: number
        conseil: string | null
        dernier_numero: number
      }>('SELECT * FROM seance WHERE id = 1')
      .one()
    const participants = sql
      .exec<{ numero: number; jeton: string; pseudo: string | null; premier_duel: number }>('SELECT * FROM participants ORDER BY numero')
      .toArray()
    const reponses = sql.exec<{ numero: number; duel: number; geste: string }>('SELECT numero, duel, geste FROM reponses ORDER BY ordre').toArray()
    const etat: EtatSeance = {
      classement: ligne.classement === 1,
      duels: duelsDepuisCodes(JSON.parse(ligne.duels) as string[], GESTES_CALCULES, DUELS_THEMATIQUES),
      etape: JSON.parse(ligne.etape) as Etape,
      participants: participants.map((p) => ({ numero: p.numero, pseudo: p.pseudo, premierDuel: p.premier_duel })),
      dernierNumero: ligne.dernier_numero,
      reponses: reponses.map((r) => ({ numero: r.numero, duel: r.duel, idChoisi: r.geste })),
      conseil: ligne.conseil,
    }
    this.memoire = {
      code: ligne.code,
      creeeLe: ligne.cree_le,
      jetonAnimateur: ligne.jeton_animateur,
      fermee: ligne.fermee === 1,
      etat,
      jetons: new Map(participants.map((p) => [p.jeton, p.numero])),
    }
    return this.memoire
  }

  private estFermee(memoire: Memoire): boolean {
    return memoire.fermee || estFermee(memoire.creeeLe, Date.now())
  }

  /** Un téléphone se présente : il revient (jeton connu), ou il arrive (nouveau jeton, avec un pseudo s'il le faut). */
  private accueillirUnParticipant(ws: WebSocket, memoire: Memoire, jeton: string, pseudo: string | null): void {
    const connu = memoire.jetons.get(jeton)
    if (connu !== undefined) {
      ws.serializeAttachment({ role: 'participant', numero: connu } satisfies Fiche)
      this.envoyerLaVue(ws, memoire)
      // Revenu après la fermeture : il retrouve la fin de la Séance, puis la connexion se ferme.
      if (this.estFermee(memoire)) ws.close(FERMETURE_NORMALE, 'Séance fermée')
      return
    }
    if (this.estFermee(memoire)) return this.refuser(ws, 'fermee', true)
    const arrivee = ajouterParticipant(memoire.etat, pseudo)
    if ('refus' in arrivee) return this.refuser(ws, arrivee.refus, true)
    const { participant } = arrivee
    const sql = this.ctx.storage.sql
    sql.exec(
      'INSERT INTO participants (numero, jeton, pseudo, premier_duel) VALUES (?, ?, ?, ?)',
      participant.numero,
      jeton,
      participant.pseudo,
      participant.premierDuel,
    )
    sql.exec('UPDATE seance SET dernier_numero = ? WHERE id = 1', participant.numero)
    memoire.etat = arrivee.etat
    memoire.jetons.set(jeton, participant.numero)
    ws.serializeAttachment({ role: 'participant', numero: participant.numero } satisfies Fiche)
    this.diffuser(memoire)
  }

  /** Les réponses de la salle au Duel qui vient d'être révélé, ajoutées au Taux d'erreur de sa paire. */
  private async compterLaSalle(etat: EtatSeance, etape: Etape & { index: number }): Promise<void> {
    const salle = reponsesPourLeTauxDErreur(etat, etape.index)
    if (!salle || !this.env.BASE) return
    try {
      await compterUneSalle(this.env.BASE, salle)
    } catch (panne) {
      // Quota du jour épuisé, base injoignable : la Séance continue, ces réponses ne seront simplement pas comptées.
      console.error('Séance : le Taux d’erreur n’a pas pu être compté.', panne)
    }
  }

  private envoyer(ws: WebSocket, message: MessageDuServeur): void {
    try {
      ws.send(JSON.stringify(message))
    } catch {
      // connexion déjà fermée : l'écran se remettra à jour en se reconnectant
    }
  }

  private refuser(ws: WebSocket, raison: RefusDuServeur, fermer = false): void {
    this.envoyer(ws, { type: 'refus', raison })
    if (fermer) ws.close(FERMETURE_REFUS, raison)
  }

  /** La vue d'un seul écran. */
  private envoyerLaVue(ws: WebSocket, memoire: Memoire): void {
    this.envoyerLesVues([ws], memoire)
  }

  /** La vue de chaque écran connecté, après un changement. */
  private diffuser(memoire: Memoire): void {
    this.envoyerLesVues(this.ctx.getWebSockets(), memoire)
  }

  private envoyerLesVues(connexions: WebSocket[], memoire: Memoire): void {
    const vues = preparerLesVues(memoire.etat, { code: memoire.code, fermee: this.estFermee(memoire) })
    for (const ws of connexions) {
      const fiche = ws.deserializeAttachment() as Fiche | null
      if (!fiche) continue
      const vue = fiche.role === 'animateur' ? vues.animateur : vues.participant(fiche.numero)
      if (vue) this.envoyer(ws, { type: 'etat', vue })
    }
  }

  private fermerToutesLesConnexions(raison: string): void {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(FERMETURE_NORMALE, raison)
      } catch {
        // déjà fermée
      }
    }
  }
}
