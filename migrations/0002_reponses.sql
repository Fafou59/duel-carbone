-- Le Taux d'erreur de chaque Duel (issue 107, ADR 0006) : pour chaque paire de Gestes, combien de réponses le
-- serveur a reçues, et combien étaient fausses. Tous jours et toutes Parties confondus : ni jour, ni identifiant,
-- ni adresse IP, ni heure. On compte des réponses, pas des joueurs.
--
-- Cette migration ajoute une table sans toucher à la première : l'ancien code, qui tourne encore quelques secondes
-- après son application, n'en souffre pas (règle « ajouter sans casser », wrangler.jsonc).
CREATE TABLE reponses (
  -- Les deux Gestes, dans l'ordre alphabétique et séparés par « | » : jean contre pull = pull contre jean.
  paire TEXT NOT NULL PRIMARY KEY,
  -- Le nombre de réponses reçues pour cette paire.
  reponses INTEGER NOT NULL CHECK (reponses >= 1),
  -- Combien étaient fausses (jamais plus que de réponses).
  fausses INTEGER NOT NULL CHECK (fausses >= 0 AND fausses <= reponses)
) WITHOUT ROWID;
