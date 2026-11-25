# Verdict du prototype : le Taux d'erreur

> Prototype jetable · 24 et 25/11/2026 · Le code est archivé dans la branche [`prototype/taux-d-erreur`](https://github.com/Fafou59/duel-carbone/tree/prototype/taux-d-erreur) (fichier `src/PROTOTYPE-taux-d-erreur.tsx` ; les variantes A à D sont dans les commits `6756cb0` et `fe39481`). Pour le relancer : pousser cette branche ou `npm run dev` dessus, puis `?variant=E`, `F` ou `G` dans l'adresse (hors de l'adresse publique), et jouer une Partie libre : les chiffres y sont simulés.

## La question

Où et comment montrer le Taux d'erreur d'un Duel (issue 107, ADR 0006), à la révélation et dans le Récapitulatif, sans surcharger l'écran ?

## Première série (24/11) : la part de réponses fausses

Sur le vrai écran du Duel, avec des chiffres simulés :

- **A · Sous le verdict** : une ligne grise, « 72 % de réponses fausses sur ce Duel ».
- **B · Dans le badge** entre les deux cartes, sous « ×83 fois plus ».
- **C · Une jauge** rouge et verte sous la phrase.
- **D · Dans le verdict** : une phrase qui réagit à la réponse (« Pas de panique : 72 % des réponses à ce Duel sont fausses. »).

Fabien a eu du mal avec l'angle des réponses *fausses*. Il a préféré dire au joueur **combien de réponses vont dans le même sens que la sienne**, au format de D, avec la répartition de C (barre) ou un petit camembert, et sur **une seule ligne**.

## Deuxième série (25/11) : « comme toi », sur une ligne

- **E · Camembert** : « ✗ Raté ! ◕ 72 % comme toi ».
- **F · Barre** : « ✗ Raté ! ▬▬▭ 72 % comme toi ».
- **G · Une seule phrase** : « ✗ Raté, comme 72 % des réponses ◕ ».

Vérifié en largeur de téléphone (375 px) : tout tient sur une ligne, à la révélation comme dans les cases du Récapitulatif (G a dû y être réduit à « comme 72 % »).

## Le verdict

**F retenue** par Fabien : le verdict, puis une petite barre dans la couleur du verdict et « 72 % comme toi », sur la même ligne. La même chose en plus petit dans chaque case du Récapitulatif.

- Si le joueur a trouvé, c'est la part des bonnes réponses ; s'il s'est trompé, celle des réponses fausses. Le serveur et le glossaire gardent le **Taux d'erreur** (la part des réponses fausses) : seul l'affichage change.
- Pas de phrase à part pour les extrêmes : « 0 % comme toi » ou « 100 % comme toi » se lisent tels quels, la barre vide ou pleine les redit.
- Pour les lecteurs d'écran, la barre est muette et le texte est complété : « 72 % comme toi (part des réponses identiques à la tienne) ».
