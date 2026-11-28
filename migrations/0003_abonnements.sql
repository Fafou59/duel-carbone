-- Les abonnements au Rappel du matin (ADR 0008, issue 69) : la liste des appareils qui ont demandé le Rappel,
-- et pour chacun le jour de la dernière ouverture du jeu. Rien d'autre : aucun lien avec les Parties (ni score,
-- ni Série, ni « a joué aujourd'hui »), ni adresse IP, ni appareil, ni heure.
--
-- Un abonnement push est une donnée personnelle (CNIL) : la première que le jeu confie au serveur, et seulement
-- sur demande du joueur. Elle est effacée quand il arrête le Rappel, quand le service push la déclare invalide
-- (réponse 404 ou 410), ou après 90 jours sans ouvrir le jeu (serveur/rappel.ts).
--
-- Cette migration ajoute une table sans toucher aux autres (règle « ajouter sans casser », wrangler.jsonc).
CREATE TABLE abonnements (
  -- L'adresse d'envoi que le service push (Apple, Google, Mozilla, Microsoft) a donnée au navigateur.
  -- Elle désigne un navigateur sur un appareil, pas une personne : le serveur n'en sait pas plus.
  adresse TEXT NOT NULL PRIMARY KEY,
  -- La clé publique du navigateur (« p256dh ») et son secret (« auth ») : de quoi chiffrer le Rappel pour que
  -- seul cet appareil puisse le lire (le service push le transporte sans pouvoir l'ouvrir).
  cle TEXT NOT NULL,
  secret TEXT NOT NULL,
  -- Le jour (à Paris, AAAA-MM-JJ) où le jeu a été ouvert pour la dernière fois sur cet appareil. Le jour
  -- seulement, pas l'heure : il ne sert qu'à effacer l'abonnement après 90 jours sans visite.
  derniere_ouverture TEXT NOT NULL
);

-- L'effacement des abonnements oubliés lit cette colonne chaque matin : un index lui évite de tout parcourir.
CREATE INDEX abonnements_par_derniere_ouverture ON abonnements (derniere_ouverture);
