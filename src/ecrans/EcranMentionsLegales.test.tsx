import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EcranMentionsLegales } from './EcranMentionsLegales.tsx'

describe('Page Mentions légales et vie privée', () => {
  it('a son titre, et suit l’ordre décidé : la vie privée d’abord, puis la base légale, les droits et l’éditeur', () => {
    render(<EcranMentionsLegales />)
    expect(screen.getByRole('heading', { level: 2, name: 'Mentions légales et vie privée' })).toHaveFocus()
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Ta vie privée',
      'Pendant une Séance du Mode animation',
      'Qui est responsable, et sur quelle base',
      'Tes droits, et la CNIL',
      'Éditeur et hébergeur',
      "Les données de l'ADEME",
    ])
  })

  it('dit ce qu’une Séance du Mode animation garde, combien de temps, et pourquoi sans bandeau (ADR 0007)', () => {
    render(<EcranMentionsLegales />)
    const partie = screen.getByRole('region', { name: 'Pendant une Séance du Mode animation' })
    expect(partie).toHaveTextContent(/ton téléphone tire au hasard un jeton/)
    expect(partie).toHaveTextContent(/Il ne vaut que pour cette Séance/)
    expect(partie).toHaveTextContent(/ton pseudo \(20 caractères au plus\), que l'Animateur peut retirer d'un clic/)
    expect(partie).toHaveTextContent(/Jamais ton adresse IP/)
    // Les durées sont lues dans les règles (REGLES.seance), jamais écrites à la main.
    expect(partie).toHaveTextContent(/La Séance se ferme 3 heures après sa création, et tout est effacé au bout de 24 heures/)
    expect(partie).toHaveTextContent(/dans l'Union européenne/)
    expect(partie).toHaveTextContent(/Le responsable de ces données est l'éditeur du jeu, pas l'Animateur/)
    expect(partie).toHaveTextContent(/strictement nécessaires/)
    expect(partie).toHaveTextContent(/il n'y a donc pas de bandeau à accepter/)
  })

  it('compte les Séances dans la mesure d’audience, et les nomme dans la base légale', () => {
    render(<EcranMentionsLegales />)
    expect(screen.getByText(/Pour savoir si le jeu plaît/)).toHaveTextContent(
      /les Séances du Mode animation créées, rejointes et terminées, avec leur nombre de Participants/,
    )
    const base = screen.getByRole('region', { name: 'Qui est responsable, et sur quelle base' })
    expect(base).toHaveTextContent(/Pendant une Séance du Mode animation, le serveur garde aussi ton pseudo, tes réponses et ton jeton, 24 heures au plus/)
  })

  it('nomme le responsable du traitement, et la base légale : l’intérêt légitime, sans accord à demander', () => {
    render(<EcranMentionsLegales />)
    const partie = screen.getByRole('region', { name: 'Qui est responsable, et sur quelle base' })
    expect(partie).toHaveTextContent(/Le responsable du traitement est l'éditeur du jeu, Fabien Lesage/)
    expect(partie).toHaveTextContent(/intérêt légitime \(article 6\.1\.f du RGPD\)/)
    expect(partie).toHaveTextContent(/ne dépose rien sur ton appareil, ni cookie ni autre trace : elle ne demande donc pas ton accord/)
  })

  it('dit où vont les données des prestataires : GoatCounter dans l’UE, Cloudflare encadré hors de l’UE', () => {
    render(<EcranMentionsLegales />)
    const partie = screen.getByRole('region', { name: 'Qui est responsable, et sur quelle base' })
    // Vérifié le 27/11/2026 dans les pages officielles de GoatCounter et de Cloudflare (voir EcranMentionsLegales.tsx).
    expect(partie).toHaveTextContent(/en Finlande et en Allemagne, dans l'Union européenne/)
    expect(partie).toHaveTextContent(/sans jamais l'enregistrer/)
    expect(partie).toHaveTextContent(/Data Privacy Framework/)
    expect(partie).toHaveTextContent(/clauses contractuelles types de la Commission européenne/)
  })

  it('liste les droits et permet de saisir la CNIL, en ligne ou par courrier', () => {
    render(<EcranMentionsLegales />)
    const partie = screen.getByRole('region', { name: 'Tes droits, et la CNIL' })
    expect(partie).toHaveTextContent(/accéder aux données qui te concernent, à les faire corriger ou effacer/)
    expect(within(partie).getByRole('link', { name: 'contact@duelcarbone.fr' })).toHaveAttribute('href', 'mailto:contact@duelcarbone.fr')
    expect(within(partie).getByRole('link', { name: 'adresser une plainte à la CNIL' })).toHaveAttribute(
      'href',
      'https://www.cnil.fr/fr/adresser-une-plainte',
    )
    expect(partie).toHaveTextContent(/3 place de Fontenoy, 75007 Paris/)
  })

  it('reprend les conditions de réutilisation des données de l’ADEME, et précise qu’elles valent pour la France', () => {
    render(<EcranMentionsLegales />)
    expect(screen.getByRole('link', { name: /mentions légales d'Impact CO2/i })).toHaveAttribute(
      'href',
      'https://impactco2.fr/mentions-legales',
    )
    expect(screen.getByText(/émissions d'un même Geste peuvent être différentes dans un autre pays/)).toBeInTheDocument()
  })

  it('renvoie vers En savoir plus, et garde « Retour au jeu » en bas de l’écran', () => {
    render(<EcranMentionsLegales />)
    expect(screen.getByRole('link', { name: /Pourquoi ce jeu, ses règles/ })).toHaveAttribute('href', '#en-savoir-plus')
    expect(screen.getByRole('link', { name: '← Retour au jeu' })).toHaveAttribute('href', '#')
  })

  it('a son propre sommaire, qui descend à la partie choisie sans changer l’adresse', () => {
    Element.prototype.scrollIntoView = vi.fn()
    render(<EcranMentionsLegales />)
    const sommaire = screen.getByRole('navigation', { name: 'Sommaire' })
    fireEvent.click(within(sommaire).getByRole('link', { name: 'Tes droits, et la CNIL' }))
    expect(window.location.hash).toBe('')
    expect(screen.getByRole('heading', { name: 'Tes droits, et la CNIL' })).toHaveFocus()
  })

  it('donne les mentions légales : éditeur, contact et hébergeur (loi pour la confiance dans l’économie numérique)', () => {
    render(<EcranMentionsLegales />)
    expect(screen.getByRole('heading', { name: 'Éditeur et hébergeur' })).toBeInTheDocument()
    expect(screen.getByText(/Éditeur et directeur de la publication : Fabien Lesage/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'contact@duelcarbone.fr' })[0]).toHaveAttribute('href', 'mailto:contact@duelcarbone.fr')
    const hebergeur = screen.getByText(/Hébergeur : Cloudflare, Inc\./)
    expect(hebergeur).toHaveTextContent(/101 Townsend St, San Francisco, CA 94107, États-Unis/)
    expect(hebergeur).toHaveTextContent(/\+1 650 319 8930/)
  })

  it('dit ce qui reste du Duel Carbone du jour sur l’appareil', () => {
    render(<EcranMentionsLegales />)
    expect(screen.getByText(/ta Partie du jour \(pour la reprendre ou revoir ton résultat\), ta série/)).toBeInTheDocument()
  })

  it('dit ce que l’invitation à installer garde et compte', () => {
    render(<EcranMentionsLegales />)
    expect(screen.getByText(/Sans cookie, sans compte/)).toHaveTextContent(/« Non merci » à l’invitation à installer le jeu/)
    expect(screen.getByText(/Pour savoir si le jeu plaît/)).toHaveTextContent(/l'invitation à installer le jeu et sa réponse, l'ouverture du QR code sur ordinateur,/)
  })

  it('dit que les plantages du jeu sont comptés, sans leur détail', () => {
    render(<EcranMentionsLegales />)
    expect(screen.getByText(/Pour savoir si le jeu plaît/)).toHaveTextContent(/les plantages du jeu, sans leur détail/)
  })

  it('dit ce que contient le texte partagé, et ce qu’il ne contient pas', () => {
    render(<EcranMentionsLegales />)
    expect(screen.getByText(/jamais le nom des gestes/)).toBeInTheDocument()
  })

  it('dit que le jeu garde une copie de ses fichiers pour marcher sans réseau', () => {
    render(<EcranMentionsLegales />)
    expect(screen.getByText(/marche sans réseau/)).toBeInTheDocument()
  })

  it('nomme l’hébergeur, qui reçoit les demandes du navigateur comme tout hébergeur', () => {
    render(<EcranMentionsLegales />)
    expect(screen.getByText(/Le jeu est hébergé par Cloudflare/)).toHaveTextContent(/adresse IP/)
  })

  it('dit ce que le serveur reçoit et garde (Rang du jour, Taux d’erreur), et ce qu’il ne garde pas', () => {
    render(<EcranMentionsLegales />)
    const paragraphe = screen.getByText(/Pour le Rang du jour et la part des réponses identiques à la tienne/)
    expect(paragraphe).toHaveTextContent(/le numéro du Duel et les 10 gestes que tu as choisis/)
    expect(paragraphe).toHaveTextContent(/combien de joueurs ont fait 0, 1… 10/)
    expect(paragraphe).toHaveTextContent(/pour chaque paire de gestes, combien de réponses et combien de fausses/)
    expect(paragraphe).toHaveTextContent(/Ni tes choix un par un, ni l’heure, ni ton adresse IP, ni aucun identifiant/)
    expect(paragraphe).toHaveTextContent(/dans l’Union européenne/)
    expect(paragraphe).toHaveTextContent(/La Partie libre fait de même pour la part des réponses .* sans rien pour le Rang du jour/)
  })

  it('explique la mesure d’audience : GoatCounter, sans cookie, des chiffres agrégés', () => {
    render(<EcranMentionsLegales />)
    expect(screen.getByRole('link', { name: 'GoatCounter' })).toHaveAttribute('href', 'https://www.goatcounter.com')
    const paragraphe = screen.getByText(/Pour savoir si le jeu plaît/)
    expect(paragraphe).toHaveTextContent(/sans cookie/)
    expect(paragraphe).toHaveTextContent(/chiffres agrégés/)
    expect(paragraphe).toHaveTextContent(/ni ton score ni tes réponses/)
  })
})
