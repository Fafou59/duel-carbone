/**
 * npm run qr-code : fabrique le QR code de l'adresse du jeu (public/qr-code.svg), affiché sur ordinateur à la fin
 * du Duel du jour sous « joue sur ton téléphone » (#98).
 *
 * L'adresse ne change pas : le dessin est fabriqué une fois pour toutes ici, et versionné. La bibliothèque qrcode
 * ne sert qu'à ce script (dépendance de développement) : rien n'est ajouté au code que télécharge le joueur.
 * À relancer seulement si l'adresse du jeu change.
 *
 * Réglages :
 * - noir sur blanc, même en thème sombre : c'est le contraste que tous les lecteurs de QR code savent lire ;
 * - une marge blanche de 4 carrés tout autour (la « zone calme » prévue par la norme), qui sépare le code du
 *   fond sombre de la fenêtre ;
 * - correction d'erreurs « M » : le code se lit encore si 15 % de ses carrés sont abîmés (reflet, écran sale).
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import { ADRESSE_DU_JEU } from '../src/domaine/partage.ts'

/**
 * L'adresse porte une provenance, « ?ref=qr-code » : GoatCounter la lit comme un site d'origine et range ces
 * arrivées sous « qr-code » dans ses provenances (Referrers). La page comptée reste « / », grâce au lien canonique
 * d'index.html. Une seule étiquette pour tout le monde : elle dit d'où l'on vient, jamais qui l'on est. Le jeu
 * l'efface de la barre d'adresse une fois la visite comptée (src/navigateur/mesure.ts, effacerProvenance).
 */
const ADRESSE_DU_QR_CODE = `${ADRESSE_DU_JEU}/?ref=qr-code`

const svg = await QRCode.toString(ADRESSE_DU_QR_CODE, {
  type: 'svg',
  errorCorrectionLevel: 'M',
  margin: 4,
  color: { dark: '#000000', light: '#ffffff' },
})

writeFileSync(fileURLToPath(new URL('../public/qr-code.svg', import.meta.url)), `${svg.trim()}\n`, 'utf8')
console.log(`QR code de ${ADRESSE_DU_QR_CODE} enregistré dans public/qr-code.svg`)
