-- La seule table du serveur (ADR 0005, issue 87) : pour chaque jour, combien de joueurs ont fait 0, 1… 10
-- au Duel du jour. Rien d'autre : ni identifiant, ni pseudo, ni adresse IP, ni heure, ni réponses.
--
-- Une « migration » est un fichier SQL numéroté qui fait évoluer la base d'une étape. Wrangler retient
-- lesquelles ont déjà été appliquées : `npx wrangler d1 migrations apply duel-carbone --remote` n'applique
-- que les nouvelles. On n'en modifie jamais une déjà appliquée : on en ajoute une suivante (0002_…).
CREATE TABLE effectifs (
  -- Le jour, à Paris (AAAA-MM-JJ).
  jour TEXT NOT NULL,
  -- Le score au Duel du jour, recalculé par le serveur.
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
  -- Le nombre de joueurs qui ont fait ce score ce jour-là.
  joueurs INTEGER NOT NULL CHECK (joueurs >= 0),
  -- Une seule ligne par jour et par score : au plus 11 lignes par jour.
  PRIMARY KEY (jour, score)
) WITHOUT ROWID;
