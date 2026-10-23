# Spec technique

> Référence du fonctionnement actuel. Dernière mise à jour : 2026-10-22 (branche `chore/seo`).
> Périmètre : V1 = ce qu'il faut pour lancer, le reste est marqué « V2 » (voir `TODO.md`).
> Spec fonctionnelle associée : [booking-system.md](./booking-system.md).

## Vue d'ensemble

```
                         Internet
                            │
                     ┌──────▼──────┐
                     │ Cloudflare  │  DNS proxifié, WAF, DDoS, une règle de limite de débit
                     └──────┬──────┘
                            │ ports 80/443 ouverts aux seules IP Cloudflare
                     ┌──────▼──────┐
                     │    Caddy    │  HTTPS automatique, seul service exposé (80/443)
                     └──────┬──────┘
                            │ réseau Docker
                     ┌──────▼──────┐
                     │ Nuxt (Nitro)│  front + API serveur
                     └─────────────┘

   Services externes : Cloudflare · Supabase (UE) · Stripe · Resend · Géoplateforme IGN · geoportail.lu
```

V2 : OSRM et VROOM (tournées), supervision, SMS Brevo (voir « V2 » en fin de document).

## Stack

| Couche                          | Choix                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| Front et API                    | Nuxt 4 (SSR, preset Nitro `node-server`), Tailwind CSS v4, shadcn-nuxt, i18n FR/EN |
| Gestionnaire de paquets         | Bun                                                                                |
| Base de données, auth, fichiers | Supabase hébergé, région UE (Postgres, Auth par lien magique, Storage, `pg_cron`)  |
| Paiement                        | Stripe Checkout + webhook                                                          |
| Mail                            | Resend, expéditeur `NUXT_MAIL_FROM` (repli : `BINOVYA <contact@dg-zenith.com>`)    |
| Hébergement                     | VPS européen, Docker Compose (Caddy + Nuxt)                                        |

## Géocodage

| Pays       | Service                                                                                     | Limite                                                   |
| ---------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| France     | Géoplateforme IGN (Base Adresse Nationale), `data.geopf.fr/geocodage/search`, biais Uckange | 50 requêtes par seconde et par IP (data.gouv.fr)         |
| Luxembourg | geoportail.lu, `apiv4.geoportail.lu/fulltextsearch`, couche `Adresse`, sud du pays          | Aucune limite publiée (demander à support@geoportail.lu) |

- Le client choisit le pays à côté du champ adresse. Un seul endpoint serveur
  (`/api/address/search?q=…&country=FR|LU`) interroge le service de ce pays. Le front ne
  connaît pas les fournisseurs.
- Zone desservie : 20 km à vol d'oiseau autour du dépôt d'Uckange. Seule une petite partie du
  Luxembourg est couverte (Rumelange, sud de Dudelange). Le secteur du jour se calcule en SQL dans
  `get_availability`, à vol d'oiseau.
- Le téléphone a un sélecteur de pays (+33, +352) : le client saisit son numéro national, le
  serveur reçoit et enregistre le format international (`+33612345678`). Codes postaux : 5
  chiffres FR, 4 chiffres LU.

### Jeton d'adresse

- Les coordonnées viennent du navigateur : sans signature, un client pourrait les falsifier pour
  contourner le rayon de 20 km et le secteur du jour. `/api/address/search` renvoie donc un
  `token` par suggestion (`server/utils/addressToken.ts`) ; les suggestions qui ne passent pas le
  schéma d'adresse sont écartées.
- Format `<expiresAt>.<mac>` : expiration en secondes Unix (24 h), puis HMAC-SHA256 en base64url de
  libellé, ville, code postal, pays, latitude, longitude et expiration, avec le contexte
  `binovya-address-v1`. Comparaison par `timingSafeEqual`.
- `requireSignedAddress` est appelé par `POST /api/booking`, `POST /api/quote` et
  `POST /api/booking/availability` : jeton absent, modifié ou expiré donne 400 `invalidAddress`.
- Disponibilités : `POST /api/booking/availability` (corps JSON, adresse signée, 4 Ko). Un GET
  aurait mis les coordonnées dans l'URL et les journaux ; l'ancienne route répond 404.
- Risque accepté (RGPD, décision du 2026-10-16) : `get_availability` compare l'adresse à la
  position exacte de la première réservation du jour, et la réponse `available` ou `outOfSector`
  sert d'oracle de distance (quelques dizaines de requêtes par cible, jeton signé requis). Atténué
  par la règle de limite de débit Cloudflare.

### Recherche de commune

- `kind=municipality` (défaut `address`) sert au secteur imposé d'un jour (espace Pro). France :
  IGN avec `type=municipality`, libellé `<nom> (<code postal>)`. Luxembourg : aucun appel externe,
  recherche dans la liste locale `LUXEMBOURG_COMMUNES` (`server/utils/luxembourgCommunes.ts`, 27
  communes à moins de 35 km du dépôt), sans accent ni casse, libellé `<nom> (LU)`, code postal vide.
- Le jeton a le contexte `binovya-municipality-v1` : `requireSignedMunicipality` refuse un jeton
  d'adresse et `requireSignedAddress` refuse un jeton de commune. Un code postal vide n'est
  accepté que pour le Luxembourg (`municipalityDetailsSchema`, `signedMunicipalitySchema`).

### Cache des recherches

- `server/utils/memoryCache.ts` : cache en mémoire par instance, borné, LRU (une lecture remet
  l'entrée en tête, la moins récemment lue sort la première). Il sert aussi au reçu Stripe (voir
  « Espace client »).
- `server/utils/addressSearch.ts` : clé = type (`address` ou `municipality`) + pays + requête
  normalisée (espaces retirés aux bords et réduits, minuscules). La requête normalisée est celle
  envoyée au fournisseur. Durée `ADDRESS_SEARCH_CACHE_TTL_MS` (5 min), au plus
  `ADDRESS_SEARCH_CACHE_MAX_ENTRIES` (500) entrées. Seuls les succès sont gardés. Les tableaux sont
  copiés à l'écriture et à la lecture, pour qu'un appelant ne modifie pas le cache. Les jetons sont
  signés à chaque réponse, après le cache.
- Le cache absorbe seulement les requêtes répétées. La vraie protection est la règle de limite de
  débit Cloudflare (voir « Hébergement »).

## Demandes de devis

- Page `/quote`, point d'entrée unique de tout devis (particuliers, entreprises, collectivités),
  préremplie avec la réservation en cours. Les combinaisons sans tarif (3 bacs ou plus, 1 petit +
  1 grand) y mènent depuis le parcours. Le bandeau `QuoteCtaSection.vue` (accueil) mène à `/quote`
  et `/contact`.
- Équipements : un ou plusieurs parmi bacs, PAV, mobilier urbain, signalétique (enum
  `quote_equipment`, colonne `quote_requests.equipment`), au moins un. Les nombres de bacs ne sont
  demandés que si « bacs » est coché, et valent 0 sinon : règle tenue par la contrainte
  `quote_requests_bins_required` et par `hasConsistentBins` (Zod, `app/utils/quoteValidation.ts`),
  pour qu'un appel direct à l'API ne puisse pas enregistrer un état incohérent. La société est
  facultative, bornée par `COMPANY_MAX_LENGTH`.
- `POST /api/quote` reçoit un multipart : un champ `payload` (JSON validé par Zod) et jusqu'à 3
  photos de 5 Mo.
- `assertBodySize` (`server/utils/requestBody.ts`, partagé avec `/api/contact`) plafonne la taille
  avant lecture : 3 × 5 Mo plus 64 Ko de multipart. Sans `Content-Length` ou en transfert
  fragmenté : 411 (la taille n'est pas annoncée, le plafond serait contournable). Au-delà : 413.
- Photos contrôlées sur leur signature réelle (JPEG, PNG, WebP), jamais sur le type déclaré, puis
  stockées dans le bucket privé `quote-photos`, un dossier par demande.
- La demande est enregistrée dans `quote_requests`, puis un mail part à BINOVYA via Resend avec des
  liens signés de 7 jours (`PHOTO_LINK_LIFETIME_DAYS`, repris dans le texte du mail). Un échec
  d'envoi est journalisé sans bloquer le client : la demande est déjà en base.
- Anti-spam : champ piège `website` (`HONEYPOT_MAX_LENGTH`), taille plafonnée, règle Cloudflare.
- Accès : seul l'admin lit `quote_requests` (RLS).

### Validation et formulaires

- Réservation, devis et contact partagent `contactSchema` (`app/utils/bookingValidation.ts`) :
  prénom et nom de 2 à 80 caractères, e-mail de 254 au plus, téléphone FR/LU. `honeypotSchema`
  borne le champ piège. `localeSchema` : `fr` ou `en` (défaut `fr`), pour la langue des pages liées
  dans les mails.
- Après un envoi refusé, le focus va au premier champ invalide dans l'ordre du DOM
  (`app/utils/focus.ts`). Les erreurs sont liées au champ par `aria-describedby` (construit par
  `describedByIds`, `app/utils/field.ts`) et `aria-invalid`.
- `FormSent.vue` (écran de succès commun au devis et au contact), `HoneypotField.vue` (libellé
  traduit).
- Contrastes : `--primary` à `#0975ab` (texte blanc 5,07:1), bordures de formulaire `ink/50`,
  anneaux de focus pleins, formule choisie marquée d'une coche (pas par la couleur seule).

### Classes partagées

- `app/constants/feedback.ts` : `ERROR_TEXT_TONE_CLASS` (`text-red-700`), `ERROR_MESSAGE_CLASS`,
  `INLINE_FEEDBACK_CLASS` (message en ligne, neutre) et `INLINE_ERROR_CLASS` (le même en rouge).
  Pourquoi `red-700` : `--destructive` donne 4,49:1 sur `paper`, sous le seuil AA (4,5:1). Les
  bordures de champ invalide et les icônes d'échec sont aussi en `red-700`. Les boutons
  destructifs et le panneau urgent du planning restent sur `destructive` (fond plein, texte clair).
- `app/constants/form.ts` : classes de champ (`FIELD_INPUT_CLASS`, `FIELD_TEXTAREA_CLASS`,
  `INPUT_GROUP_FRAME_CLASS`), `SELECT_ITEM_CLASS`, `FLOATING_PANEL_CLASS`, `FIELD_HINT_CLASS`,
  `FIELD_ERROR_CLASS`.
- `app/constants/calendar.ts` : `CALENDAR_GRID_DAY_COUNT` (42) et classes du calendrier (cellules,
  boutons de navigation, points), partagées par `DatePicker` et `BookingCalendar`.
- Ne pas recréer ces classes dans un composant : les importer.

## Formulaire de contact

- Page `/contact` (`ContactForm.vue`, `useContactForm.ts`), pour les questions et rendez-vous (les
  devis passent par `/quote`). Champs : prénom, nom, société (facultative), e-mail, téléphone,
  objet (`meeting`, `info`, `other`), message de `CONTACT_MESSAGE_MIN_LENGTH` (10) à
  `CONTACT_MESSAGE_MAX_LENGTH` (2000), champ piège `website`.
- `POST /api/contact` valide avec `contactRequestSchema` (`app/utils/contactValidation.ts`), le même
  schéma que le formulaire. Corps plafonné à 16 Ko par `assertBodySize`. Entrée invalide : 400.
- Champ piège rempli : réponse de succès sans envoi, pour ne pas révéler le piège.
- Le mail part à `NUXT_CONTACT_EMAIL_TO` par `sendTransactionalEmail`, avec `replyTo` sur l'e-mail
  du client. Rien n'est stocké en base : le mail est la demande.
- Erreurs : 503 si le transport de mail n'est pas prêt (`isMailConfigured()`) ou si
  `NUXT_CONTACT_EMAIL_TO` manque ; 502 si l'envoi échoue (Resend en erreur ou sans réponse après
  5 s). Le client voit un échec plutôt qu'un faux succès.
- Le bouton d'envoi utilise `AppButton` (variante `ghost` pour la croix de fermeture, voir
  « Composants communs »).

## Mails

- Tout envoi passe par `sendTransactionalEmail` (`server/utils/mail.ts`) : abandon après 5 s,
  jamais d'erreur levée (renvoie `true` ou `false`), journal limité au libellé de l'envoi (jamais
  d'adresse ni de nom). Un mail lent ou en échec ne bloque donc ni le webhook Stripe ni la réponse
  au client.
- Expéditeur unique `mailSender()` : `NUXT_MAIL_FROM`, repli sur `BINOVYA <contact@dg-zenith.com>`
  tant que `binovya.com` n'est pas vérifié sur Resend. Mails en français uniquement.
- `sanitizeEmailSubject` retire les caractères de contrôle des sujets (pas d'injection d'en-tête) ;
  `escapeHtml` échappe le corps, accolades comprises.
- Gabarits dans `app/templates/email/` : `layout`, `labels`, `bookingDetails`,
  `bookingCustomerEmails` (confirmation, rappel, remboursement, changement de date),
  `bookingAdminEmail`, `photosAvailableEmail`, `accountEmails`, `contactEmail`, `quoteEmail`.
  Logique d'envoi dans `server/utils/bookingEmails.ts` et `server/utils/accountEmails.ts`.

| Mail                             | Déclencheur                                            |
| -------------------------------- | ------------------------------------------------------ |
| Confirmation au client           | Webhook, `confirm_booking_payment` renvoie `paid`      |
| Lien de connexion                | `POST /api/auth/login`, adresse connue et sous plafond |
| Lien de connexion admin          | `POST /api/pro/auth/login`, admin connu, sous plafond  |
| Alerte de suppression (admin)    | `POST /api/account/deletion-request`                   |
| Alerte admin (réservation payée) | Idem confirmation, à `NUXT_CONTACT_EMAIL_TO`           |
| Annulation et remboursement      | Webhook, `refund_required` ou `not_payable`            |
| Rappel                           | Tâche `booking:reminders` (voir « Tâches planifiées ») |
| Changement de date               | `POST /api/pro/bookings/[id]/reschedule`, après succès |
| Photos disponibles               | `POST /api/pro/bookings/[id]/complete`, avec 2 photos  |

- Pas de mail de remboursement si la charge était déjà remboursée (`charge_already_refunded`).
- Clés d'idempotence Resend (gardées 24 h) : `booking-confirmation-<id>`,
  `booking-admin-alert-<id>`, `booking-refund-<id>`, `booking-reminder-<date>-<id>` (la date
  annoncée : une réservation déplacée reçoit un nouveau rappel), `booking-reschedule-<uuid>-<id>`
  (uuid neuf par déplacement), `booking-photos-<id>`, `account-deletion-<id>-<heure de la
demande>`. Le lien de connexion n'en a pas : chaque lien est unique.
- `emailSitePageUrl` (`server/utils/bookingEmails.ts`) construit les liens vers `/booking` (mail de
  remboursement) et `/login` (« Suivre ma réservation », « Voir mes photos ») sur
  `NUXT_SITE_URL`. Elle ne lève jamais d'erreur : un mail part sans lien plutôt que pas du tout.
  Elle passe par `parseSecureUrl` (https, ou http sur `localhost`). Jamais de lien de connexion ni
  d'URL signée dans ces mails.
- `sendPhotosAvailableEmail` est lancée par la route de fin d'intervention avec
  `event.waitUntil`, seulement quand `admin_complete_booking` renvoie `send_photos_mail` (deux
  photos, au plus une fois : la RPC réserve `bookings.photos_notified_at` dans sa transaction).
  Un échec est journalisé, jamais retenté.

### Transport

- `NUXT_MAIL_TRANSPORT` vaut `resend` (défaut) ou `outbox`. Avec `outbox`, le mail est écrit dans
  `NUXT_MAIL_OUTBOX_DIR` (défaut `.mail-outbox`) au lieu d'être envoyé : les tests lisent ce
  dossier, aucun vrai mail ne part.
- Un fichier JSON par mail (`MailOutboxRecord` : `to`, `from`, `subject`, `html` finalisé,
  `replyTo`, `idempotencyKey`, `logLabel`, `sentAt`), écrit de façon atomique. Idempotence : un
  marqueur `.keys/<sha256 de la clé>.key` créé avec le drapeau `wx` ; une clé déjà vue n'écrit pas
  de second fichier et compte comme un succès.
- `outbox` n'est permis qu'en développement (`import.meta.dev`) ou sous Vitest (`NODE_ENV=test`,
  `isOutboxAllowed`). Nitro fige `NODE_ENV` à `production` à la construction : un build de production
  ne peut pas l'activer. Valeur inconnue : refusée en développement (aucun envoi), repli sur Resend
  avec avertissement ailleurs. `server/plugins/mailTransportCheck.ts` journalise une erreur au
  démarrage hors développement si `outbox` ou une valeur inconnue est configuré.
- `.mail-outbox` est ignoré par git et bloqué par `vite.server.fs.deny` (les mails contiennent
  des données personnelles) ; `tests/integration/email/outbox-access.test.ts` le vérifie.
- `NUXT_MAIL_TRANSPORT` doit être absent en production.

### Habillage

- `renderEmailLayout` (`app/templates/email/layout.ts`) : variantes `customer` (en-tête centré) et
  `notification` (compacte, pour les mails internes). Préheader échappé. Logo remplacé par le mot
  « BINOVYA » ; polices Montserrat et Quicksand avec repli système, rien chargé depuis Google Fonts
  (RGPD).
- Couleurs : mot-symbole `#135a73`, primaire et bouton `#0975ab`, accent `#22c0de`, texte
  secondaire `#4a5d6e`, fond `#f4f9fb`, détails `#e8f4f8`.
- Le style est dans un seul bloc `<style>`. `finalizeEmailHtml` le copie en attributs `style`
  avec `juice` à l'envoi (beaucoup de clients ignorent `<style>`) ; la media query (< 620 px)
  reste dans `<style>`.
- Pied de page : `EMAIL_FOOTER_LINKS_SLOT` remplacé à l'envoi par les liens de
  `NUXT_CONTACT_EMAIL_TO` et `NUXT_SITE_URL` ; un lien manquant ou invalide est omis.
  `parseSecureUrl` et `isPlausibleEmail` (`app/utils/link.ts`) n'autorisent que https, ou http
  sur `localhost` et `127.0.0.1`. En production, `NUXT_SITE_URL` doit être en https.
- `juice.codeBlocks` est vidé : un texte contenant `{{…}}` ou `JUICE_CODE_BLOCK_n_` provoquait une
  expansion exponentielle. Ne pas le réactiver.
- Aucun outil d'aperçu versionné : le rendu se vérifie à la main dans Gmail, Outlook, Apple Mail.
- Limites connues : confirmation perdue si Resend échoue au paiement (pas de nouvel essai) ; un
  rappel peut partir deux fois si l'écriture de `reminder_sent_at` échoue après l'envoi ; le mail
  photos n'est jamais retenté.

## Paiement

### Création de la réservation

- `POST /api/booking` (`server/api/booking/index.post.ts`) : corps de 16 Ko, validé par
  `bookingRequestSchema`. Retrouve ou crée le client, appelle `create_booking` (place bloquée 35
  minutes), ouvre une session Stripe Checkout et renvoie `{ bookingId, amountTotalCents,
checkoutUrl }` ; le navigateur est redirigé vers `checkoutUrl`.
- Checkout (`server/utils/bookingCheckout.ts`) : carte uniquement, session de 31 minutes (elle
  expire avant la place de 35, pour qu'un paiement n'aboutisse pas sur une place déjà libérée).
  Clé d'idempotence `booking-checkout-<id>`. Nom du produit : clé i18n
  `booking.checkout.productName` ; description : date longue dans la langue du client.
- Retour sur `/booking?checkout=success` ou `?checkout=cancelled` (préfixe `/en` en anglais).
  `assertCheckoutSiteUrl` exige `NUXT_SITE_URL` (https hors développement) dès le début de la
  requête, sinon 503 « Payment unavailable ». Les URL passent par `localizedSiteUrl`.
- Codes d'erreur lus par le front dans `data.code` : 409 `dayTaken`, 409 `pendingPayment`, 422
  `outOfArea`, `quoteRequired`, `binsNotConfirmed`, 400 `invalidAddress`. Autre refus de
  `create_booking` : 400 « Booking rejected ». 502 si la session Stripe échoue, 500 si son
  rattachement échoue : dans les deux cas la session est expirée et la réservation libérée.
- Un client n'a qu'une réservation `pending_payment` active (409 `pendingPayment`) : contrôle dans
  `create_booking` sous un verrou consultatif par client. Index
  `bookings_customer_id_status_expires_at_idx`.
- Champ piège `website` rempli : faux succès vers `?checkout=cancelled`, rien n'est créé.

### Webhook Stripe

- `POST /api/stripe/webhook` : corps de 512 Ko, signature vérifiée avec
  `NUXT_STRIPE_WEBHOOK_SECRET` sur le corps brut. 503 si le secret manque, 400 si la signature est
  absente ou invalide.
- `checkout.session.completed` : `confirm_booking_payment` verrouille la réservation et compare
  session et montant. Encore valable : `paid`. Expirée : `paid` si le jour est encore disponible
  sous le verrou du jour, sinon `cancelled` et remboursement. Déjà `cancelled` : remboursée.
- `checkout.session.expired` : `pending_payment` devient `expired`.
- Mises à jour conditionnées au statut courant, remboursements idempotents
  (`booking-refund-<id>`) : un événement rejoué ne change rien. Un échec renvoie 500 pour que
  Stripe rejoue.

### Libération d'une réservation abandonnée

- `POST /api/booking/release` (`{ bookingId }`, 1 Ko, réponse `{ isReleased }`) expire la session
  Stripe puis passe la réservation à `expired`. Si la session ne peut pas être expirée (déjà
  payée), rien n'est libéré.
- Le front garde brouillon et identifiant dans `sessionStorage` (`useBookingCheckout.ts`). Au
  retour (`useBookingCheckoutReturn.ts`), la libération part sur `?checkout=cancelled`, sur le
  bouton Retour (bfcache, `pageshow`) et sur le rechargement de `/booking` sans `?checkout` avec
  une entrée stockée. Le brouillon est restauré à l'étape paiement. Sur `?checkout=success`,
  l'écran de confirmation s'affiche sans attendre le webhook.
- Le `pg_cron` `expire_stale_bookings` rattrape le reste (voir « Tâches planifiées »).

## Espace client

Règles métier : [booking-system.md](./booking-system.md).

### Pages et composants

- Pages : `/login` (`useLoginForm.ts`), `/account/confirm`, `/account` (cartes, suppression),
  `/account/bookings/[id]`. Toutes en `noindex` ; `/login` en `noindex, nofollow` ;
  `/account/confirm` envoie `referrer: no-referrer`.
- `AccountBookingCard.vue` (sur `MediaCard`, maquette `docs/design/account-booking-card.html`),
  `AccountBookingReminder.vue`, calculs d'affichage dans `app/utils/accountBookingCard.ts`.
- Page d'une réservation : résumé, `AccountBookingDocuments.vue` (photos avant/après masquées si
  annulée, puis « Reçu de paiement »), « Réserver une autre date » si annulée, « Réservation
  introuvable » sur un 404.
- Photos : URL signées de 10 min (`ACCOUNT_PHOTO_URL_LIFETIME_SECONDS`) renouvelées sans recharger
  la page par `refreshLinks` (un `$fetch` de `GET /api/account/bookings/[id]` qui ne remplace que
  `documents`, car `refresh()` viderait la réservation en cas d'échec). Trois déclencheurs : un
  minuteur 60 s avant l'expiration (`ACCOUNT_PHOTO_URL_REFRESH_MARGIN_SECONDS`), le retour de
  l'onglet au premier plan, et un clic sur une photo au lien périmé. Un échec n'est annoncé que
  s'il est provoqué par l'utilisateur. Un `401` termine la session sans annonce. Image qui ne
  charge pas : message annoncé et « Recharger les photos ».
- `MediaCard.vue` (tons `success`, `info`, `neutral`, prop `interactive` : seules les cartes
  cliquables se soulèvent), `MediaCardSkeleton.vue`, `SkeletonBlock.vue`. Les squelettes sont
  `aria-hidden`, de la hauteur du contenu réel, avec une seule région `sr-only` `aria-live` qui
  reste dans le DOM (une région ajoutée avec son texte n'est pas annoncée).
- `useAccountPageState` : chargement, `401` vers `expireSession`, focus sur le `h1` après le premier
  chargement, `reload` pour « Réessayer ».
- Middlewares : `customer` (protège `/account`, `?session=expired` si la session a plus de 7 jours)
  et `guest` (renvoie un client connecté de `/login` vers `/account`).
- `useCustomerSession` : `status` (`none`, `active`, `expired`, `admin`, calculé depuis l'`amr` du
  jeton), `isActive`, `endSession` (déconnexion globale avec délai de 3 s, `SIGN_OUT_TIMEOUT_MS`,
  repli local) et `expireSession` (vers `/login?session=expired`, ou `/pro` pour un admin).
- Constantes de `app/constants/account.ts` : `LOGIN_LINK_LIFETIME_HOURS` (24),
  `CUSTOMER_SESSION_MAX_AGE_SECONDS` (7 jours), statuts, icônes et tons, durées des photos,
  `PAYMENT_RECEIPT_*` et `STRIPE_RECEIPT_HOST_SUFFIX` (`.stripe.com`).
- `/account/confirm` lit le fragment `#token_hash=…`, l'efface de l'historique, puis appelle
  `verifyOtp({ token_hash, type: 'email' })` dans le navigateur : le jeton ne passe jamais par un
  serveur.

### Routes serveur

- `POST /api/auth/login` : corps de 4 Ko, `loginRequestSchema` (e-mail, langue, champ piège).
  Réponse `{ success: true }` identique que l'adresse existe ou non, que le plafond soit atteint
  ou non, ou que le piège soit rempli. La RPC `claim_login_link` réserve l'envoi, puis
  `sendLoginLinkEmail` part après la réponse (`event.waitUntil`) : le temps de réponse ne distingue
  pas les cas.
- `GET /api/account/bookings` : profil et réservations avec le client Supabase de la session
  (sous RLS), sans photos, `Cache-Control: private, no-store`. 500 si le profil est illisible, 404
  si la fiche manque.
- `GET /api/account/bookings/[id]` : `{ booking, documents }` (`photos` avant/après en URL
  signées ou `null`, `receiptUrl`), `private, no-store`. 401 sans session (avant le 400 d'un
  identifiant non uuid). 404 « Booking not found » identique pour une réservation inexistante,
  d'un autre client ou d'un statut hors espace.
- `POST /api/account/deletion-request` : `assertSameOrigin`, session, pose
  `profiles.deletion_requested_at` (une seule fois), alerte à `NUXT_CONTACT_EMAIL_TO`. Si
  l'alerte échoue, la date est remise à zéro et la route répond 502.
- Aucune mutation de profil côté client : seul le serveur écrit.

### Fonctions serveur

- `requireCustomerId` (`server/utils/customerSession.ts`) : identifiant du client depuis le cookie
  vérifié. 401 sans session ; si la connexion a plus de 7 jours, 401 et révocation globale en
  tâche de fond (`event.waitUntil`).
- `signInTimestamp` et `isSignInExpired` (`app/utils/customerSession.ts`, partagées avec le
  navigateur) : heure de connexion = plus ancienne entrée `otp` ou `magiclink` de l'`amr`. Sans
  entrée lisible, la session compte comme expirée. Le navigateur lit le jeton sans le vérifier
  (pour masquer l'espace) ; le serveur vérifie toujours.
- `createLoginLink` (`server/utils/loginLink.ts`) : ne génère le lien que si l'utilisateur Auth et
  la fiche `profiles` ont la même adresse (Supabase ne crée jamais de compte). `generateLink`
  puis `<site>/account/confirm#token_hash=…`. Ne lève jamais d'erreur, renvoie `null`.
- `assertSameOrigin` (`server/utils/requestOrigin.ts`) : garde CSRF des routes à cookie ; `Origin`
  doit être celui de `NUXT_SITE_URL` (en dev, aussi celui de la requête), sinon 403.
- URL du site (`server/utils/siteUrl.ts`, voir aussi « SEO ») :
  - `parseSiteUrl` : https, ou en dev `http://localhost` et `http://127.0.0.1` seulement (avant :
    tout http en dev). Elle repose sur `parseSecureUrl`. Renvoie `null` sinon.
  - `resolveSiteUrl` : origine plus chemin, sans `/` final, sans query ni fragment. Sans
    `NUXT_SITE_URL` valide : 503 « Site URL unavailable ».
  - `localizedSiteUrl` : URL d'une page dans une langue (préfixe `/en`).
  - `resolvePublicSiteUrl` : même calcul sur `NUXT_PUBLIC_SITE_URL`, pour le sitemap et le
    `robots.txt`. Renvoie une chaîne vide si l'URL est invalide, sans lever d'erreur.
- `loadAccountBookings` et `loadAccountBooking` (`server/utils/accountBookings.ts`). La seconde
  renvoie aussi `stripe_payment_intent_id`, qui ne sort jamais du serveur.
- `loadAccountBookingDocuments` (`server/utils/accountDocuments.ts`) : ne lève jamais d'erreur.
  - Photos : lues et signées avec le client de la session du client, donc sous RLS, seulement pour
    une réservation `completed`. Pas de service role : si la règle change, la base refuse.
  - Reçu : `paymentIntents.retrieve` avec `expand: ['latest_charge']`, délai 4 s, aucun nouvel
    essai, `receipt_url` gardée seulement si c'est une URL https `*.stripe.com`. Cache
    (`memoryCache`) par réservation : 5 min avec l'URL, 30 s avec `null`, 500 entrées. Pourquoi :
    recharger la page ne doit pas consommer la limite de débit Stripe partagée avec Checkout, ni
    marteler Stripe pendant une panne.

## Composants communs et mouvement

### Motion

- Source unique `app/constants/motion.ts`, reprise dans les jetons de
  `app/assets/css/tailwind.css` ; `tests/unit/shared/motion-tokens.test.ts` vérifie qu'ils
  concordent.
- Jetons Tailwind : `ease-brand` (`0.22, 1, 0.36, 1`), `duration-press` (200 ms, survol et appui),
  `duration-lift` (300 ms), `duration-enter` (600 ms).
- Préréglages TypeScript : `MOTION_EASE`, `REVEAL_DURATION`, `REVEAL_MAX_STAGGER_STEPS`,
  `CONTENT_ENTER_TRANSITION` et `CONTENT_ENTER_OFFSET` (contenu qui apparaît), `HERO_ENTER_CLASS`,
  `STEP_OFFSET` et `STEP_TRANSITION` (formulaires à étapes), `FEEDBACK_OFFSET` (8 px).
- Les messages de retour (erreur, succès sous un champ ou un bouton) entrent avec
  `FEEDBACK_OFFSET` et un `y` négatif : le message descend, partout.
- Accordéon : `ACCORDION_ENTER_ACTIVE_CLASS` (courbe symétrique `0.37, 0, 0.63, 1` sur
  `duration-lift`) et `ACCORDION_LEAVE_ACTIVE_CLASS` (`ease-brand`, `duration-press`). Pourquoi :
  avec `ease-brand`, l'ouverture parcourait 61 % du trajet en 50 ms et paraissait instantanée.
- Défilement doux : `scroll-behavior: smooth` seulement sous `prefers-reduced-motion:
no-preference`.

### AppButton

- `AppButton.vue` et `buttonClass` (`app/constants/buttons.ts`, `cva`) : bouton ou lien commun.
  Variantes `primary`, `secondary`, `ghost`, `destructive`, `warning`, `onDark`, `onDarkWarning`,
  `onDarkGhost`, `onDarkOutline` ; tailles `md` (48 px), `sm` (44 px), `icon` (44 × 44 px, bouton
  carré en icône seule). Props `to`, `href`, `icon`, `trailingIcon`, `isLoading`, `isDisabled` ;
  `focus()` exposé.
- `ghost` + `icon` : envoi du formulaire de contact et croix de fermeture du dialogue de
  déplacement.
- Un bouton bloqué porte `aria-disabled` (pas `disabled`) pour garder focus et lecture ; son clic
  est annulé ; un lien bloqué devient un `a` `role="link"` sans `href`.
- `destructiveSolid` : fond rouge plein, pour la confirmation de suppression du compte
  (`AccountDeletionRequest.vue`). « Annuler » y est bloqué pendant l'envoi. Le stepper du nombre
  de bacs en butée porte `is-disabled` et reste focusable.
- Utilisé par les pages Pro, la connexion, l'espace client, la réservation, le devis, le contact
  et `DatePicker`.
- Restent natifs, faute de variante adaptée : `BookingDateStep.vue` (date suggérée, turquoise sur
  fond sombre), `BookingAddressStep.vue` (« Réessayer », aspect lien) et `QuotePhotoPicker.vue`
  (pastille de retrait d'une photo). Ajouter une variante seulement si un second usage apparaît.

### Règles d'accessibilité

- ESLint : `vuejs-accessibility/no-redundant-roles` réglée à `{ ul: ['list'], ol: ['list'] }`.
  Pourquoi : Safari et VoiceOver retirent la sémantique de liste sous le preflight Tailwind quand
  la liste est stylée (`list-style: none`). Toute `ul` ou `ol` stylée porte donc `role="list"`.
- Cibles tactiles de 44 px au moins, focus visible, texte d'accessibilité traduit (i18n).
- Mobile : `useMobileMenu` et `MenuToggleButton.vue` (nom fixe « Menu », `aria-expanded`, Échap et
  changement de route ferment le menu ; `isMorphing` à `false` dans le layout Pro, dont le
  panneau a sa propre croix).

### shadcn

La CLI shadcn-vue actuelle ne convient pas : son registre déclare un paquet npm `cn` et
`@lucide/vue`, et relève `reka-ui` et `@vueuse`. Ajouter les composants à la main, avec les
transformations de la CLI (alias, imports), sans se fier aux dépendances qu'elle installe.

### Contraste

- Thème clair (`app/assets/css/tailwind.css`) : `--secondary-foreground` et `--accent-foreground`
  valent `#050d18`. Texte navy sur turquoise : environ 8,9:1 (AA).
- `OffersSection` : badge et CTA sur `bg-accent text-accent-foreground`, avec focus visible.
- Textes secondaires sur fond clair : `text-ink/70` à `/80`, jamais plus pâle.
- Les formulaires du devis et du contact ont une région `role="status"` réservée aux lecteurs
  d'écran (`sr-only`).

## SEO

Audit et décisions : [seo.md](./seo.md).

### En-têtes et balises

- `app/app.vue` : `useLocaleHead` de `@nuxtjs/i18n`. Il pose `<html lang="fr|en">`. Les balises
  `canonical`, `hreflang` (fr, en, `x-default`) et `og:url` sortent seulement si
  `i18n.baseUrl` est renseigné (`seo: hasI18nBaseUrl`) : sans URL, pas de canonical faux. Le
  canonical n'a pas de query (`/booking?service=…` ne crée pas de doublon).
- Langues `language: 'fr'` et `'en'` (avant `en-US`). `og:locale` vaut `fr_FR` ou `en_GB`, avec
  l'autre en `og:locale:alternate`. Ajoutés en dur : `og:site_name` et `twitter:card=summary`.
  Constantes dans `app/constants/seo.ts`.
- Pages privées (`isPrivatePagePath`) : seul `<html lang>` est posé, ni lien alternatif ni balise
  Open Graph.
- `usePageSeo(titleKey, descriptionKey)` (`app/composables/usePageSeo.ts`) : titre, description,
  `og:title`, `og:description` et `og:type=website`, traduits. Utilisé par les 6 pages publiques
  (`/`, `/contact`, `/booking`, `/quote`, `/legal`, `/privacy`).
- Pages privées : `PRIVATE_PAGE_ROBOTS` (`noindex, nofollow`) dans les 12 pages, et en-tête HTTP
  `X-Robots-Tag` via `routeRules` de `nuxt.config.ts` sur `PRIVATE_PAGE_ROUTE_PATTERNS`
  (`/login`, `/account(/**)`, `/pro(/**)`, `/payment-link`, et leurs variantes `/en`). Pourquoi
  les deux : l'en-tête est un filet HTTP qui ne dépend pas du rendu de la page.
- Les pages privées ne sont pas en `Disallow` : le robot doit lire le `noindex`.

### Sitemap et robots

- Routes maison, pas de module `@nuxtjs/sitemap` ni `@nuxtjs/robots` : six pages, deux langues,
  rien à générer dynamiquement.
- `server/routes/sitemap.xml.ts` : 6 pages × 2 langues (`PUBLIC_PAGE_PATHS`), chaque entrée avec
  ses `xhtml:link` alternates et `x-default`. L'accueil s'écrit sans slash final. 503 « Sitemap
  unavailable » si `NUXT_PUBLIC_SITE_URL` est invalide. Valeurs échappées par `escapeXml`
  (`server/utils/xml.ts`).
- `server/routes/robots.txt.ts` : `Disallow: /api/` et `Sitemap:` seulement si l'URL est valide.
  Remplace `public/robots.txt`, supprimé.
- Les deux routes répondent avec `Cache-Control: public, max-age=3600` (`SEO_FILE_CACHE_CONTROL`).

### URL du site

- Trois variables, même origine https : `NUXT_SITE_URL` (serveur : mails, Stripe, `Origin`),
  `NUXT_PUBLIC_SITE_URL` (sitemap, robots) et `NUXT_PUBLIC_I18N_BASE_URL` (canonical, hreflang).
  Au build, `i18n.baseUrl` prend `NUXT_PUBLIC_SITE_URL` ; à l'exécution, la variable
  `NUXT_PUBLIC_I18N_BASE_URL` la remplace.
- `describeSiteUrlProblem` (`server/utils/siteUrl.ts`) compare les valeurs reçues : invalides ou
  d'origines différentes. `listProductionConfigProblems` (`server/utils/productionConfig.ts`,
  type `ProductionConfigSettings` dans `app/types/config.ts`) l'appelle et ajoute le contrôle du
  cookie de session. Le plugin `server/plugins/productionConfigCheck.ts` l'exécute hors dev et
  lève une erreur : le serveur refuse de démarrer (code 1) si les trois URL manquent, ne sont
  pas en https ou ont des origines différentes, ou si le cookie n'est pas Secure
  (`NUXT_PUBLIC_SUPABASE_COOKIE_OPTIONS_SECURE=false`). Le message nomme les variables, jamais
  leurs valeurs.
  Pourquoi : un canonical vers un autre domaine ferait désindexer le site, sans erreur visible,
  et un cookie de session sans `Secure` partirait en clair.
- Conséquence : `bun run preview` exige des URL https cohérentes. À revoir si un prérendu est
  un jour ajouté.

### Liens et contenu

- `LanguageSwitcher.vue` (navbar desktop et menu mobile) : liens `switchLocalePath` que les
  robots suivent, `lang` et `hreflang` sur chaque lien, `aria-current` sur la langue active.
  Entre `md` et `lg`, « FR » seul est visible, le nom accessible reste « FR Français ».
- Footer : `h2` réservé aux lecteurs d'écran, e-mail lu dans `contact.info.email.address`, liens
  localisés vers `/booking`, `/quote`, `/contact`, `/legal` et `/privacy`. Logo localisé. Plus de
  lien `binovya.com` ni de lien « CGV ».
- Dates « Dernière mise à jour » : `LEGAL_NOTICE_UPDATED_ON` et `PRIVACY_POLICY_UPDATED_ON`
  (`app/constants/legal.ts`, `2026-10-22`), rendues par `LegalLastUpdate.vue` en `<time datetime>`
  (clé `common.lastUpdate`). À mettre à jour à la main quand le texte change.
- Images : `NuxtImg` en webp avec `width`, `height` et `sizes`. Le hero a `fetchpriority="high"`,
  sans `preload` : avec `sizes`, `@nuxt/image` 2.0 télécharge alors l'image deux fois. Images
  décoratives en `alt=""`.
- Pages supprimées (orphelines, contenu contraire à l'offre, pas de redirection car le site n'est
  pas en production) : `/formulas`, `/about`, `/faq`, `/solutions/*`. Code mort retiré :
  `ClientsSection`, `CtaFreeDemo`, `ButtonCta`, `PageContainer`, `UnderlinedText`, `services.ts`,
  `clients.ts`, `useScrollAnimation`. Le type `LucideIconName` est dans `app/types/icon.ts`.
- Pas de données structurées (JSON-LD) : en attente des réponses du client (seo.md, #10).

## Base de données et Supabase

### Migrations

Ordre d'application (SQL Editor), toutes appliquées et vérifiées sur le projet de développement :

- `20261010000000_booking_schema`, `20261010010000_profiles_email`
- `20261014000000_pricing_grid_and_quotes` (grille de prix, formules, devis ; remplace les tables
  `services` et `booking_items`), `20261014010000_quote_requests_equipment`
- `20261015000000_expire_stale_bookings_cron`, `20261015010000_booking_payment_guards`
- `20261016000000_customer_area_profiles`, `…010000_login_link_rate_limit`,
  `…020000_customer_session_max_age`, `…030000_auth_email_hook_and_session_rule`
- `20261017000000_admin_login_link`, `…010000_admin_session_rule`, `…020000_pro_availability_admin`,
  `…030000_pro_availability_hardening`
- `20261019000000_pro_intervention_photos`, `…010000_pro_photos_rules`
- `20261020000000_profiles_grants_hardening`

### Sécurité de la base

- RLS active sur toutes les tables de `public`. Le public n'a aucun accès direct aux données ;
  les écritures passent par des RPC réservées à `service_role` ou par le serveur.
- `has_recent_sign_in()` : la connexion la plus ancienne (`otp` ou `magiclink`) date de moins de 7
  jours. Utilisée par les policies de `profiles`, `bookings`, `intervention_photos` et du bucket
  `intervention-photos`. `oldest_link_sign_in_at()` lit l'`amr` (partagée avec `is_admin()`).
- `is_admin()` (plpgsql, `stable`) : `app_metadata.role = 'admin'` ET connexion la plus ancienne de
  moins de 7 jours. Une session par mot de passe n'est jamais admin. Les policies l'écrivent
  `(select public.is_admin())` : évaluée une fois par requête.
- `claim_login_link(p_email)` : un seul `UPDATE` atomique, 60 s entre deux liens, 5 liens sur 24 h
  glissantes. Compare `profiles.email` sans conversion : il **doit rester en minuscules**.
  `claim_admin_login_link` : même mécanique sur `admin_login_links` (admin sans fiche `profiles`),
  l'adresse doit être celle d'un utilisateur Auth `admin` non supprimé et non banni.
- `suppress_auth_emails(event)` renvoie `{}` : Supabase n'envoie aucun mail d'auth, tous partent de
  notre serveur (`generateLink` puis Resend).
- Droits : les nouvelles fonctions de `public` sont exécutables par `anon` et `authenticated`
  (`pg_default_acl`). Chaque migration retire l'exécution des fonctions sensibles.
- `20261020000000_profiles_grants_hardening` : retire à `anon` et `authenticated` `insert`,
  `delete`, `truncate`, `references`, `trigger` sur `profiles`, et `references`, `trigger` sur
  `bookings`, `availability_rules`, `availability_overrides` (appliquée et vérifiée). Il reste
  `references` et `trigger` sur `price_grid`, `booking_settings`, `quote_requests` : inoffensifs
  par PostgREST, durcissement en V2.
- Pourquoi une règle des 7 jours faite par nous : le cookie `@supabase/ssr` vaut 400 jours et son
  `maxAge` écrase celui de `@nuxtjs/supabase`. « Time-box user sessions » n'existe pas sur le plan
  Free. Une connexion par mot de passe donnerait `amr=password`, refusée par l'application et la RLS.
- Limites connues : un refresh token volé et jamais présenté reste valide chez GoTrue, mais
  n'accède plus à aucune donnée après 7 jours. Un scanner de mail qui exécute le JavaScript peut
  consommer le lien.

### Réglages Auth (hors migrations)

Ils ne sont dans aucune migration : s'ils sont oubliés, la sécurité de l'espace client ne tient pas.

- Auth Hook « Send Email » (type Postgres) vers `public.suppress_auth_emails`.
- « Allow new users to sign up » désactivé (aucun compte créé par un lien).
- Email OTP Expiration = 86 400 s, égal à `LOGIN_LINK_LIFETIME_HOURS`.
- Secure email change et Secure password change activés, détection de réutilisation des jetons
  de renouvellement activée, limite d'e-mails au minimum.
- Production : Site URL et Redirect URLs = `https://binovya.com` uniquement.

### Projet de production

Dans l'organisation Supabase du client (étape 12 de `TODO.md`) :

1. Appliquer les migrations ci-dessus dans l'ordre des horodatages (V1 : SQL Editor ou
   `supabase db push`).
2. Refaire à la main les réglages Auth ci-dessus.
3. Créer l'admin SANS mot de passe : invitation du tableau de bord, ou `auth.admin.createUser`
   sans `password`, avec `email_confirm: true` et `app_metadata: { role: 'admin' }`. Pas de fiche
   `profiles`. Adresse dédiée et non publiée.
4. RLS automatique : le projet de développement a un event trigger `ensure_rls`
   (`ddl_command_end`, fonction `public.rls_auto_enable()`) qui active la RLS sur toute table
   créée. Il n'est dans aucune migration et n'existera pas en production : activer la même option
   ou le fournir par migration (décision en attente, `TODO.md`).
5. Vérifier en lecture seule :

```sql
-- Droits d'exécution des fonctions : aucune ligne ne doit lister anon ou PUBLIC
select p.proname, p.proacl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'claim_login_link',
    'claim_admin_login_link',
    'has_recent_sign_in',
    'suppress_auth_emails'
  );

-- Policies de la règle des 7 jours : profiles, bookings, intervention_photos
-- et storage.objects (intervention-photos) doivent toutes apparaître
select schemaname, tablename, policyname
from pg_policies
where qual ilike '%has_recent_sign_in%'
   or with_check ilike '%has_recent_sign_in%';

-- UPDATE sur profiles : ni anon ni authenticated ne doivent apparaître
select
  has_table_privilege('anon', 'public.profiles', 'UPDATE') as anon_update,
  has_table_privilege('authenticated', 'public.profiles', 'UPDATE') as authenticated_update;

-- Aucun admin avec mot de passe : aucune ligne attendue
select id
from auth.users
where raw_app_meta_data ->> 'role' = 'admin'
  and encrypted_password <> '';

-- RLS automatique : une ligne attendue
select evtname, evtevent, evtfoid::regproc from pg_event_trigger where evtname = 'ensure_rls';
```

- Résultats attendus : `claim_login_link` et `claim_admin_login_link` réservées à `service_role`,
  `has_recent_sign_in` à `authenticated` et `service_role`, `suppress_auth_emails` à
  `supabase_auth_admin`. Troisième requête : `false` et `false`. Quatrième : aucune ligne (sinon
  supprimer l'admin et le recréer sans mot de passe). Cinquième : une ligne.
- On n'utilise pas `information_schema.role_table_grants` : elle n'affiche que les droits visibles
  pour le rôle qui l'exécute, un résultat vide peut être un faux « OK ». `has_table_privilege`
  répond pour le rôle nommé.
- Les réglages Auth ne se lisent pas en SQL : les contrôler dans le tableau de bord, puis tester
  qu'un lien demandé sur `/login` arrive par Resend et jamais par Supabase.

## Espace Pro

Règles métier : [booking-system.md](./booking-system.md).

### Pages et mise en page

- Pages : `/pro/login`, `/pro/confirm` (comme `/account/confirm`), `/pro` (planning du jour),
  `/pro/interventions` (liste filtrée), `/pro/interventions/[id]` (fiche en quatre étapes) et
  `/pro/availability` (capacité par jour de semaine, exceptions, jours à signaler, `?date=`).
  Toutes en `noindex, nofollow` ; `/pro/confirm` envoie `referrer: no-referrer`.
- Layout `pro` (`app/layouts/pro.vue`) : barre latérale fixe (`ProNavPanel`) à partir de
  `PRO_SIDEBAR_MIN_WIDTH` (1024 px), sinon en-tête sombre avec burger qui ouvre la même navigation
  dans un `Dialog` reka-ui (`PRO_NAV_SHEET_ID`) ; il se ferme au passage en mode barre latérale, le
  focus revient sur la barre ou sur le bouton du menu. Sans session admin : seulement la marque.
- `ProNavPanel.vue` : liens de `PRO_NAV_ITEMS` avec `aria-current`, adresse de l'admin, déconnexion.
- Pied de page : `nav` « Liens du site BINOVYA » (mentions légales, confidentialité, retour au
  site) puis copyright. Dans le DOM, la `nav` précède le copyright ; `order` rétablit l'ordre
  visuel dès `sm` (pas de `display: contents`). Liens de 44 px.

### Routes serveur

Tous les `GET` : `Cache-Control: private, no-store` posé en premier, puis `requireAdmin`, puis
Zod (`server/utils/proSchemas.ts`, 400), puis lecture avec le client de la session (RLS
`is_admin()`), erreur de lecture = 500. Les écritures : `assertSameOrigin`, `requireAdminForWrite`,
taille du corps, uuid, Zod, puis écriture avec `service_role` (la RLS n'autorise plus aucune
écriture à `authenticated`).

- `POST /api/pro/auth/login` : `handleLoginRequest` avec `claim_admin_login_link` et
  `sendAdminLoginLinkEmail` (sans `replyTo` : il part à l'admin lui-même).
- `GET /api/pro/planning?date=` : interventions `paid` et `completed` du jour (aujourd'hui en
  Europe/Paris par défaut), dépôt et `day` (`ProDayOverview`, ou `null` si `admin_day_overview`
  échoue : erreur journalisée, planning affiché). Chaque intervention porte `isToMove`.
- `GET /api/pro/interventions?status&from&to&page` : 50 par page, `status` `all` par défaut, `page`
  de 1 à 1000, `from` > `to` donne 400. Page au-delà du total (`PGRST103`) : la route compte et
  renvoie une page vide avec le total. `isToMove` posé par `admin_day_overview` (si l'appel
  échoue, pas de badge).
- `GET /api/pro/interventions/[id]` : intervention `paid`, `completed` ou `cancelled`
  (`ProIntervention` : client, adresse, bacs, formule, `photos`, `completedWithoutPhotos`,
  `isToMove`). Uuid invalide, inconnu ou d'un autre statut : même 404 `data.code = 'notFound'`
  (`server/utils/proErrors.ts`).
- `GET /api/pro/interventions/days?from&to` : nombre d'interventions `paid` et `completed` par
  jour, pour les points des `DatePicker`. `from` et `to` obligatoires, `to` au plus 41 jours après
  `from` (grille de 42 jours), sinon 400. Lecture de `scheduled_date` par lots de 1 000 (le
  `max_rows` de PostgREST tronquerait en silence), 3 000 interventions au plus ; au-delà ou en
  cas d'erreur : 500 `Interventions unavailable`.
- `GET /api/pro/availability?from&to` : règles par jour de semaine et jours « notables »
  (`isNotableDay` : exception, jour fermé avec interventions payées, ou plus de réservations que la
  capacité). Défaut : aujourd'hui à +365 jours (`PRO_AVAILABILITY_HORIZON_DAYS`), 400 jours au plus.
- `PUT /api/pro/availability/rules` (2 Ko) : 1 à 7 jours distincts, capacité 0 à
  `PRO_DAY_CAPACITY_MAX` (50). Un seul `upsert` : tout ou rien.
- `PUT /api/pro/availability/overrides/[date]` (4 Ko) : `maxBookings` (nombre ou `null`), `note`,
  `sector` (commune signée ; absent garde le secteur, `null` l'efface). Date invalide ou au-delà
  de l'horizon : 400 ; passée : 422 ; jeton invalide : 400 `invalidAddress`. Une exception vide
  est supprimée. `DELETE` sur la même route : mêmes contrôles de date, supprimer une exception
  absente réussit. Les deux renvoient le `ProDayOverview` du jour.
- `POST /api/pro/bookings/[id]/reschedule` (1 Ko) : `{ date, force }` → `{ bookingId, oldDate,
newDate, overriddenCodes }`. Refus par `data.code` : `notFound` 404, `invalidDate` 400, `tooFar`
  400 (au-delà de 365 jours), `notPaid`, `sameDate`, `pastDate` 422, `tooFrequent` 429,
  `outOfArea`, `dayClosed`, `dayFull`, `outOfSector` 409 (forçables avec `force: true`). Le mail
  au client part après la réponse (`event.waitUntil`).
- `PUT /api/pro/bookings/[id]/photos/[kind]` (`before` ou `after`, sinon 400 `invalidKind`) : corps
  = JPEG brut, 5 Mo au plus (`PRO_PHOTO_MAX_BYTES`). Sans `Content-Length` : 411 ; au-delà : 413
  `tooLarge` ; non JPEG, mal formé ou suivi d'octets après son `EOI` : 400 `invalidImage`. La
  signature et la structure sont lues (jamais le `Content-Type`), puis `stripJpegMetadata`
  réécrit le fichier sans EXIF (GPS compris), XMP, ICC, IPTC ni commentaires (seuls APP0 et APP14
  restent ; un SOF et un SOS sont requis, 1 024 segments au plus). Pourquoi côté serveur : le
  navigateur nettoie déjà (canvas), mais le serveur ne doit pas lui faire confiance. Réponse
  `{ bookingId, kind, replaced }`. Refus : 404 `notFound`, 422 `notPaid`, 422 `futureDate`, 500
  « Photo not saved ». Le statut est lu avant l'envoi (`assertBookingAcceptsPhotos`) pour ne laisser
  aucun fichier à une réservation refusée ; la RPC le revérifie sous verrou.
- `POST /api/pro/bookings/[id]/complete` (1 Ko) : `{ force }` → `{ bookingId, withoutPhotos,
customerNotified }`. Refus : `notFound` 404, `alreadyCompleted` 409, `notPaid` 422, `futureDate`
  422, `missingPhotos` 409 (une photo manque et `force` est faux). Le mail photos part après la
  réponse quand `customerNotified` est vrai.

### Fonctions serveur

- `requireAdmin` (`server/utils/adminSession.ts`) : rôle lu dans `app_metadata.role` (jamais
  `user_metadata`) puis session active (`hasAdminRole`, `isActiveAdminClaims` dans
  `app/utils/adminSession.ts`). 401 sans session, 403 sans le rôle, 401 et révocation globale si la
  session a plus de 7 jours ou vient d'un mot de passe. L'ordre 403 puis 401 évite de révoquer la
  session d'un simple client.
- `requireAdminForWrite` : `requireAdmin`, puis relit le compte par `auth.getUser()`. 401 si
  l'identifiant diffère ou si Auth ne répond pas, 403 si le rôle a été retiré ou le compte banni.
  Pourquoi : un rôle retiré reste lisible dans le jeton jusqu'à 1 h.
- `requireSessionIdentity` et `rejectExpiredSession` (`server/utils/session.ts`) : partagées avec
  `requireCustomerId`.
- `handleLoginRequest` (`server/utils/loginRequest.ts`), commune aux deux routes de connexion.
  `server/utils/loginLink.ts` : `claimLoginLink`, `createLoginLink`, `createAdminLoginLink` (lien
  vers `/pro/confirm#token_hash=…`, seulement si l'utilisateur est encore admin).
- `server/utils/proInterventions.ts` : `loadDayInterventions`, `loadInterventionsPage`,
  `loadDepot`, sous RLS ; profils lus à part par lot. Tri du planning par code postal puis
  adresse, de la liste par date puis création. `isToMove` : intervention `paid` dont le jour est
  fermé, jamais un simple dépassement de capacité.
- `server/utils/proInterventionDays.ts` : `loadInterventionDayCounts` (lots avec `range`, tri par
  date puis `id`).
- `server/utils/proAvailability.ts` : `loadDayOverviews`, `loadDayOverview`,
  `loadDayOverviewsOfDates` (RPC `admin_day_overview`), `loadWeekdayRules`, `saveWeekdayRules`,
  `saveDayOverride`, `deleteDayOverride`. Erreurs 500 `Availability unavailable` / `not saved`.
- `server/utils/proReschedule.ts` : `rescheduleBooking` traduit la ligne de refus de
  `admin_reschedule_booking` en erreur HTTP avec `data.code`. `proHorizonDateSchema` marque
  « trop loin » pour répondre `tooFar` plutôt que `invalidDate`.
- `sendBookingRescheduleEmail` : uuid neuf par appel (un mail par déplacement). Le `update` de
  `reminder_sent_at` du rappel est conditionné à la date annoncée.
- `server/utils/proPhotos.ts` : `readPhotoBody`, `assertBookingAcceptsPhotos`,
  `saveInterventionPhoto` (envoi dans le bucket privé, `upsert`, chemin `{booking_id}/{kind}.jpg`,
  puis `admin_set_intervention_photo`). Si la RPC refuse et qu'aucune ligne de ce type n'existe,
  le fichier est supprimé (pas de fichier sans ligne) ; un échec passager le garde, car un envoi
  concurrent a pu l'enregistrer. Aucun mail ne part d'un envoi de photo.
  `loadInterventionPhotoFlags` lit quelles photos existent, sous RLS.
- `server/utils/proCompletion.ts` : `completeBooking` traduit la ligne de refus de
  `admin_complete_booking`.
- `app/utils/image.ts` : `hasJpegSignature`, `stripJpegMetadata` (partagée avec le navigateur),
  `fitWithin`. `app/utils/proPhotos.ts` : `photoStatusRefusal`, `canCompleteIntervention`.

### Base de données

- `admin_login_links` (`user_id`, `sent_at`, `link_count`, `window_start`) : compteurs de plafond
  des admins. RLS active, aucun droit hors `service_role`.
- `day_check(date, lat, lon, exclude_booking, apply_bounds)` : logique de `day_status` (fermé,
  complet, `outOfSector`, disponible), pouvant ignorer une réservation et les bornes de délai et
  d'horizon. `day_status` l'appelle. Contraintes : capacité ≤ 50, latitude et longitude bornées,
  note ≤ 500 caractères ; `availability_overrides.sector_label` (1 à 300 caractères, avec
  coordonnées seulement).
- `admin_day_overview(p_from, p_to)` : une ligne par date (400 jours au plus, sinon
  `INVALID_RANGE`) : capacité effective et sa source (`rule` ou `override`), `is_closed`, secteur
  et libellé, note, réservations actives (comptées dans la capacité) et payées. Elle ne renvoie
  pas les coordonnées d'un client.
- `admin_reschedule_booking(p_booking_id, p_new_date, p_force)` : verrouille la réservation puis
  les deux jours (verrous consultatifs, dans l'ordre des dates). Refus jamais forçables, dans
  l'ordre : `not_found`, `not_paid`, `invalid_date`, `same_date`, `past_date`, `too_far` (plus de
  365 jours), `too_frequent` (quatrième déplacement dans l'heure ; colonnes `rescheduled_at`,
  `reschedule_count`, `reschedule_window_start`). Forçables : `out_of_area` puis ceux de
  `day_check`. Avec `p_force`, tous les échecs sont renvoyés dans `overridden_reasons`. Remet
  `reminder_sent_at` et `day_of_sms_sent_at` à zéro. Un nouvel essai après un délai dépassé côté
  navigateur est protégé par `same_date` et `too_frequent`.
- `admin_set_intervention_photo(p_booking_id, p_kind, p_storage_path)` : verrouille la réservation.
  Refus : `not_found`, `not_paid`, `future_date` (`paid` après aujourd'hui, Europe/Paris ;
  `completed` toujours accepté), `invalid_kind`, `invalid_path`. Insère ou remplace la ligne.
- `admin_complete_booking(p_booking_id, p_force)` : refus jamais forçables `not_found`,
  `already_completed`, `not_paid`, `future_date` ; `missing_photos` si une photo manque et
  `p_force` est faux. Sinon `completed`, pose `completed_at` et `completed_without_photos`, et
  réserve `photos_notified_at` : `send_photos_mail` est vrai seulement avec les deux photos, donc
  au plus une fois. Une fin forcée ne notifie jamais, même si des photos s'ajoutent ensuite.
- Photos : bucket privé `intervention-photos` (5 Mo, `image/jpeg` seulement), contrainte
  `intervention_photos_storage_path_format`. `anon` et `authenticated` n'écrivent ni la table ni
  le bucket (seul le serveur, avec `service_role`) ; `authenticated` lit si la réservation est
  `completed` et que `has_recent_sign_in()` est vrai.
- `day_check`, `admin_day_overview`, `admin_reschedule_booking`, `admin_set_intervention_photo` et
  `admin_complete_booking` sont réservées à `service_role`.

### Client

- Middlewares : `admin` (protège les pages `/pro` ; sans session valide vers `/pro/login`, avec
  `?access=denied` si ce n'est pas un admin, `?session=expired` si la session a plus de 7 jours)
  et `admin-guest` (admin connecté de `/pro/login` vers `/pro`). `customer` et `guest` renvoient
  un admin vers `/pro`. Avis par `NoticeBanner.vue`.
- `useAdminSession` : `isAdmin`, `isExpiredAdmin`, `hasSession`, `endSession`, `leave`, `expire`.
  `useProPageState` (sur `useAccountPageState`) : 401 retour à `/pro/login` avec avis, 403 sans.
- `useBusinessToday` : date du jour en Europe/Paris (`app/utils/date.ts`), recalculée au retour de
  l'onglet. `parseIsoDate` pose l'année par `setFullYear` (`new Date(année, …)` lit 0 à 99 comme
  1900 à 1999) ; `toIsoDate` écrit l'année sur 4 chiffres.
- `groupPhoneDigits` (`app/utils/phone.ts`) : numéros FR/LU en groupes, lus groupe par groupe par
  les lecteurs d'écran ; le lien `tel:` garde le numéro brut (`telHref`).
- `useProInterventionDays(source)` : points de `DatePicker` sur `/pro` et `/pro/interventions`.
  Cache par grille (`from/to`) vidé quand la donnée de la page change ; une réponse périmée est
  ignorée (jeton par requête) ; erreurs silencieuses sauf 401 et 403 (`useProAuthError`).
- `useProInterventionsFilters` : l'URL est la source de vérité (`status`, `from`, `to`, `page`),
  `router.replace` pour les filtres, `router.push` pour les pages.
- `DatePicker.vue` : `Popover` shadcn et `CalendarRoot` reka-ui. Nom du bouton par
  `aria-labelledby`, `aria-invalid`, `isLabelHidden`, bornes `min` et `max`, lundi en premier, 6
  semaines (`fixed-weeks`), ouvert toujours sous son champ, défilement interne si la place manque.
  - Panneau monté à la première ouverture seulement (`isPanelMounted`). Pourquoi : dans reka-ui
    2.7, un popover téléporté toujours monté dans un dialogue perturbe le `FocusScope` et fait
    perdre l'autofocus du dialogue.
  - `aria-label` « Choisir la date : {libellé} » sur le `PopoverContent` (le bouton garde son `id`,
    l'`aria-labelledby` posé par reka pointerait dans le vide).
  - Focus initial par `@open-auto-focus` (`focusCalendarDay`), pas `initial-focus`. Pourquoi : sur
    Safari et iOS, le piège à focus du `Dialog` modal n'est suspendu qu'après un `nextTick`, et
    `initial-focus` fermait le calendrier dans « Changer la date ».
  - Prop `markedDays` (date ISO vers nombre) : point décoratif `aria-hidden` et `aria-label` complet
    par `calendarDayAttributes` (`app/utils/calendar.ts`). Pourquoi : reka pose son propre
    `aria-label` sur la cellule, qu'un texte ajouté dans la cellule ne remplacerait pas.
    L'événement `visibleRange` donne `{ from, to }` de la grille de 42 jours, émis une fois par
    grille tant que le panneau reste ouvert. Légende affichée si un jour du mois est marqué.
  - Les points ne suivent pas le filtre de statut de la liste (toujours `paid` et `completed`).
- `ProDayStatusPanel.vue` (planning) : alerte du jour, `data-tone` `urgent`, `warning` ou `info`,
  un seul lien d'action vers `/pro/availability?date=`. Urgente (fond rouge `destructive`) dès que
  `dayMoveCount` dépasse 0 : titre `pro.dayStatus.urgent.title` (via `dayAlertTitle`), consigne
  renvoyant au menu « ⋯ » puis « Changer la date ». Dépassement de capacité sans intervention
  déplaçable : ton `warning` (ambre), conseil `overCapacityNoMove`. Jour fermé et vide : `info`.
  - `app/utils/proAvailability.ts` : `dayStatus`, `dayStatusTitle`, `dayMoveCount` (toutes les
    `paid` d'un jour fermé ; sinon les réservations au-delà de la capacité, au plus les `paid`) et
    `dayAlertTitle`. Aucun paramètre nommé `n` ou `count` dans ces titres : vue-i18n choisirait
    la forme plurielle d'après eux avant l'argument explicite.
  - La région live de `/pro` annonce `dayAlertTitle` après le nombre d'interventions. Le panneau
    n'a ni `role="alert"` ni focus automatique.
- `ProCapacityField.vue` : `NumberField` reka de 0 à `PRO_DAY_CAPACITY_MAX`, boutons de 44 px. Dans
  une exception (`isNullable`), le champ vide affiche en gris la valeur de la règle ; vide = suit
  la règle (`null`). Le texte est appliqué au fil de la frappe. Pourquoi : reka l'applique au
  `blur`, et le changement de mise en page au-dessus de « Enregistrer » déplaçait le bouton
  avant la fin du clic.
- `useProDayOverrideDrafts` (brouillons du formulaire d'exception, remis à zéro au changement de
  date), `ProWeekdayRulesForm`, `ProDayOverrideForm`, `ProDayOverviewList`, `ProFormFeedback` :
  annonces par `useLiveAnnouncement` dans une région `role="status"`.
- `ProRescheduleDialog.vue` (`Dialog` reka-ui, feuille basse sur mobile, fenêtre centrée dès `sm`) :
  - Focus initial sur « Nouvelle date ». Fermeture bloquée pendant l'envoi (Échap, croix `ghost`,
    « Annuler », fond).
  - Délai `PRO_RESCHEDULE_TIMEOUT_MS`, pas de nouvel essai automatique : au dépassement, message
    « peut-être enregistré », focus sur « Déplacer », liste rechargée à la fermeture.
  - Refus forçable : « Forcer quand même » (`destructive`).
  - Succès : fermeture, annonce émise une fois le dialogue démonté, liste rechargée, focus sur
    son titre (`useProPageState.handleRescheduled`). Sinon le focus revient sur le bouton « … ».
  - La région `role="status"` de `/pro` et `/pro/interventions` porte `aria-live="polite"`
    explicite : `hideOthers` de reka épargne seulement les éléments `[aria-live]`.
- `ProInterventionCard.vue` : ligne compacte sombre sous `sm` (`ProInterventionRow.vue`), carte
  `MediaCard` dès `sm`. Logique commune dans `useProInterventionCard` (ton, pastille
  d'avancement, action « Commencer » / « Continuer » / « Voir », route de la fiche, lignes de
  détail, `isReschedulable`) et `PRO_INTERVENTION_CARD_DEFAULTS`. Sur la ligne mobile, le lien de
  la fiche couvre toute la ligne (`after:inset-0`) et `ProRescheduleMenu` est en `relative z-10`.
  Badge `ProToMoveBadge.vue`. `ProRescheduleMenu.vue` : bouton « … » et `DropdownMenu` avec
  « Changer la date » ; le dialogue ne s'ouvre qu'à `closeAutoFocus` du menu
  (`openPendingReschedule`) pour ne pas se disputer le focus.
- Fiche d'intervention (`[id].vue`) : `useFetch` (`server: false`) et `useAccountPageState`. Mode
  de `interventionMode` : `steps` (`paid`, jour venu), `upcoming` et `cancelled` (lecture seule),
  `completed` (récapitulatif, « Remplacer »). `?origin=list` mémorise la liste et ses filtres
  (liste blanche `proListQuery`, `interventionBackRoute`). Une seule région `role="status"`
  (`liveStatus`), alimentée par `useProPhotoUpload`. En mode `steps`, l'en-tête se réduit au `h1`
  (nom du client) pour n'afficher que l'étape en cours sur téléphone.
- Étapes (`ProInterventionFlow.vue`, `useProInterventionSteps`, `app/utils/proSteps.ts`,
  `app/constants/proSteps.ts`) : 1 Itinéraire, 2 Photo avant, 3 Photo après, 4 Récapitulatif.
  - `?step=n` ; sans valeur valide, `initialInterventionStep` déduit l'étape des photos
    enregistrées (`router.replace`). Le bouton de l'étape fait un `push` : le retour du téléphone
    revient à l'étape précédente. `useProStepHistory` saute les entrées `step` quand la page
    n'affiche plus les étapes.
  - Boutons d'une photo présente : « Aller à la photo après » (étape 2, `pro.steps.next.before`) et
    « Voir le récap » (étape 3, `pro.steps.next.after`) ; EN "Go to the after photo" / "See the
    summary".
  - À chaque changement d'étape, le focus va au `h2` (préfixe `sr-only` « Étape N sur 4 : »).
  - `ProInterventionSteps.vue` : compteur et quatre segments (`current`, `done`, `skipped`,
    `todo`), formes distinctes sans dépendre de la couleur (`PRO_STEP_BAR_TONES`), segments en
    liens de 44 px.
  - `ProStepDirections.vue` (étape 1 : destination, `ProDirectionsMenu.vue`, appel en icône,
    « Je suis sur place »), `ProStepPhoto.vue` et `ProPhotoSlot.vue` (« Passer cette photo » ouvre
    une confirmation en ligne qui avertit de l'absence de mail photos), `ProStepRecap.vue`,
    `ProInterventionDetails.vue` (accordéon « Plus d'infos », fermé par défaut),
    `ProInterventionPageSkeleton.vue`.
- Itinéraire (`app/utils/navigationApps.ts`, `app/constants/navigationApps.ts`) :
  `detectNavigationPlatform` lit `navigator.userAgent` et `maxTouchPoints` au montage (iPadOS se
  présente comme un Mac). iOS : Plans, Google Maps, Waze ; Android : Google Maps, Waze, « Autre
  application… » (URI `geo:0,0?q=lat,lon(adresse)`) ; Mac : Google Maps, Waze, Plans ; autre :
  Google Maps, Waze. Plans utilise `daddr` (`dirflg=d`), lu aussi avant iOS 18.4. Waze :
  `ll=…&navigate=yes`. `WazeIcon.vue` (simple-icons, CC0), `GoogleMapsIcon.vue` (icône de 2020
  téléchargée une fois depuis Wikimedia Commons, à n'utiliser que pour pointer vers Google Maps).
- Tournée du jour (`app/utils/googleMaps.ts`) : `directionsUrl` et `roundDirectionsUrls`, format
  `https://www.google.com/maps/dir/?api=1&destination=…&travelmode=driving` avec `origin` et
  `waypoints`. Coordonnées si valides, sinon texte. Part du dépôt, revient au dépôt, ordre
  d'affichage, tronçons de `GOOGLE_MAPS_MAX_WAYPOINTS` (9). Les mobiles sans l'application
  n'acceptent que 3 étapes. L'ordre optimisé est V2.
- Envoi des photos (`useProPhotoUpload`, `app/utils/photoResize.ts`) :
  - Un champ fichier `accept="image/*"` sans `capture` : le téléphone propose appareil ou galerie.
    Pas de `getUserMedia`.
  - `preparePhotoForUpload` décode avec `<img>` (orientation EXIF appliquée), redessine dans un
    canvas : 2 000 px au plus, JPEG à 0,85 puis 0,7 et 0,55 tant que le fichier dépasse 5 Mo. Le
    canvas ne garde aucune métadonnée.
  - `PUT` du JPEG brut, délai `PRO_PHOTO_UPLOAD_TIMEOUT_MS` (60 s). Le composable est tenu par la
    page : l'envoi continue si l'admin change d'étape. L'aperçu local utilise
    `URL.createObjectURL` (d'où `blob:` dans `img-src` de la CSP).
  - Un échec est annoncé quelle que soit l'étape, avec une boîte et un lien vers l'étape concernée.
    Un délai dépassé laisse le résultat inconnu : fiche rechargée avec un message.
- `ProCompleteDialog.vue` (`AlertDialog` reka-ui) : confirmation simple avec les deux photos ; sinon
  mode « sans photos » (`destructive`, nomme les photos manquantes, envoie `force: true`). Si le
  serveur répond `missingPhotos`, bascule en mode forcé. Délai `PRO_COMPLETE_TIMEOUT_MS` (15 s) :
  résultat inconnu, fiche rechargée à la fermeture. `PRO_DIALOG_CONTENT_CLASS` et
  `PRO_DIALOG_OVERLAY_CLASS` (`app/constants/pro.ts`) sont communes aux deux dialogues.
- Dépendance technique : l'ordre de focus et d'annonce des dialogues (déplacement, fin
  d'intervention, menu « … ») s'appuie sur reka-ui 2.7 (`FocusScope` émet `closeAutoFocus` pendant
  `scope.stop()`, `useHideOthers` retire `aria-hidden` dans un `onUnmounted`) et Vue 3.5. À
  revérifier à chaque mise à jour.

### Risques acceptés

- Un rôle admin retiré ne coupe la lecture qu'après 1 h au plus (durée du jeton lu par
  `getClaims`). Les écritures relisent le compte (`requireAdminForWrite`).
- Les liens signés des photos (10 min) se copient : quiconque en a un l'ouvre jusqu'à expiration.
- Adresse admin dédiée et non publiée : n'importe qui peut en demander un lien, et 5 liens sur 24 h
  verrouillent l'admin pour la journée.
- Un appel à `/api/pro/*` avec une session par mot de passe révoque globalement les sessions de cet
  admin ; seul celui qui connaît le mot de passe peut le provoquer.

## Hébergement

**Critères du VPS (V1)** : datacenter dans l'UE, snapshots disponibles. V1 ne fait tourner que
Caddy et Nuxt. Candidats : OVHcloud, Contabo, netcup (voir « Coûts estimés »).

**Docker Compose (V1)** :

| Service | Rôle                             | Exposé                      |
| ------- | -------------------------------- | --------------------------- |
| `caddy` | Reverse proxy, certificats HTTPS | Oui (80/443, IP Cloudflare) |
| `nuxt`  | Application                      | Via Caddy                   |

**Sécurité du serveur** (étape 12) : SSH par clé uniquement, root désactivé, `ufw` (22 ouvert, 80
et 443 limités aux plages Cloudflare : sinon un attaquant qui connaît l'IP du VPS contourne WAF et
limites de débit), `fail2ban` pour SSH seulement (derrière Cloudflare il ne voit que des IP
Cloudflare sur 80 et 443 et les bannirait), `unattended-upgrades`, horloge NTP (les webhooks
Stripe sont rejetés au-delà de 5 min d'écart).

### Cloudflare

- Plan gratuit, DNS proxifié. Cloudflare déchiffre le trafic puis le rechiffre vers Caddy : sous-
  traitant RGPD (société américaine), à citer avec son DPA dans la politique de confidentialité.
- DNS : `A` (et `AAAA`) `binovya.com` vers le VPS et `CNAME` `www`, proxifiés ; enregistrements
  Resend (SPF, DKIM, `MX send`) et `_dmarc` en « DNS only » ; `CAA` facultatif.
- SSL « Full (strict) » : Caddy garde un certificat valide sur l'origine (Let's Encrypt par défi
  HTTP-01, qui fonctionne derrière le nuage orange).
- **Limite de débit (V1)** : UNE règle qui regroupe `/api/auth/login`, `/api/pro/auth/login`,
  `/api/booking*`, `/api/contact`, `/api/quote` et `/api/address/search`. Proposition : 30
  requêtes par 10 s et par IP, blocage 60 s. Le nombre de règles du plan gratuit est à vérifier à
  la pose. Les limites applicatives (`claim_login_link`) restent : elles protègent même si
  Cloudflare est contourné. C'est la vraie protection des géocodeurs, le cache n'absorbe que les
  répétitions.
- Caddy lit l'IP réelle dans `CF-Connecting-IP` grâce à `trusted_proxies` réglé sur les plages
  Cloudflare, sinon il ne voit que les IP de Cloudflare.

### Caddyfile et CSP

Écrit et testé en local à l'étape 10 (`deploy/Caddyfile`), posé sur le serveur à l'étape 12.
Sans bloc `rate_limit`, pas besoin d'une version de Caddy compilée sur mesure.

```
{
	email contact@binovya.fr
}

(security_headers) {
	header {
		Strict-Transport-Security "max-age={$HSTS_MAX_AGE}; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
		Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
		Cross-Origin-Opener-Policy "same-origin"
		Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; script-src-attr 'unsafe-hashes' 'sha256-bwK6T5wZVTANitXbrTsel7kl/PyCjCd/Dq5Qoz3imjM='; style-src 'self' 'unsafe-inline'; connect-src 'self' {$SUPABASE_URL}; img-src 'self' data: blob: {$SUPABASE_URL}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
		-Server
		-Via
		-X-Powered-By
	}
}

http://{$SITE_DOMAIN}, http://www.{$SITE_DOMAIN} {
	import security_headers
	redir https://{$SITE_DOMAIN}{uri} permanent
}

www.{$SITE_DOMAIN} {
	import security_headers
	redir https://{$SITE_DOMAIN}{uri} permanent
}

{$SITE_DOMAIN} {
	import security_headers
	encode zstd gzip
	reverse_proxy nuxt:3000

	log {
		output stdout
		format filter {
			request>uri query {
				delete q
			}
			request>remote_ip ip_mask 24 48
			request>client_ip ip_mask 24 48
			request>headers>X-Forwarded-For ip_mask 24 48
			request>headers>Cf-Connecting-Ip ip_mask 24 48
			wrap json
		}
	}
}
```

- Variables injectées par `deploy/docker-compose.yml` : `SITE_DOMAIN`, `SUPABASE_URL` (reprise de
  `NUXT_PUBLIC_SUPABASE_URL`) et `HSTS_MAX_AGE`. L'e-mail ACME reste `contact@binovya.fr` : la
  boîte est en `.fr`, le domaine du site en `.com`.
- Le snippet `(security_headers)` est importé par les trois blocs : la CSP est écrite une seule
  fois. `http://` (apex et `www`) et `https://www` mènent en une seule redirection 301 vers
  l'apex en https.
- La CSP est appliquée dès le lancement (pas de phase Report-Only). Le cookie de session est
  lisible par le JavaScript : la CSP est la principale parade au vol de session par XSS.
- Ajouts à la CSP minimale et pourquoi :
  - `style-src 'self' 'unsafe-inline'` : styles en ligne rendus côté serveur par `motion-v` et
    balises `<style>` de Nuxt, `@nuxt/fonts` et `vue-sonner`.
  - `script-src-attr 'unsafe-hashes' 'sha256-…'` : seul le gestionnaire SSR de `@nuxt/image`
    2.0.0 (`onerror="this.setAttribute('data-error', 1)"`) en a besoin ; `'none'` le cassait. À
    recalculer à chaque mise à jour de `@nuxt/image` :
    `printf '%s' "<gestionnaire>" | openssl dgst -sha256 -binary | base64`.
  - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` : les formulaires sont en
    `@submit.prevent` avec un `$fetch` de même origine, et Stripe Checkout est une navigation de
    premier niveau, donc aucune origine Stripe n'est nécessaire.
  - Pas de `font-src` ni de `wss:` : polices auto-hébergées (`/_fonts`), images servies par ipx
    (`/_ipx`), pas de Supabase realtime. `blob:` dans `img-src` : aperçus de photos.
- `Permissions-Policy` coupe caméra, micro, géolocalisation et paiement (l'envoi de photos Pro
  est un champ fichier simple). `Cross-Origin-Opener-Policy: same-origin`. `-Via` et
  `-X-Powered-By` s'ajoutent à `-Server`.
- Journaux d'accès : le filtre `format filter` retire le paramètre `q` (adresse saisie sur
  `/api/address/search`) et masque les IP en /24 et /48 (`remote_ip`, `client_ip`,
  `X-Forwarded-For`, `Cf-Connecting-Ip`). Caddy masque déjà `Cookie` et `Authorization`.
- **La CSP n'existe que derrière Caddy** : `bun run dev` et la suite e2e normale ne la voient
  jamais. Toute nouvelle origine tierce se déclare dans `deploy/Caddyfile`, puis on rejoue
  `CADDY_BASE_URL=https://localhost:8443 bun run test:e2e -- tests/e2e/infra` contre la pile
  Docker locale. Le test couvre la réservation avec le retour de Stripe Checkout, l'espace client
  et l'espace Pro.
- Risque résiduel accepté en V1 : voir « Points ouverts » (`script-src 'unsafe-inline'`).
- Le volume `/data` de Caddy doit être persisté (certificats ; Let's Encrypt limite à 5
  certificats identiques par semaine).

### Image Docker et Compose

- `Dockerfile` en trois étapes. Le binaire `bun` vient de `oven/bun:1.2.14-slim` et est copié dans
  `node:24.22.1-trixie-slim` : le build tourne ainsi sur le Node d'exécution. `COPY . .` précède
  `bun install --frozen-lockfile` car `postinstall` lance `nuxt prepare` ; le cache de bun est un
  cache mount. Build avec `NODE_ENV=production` et `NITRO_PRESET=node-server`. L'étape finale ne
  copie que `.output` et tourne en `USER node`.
- `Dockerfile` et `.dockerignore` restent à la racine : le contexte de build est tout le dépôt, et
  Docker lit `.dockerignore` à la racine du contexte.
- `.dockerignore` exclut notamment `.env*`, `tests`, `docs`, `supabase`, `.git` et le dossier
  `deploy` entier, mais garde `!tests/tsconfig.json` : le `tsconfig` racine le référence. Les
  motifs sont relatifs à la racine : les lignes `.env` et `.env.*` n'excluraient pas
  `deploy/.env`, d'où l'exclusion de tout `deploy`. Vérifié : un `deploy/.env` n'entre jamais dans
  le contexte de build. `deploy/.env` est aussi ignoré par Git (`.gitignore`, `.env` vaut à toute
  profondeur).
- Aucune valeur `NUXT_*` n'est figée dans l'image : tout se surcharge à l'exécution.
  `i18n.baseUrl` vaut `""` dans l'image et vient de `NUXT_PUBLIC_I18N_BASE_URL`. Toute variable
  présente au `nuxt build` serait cuite dans `.output` (voir étape 11 du `TODO.md`).
- Image à construire en `linux/amd64` pour un VPS amd64 : les binaires natifs de `sharp` suivent
  la plateforme du build (le Mac de développement est en arm64).
- `deploy/docker-compose.yml` : `name: binovya` fixe le nom du projet. Sans lui, Compose prendrait
  le nom du dossier : déplacer ou renommer `deploy/` créerait des volumes vides et obligerait
  Caddy à redemander des certificats Let's Encrypt. Volumes et conteneurs gardent donc
  `binovya_caddy_data`, `binovya_caddy_config`, `binovya-nuxt-1`… où que soit le dossier.
  `IMAGE_TAG` obligatoire (`:?`), `pull_policy: missing`, pas de `build:`
  (le VPS ne construit jamais). `nuxt` a un healthcheck sur `/robots.txt` ; `caddy` attend
  `service_healthy`. `nuxt` tourne en `read_only` avec `tmpfs /tmp`, `cap_drop: ALL` et
  `no-new-privileges`. Seul `caddy` publie des ports (80, 443 et 443/udp).
- Journaux : `json-file`, 10 Mo × 5 fichiers par service. La rétention est bornée par la taille,
  pas par le temps : la durée est à indiquer dans la politique de confidentialité.
- Variables propres à Compose : `IMAGE_TAG`, `SITE_DOMAIN` (défaut `binovya.com`), `HSTS_MAX_AGE`
  (défaut 31536000), `CADDY_HTTP_PORT` (80), `CADDY_HTTPS_PORT` (443).
- **Un seul fichier `deploy/.env`**, à côté de `docker-compose.yml`. Il porte les variables de
  l'application (`NUXT_*`) et celles propres à Compose. Le `.env.example` de la racine les liste
  toutes (une seule liste, gardée à la racine). Compose résout `./Caddyfile` et `env_file: .env`
  depuis `deploy/` et lit `deploy/.env` pour ses propres `${…}`. `--env-file` ne nourrit que
  cette interpolation : le conteneur `nuxt` lit toujours `deploy/.env` par `env_file`. Tout le
  `.env` va donc à `nuxt`.
- Sur le VPS : copier `deploy/` et créer `deploy/.env`, rien d'autre du dépôt (le code arrive par
  l'image GHCR). `docker compose restart` ne relit pas `.env` ; `docker compose up -d` recrée le
  conteneur. Le déploiement automatique n'écrit `IMAGE_TAG` dans `.env` qu'après un `up` réussi
  (voir « CI/CD »).

**Pile locale** (depuis `deploy/`, avec un `deploy/.env` temporaire) :

1. Depuis la racine : `docker build -t ghcr.io/mehdidiasgomes/binovya:local .`
2. Dans `deploy/.env`, `IMAGE_TAG=local`, `SITE_DOMAIN=localhost` (CA interne de
   Caddy, `ignoreHTTPSErrors` côté Playwright), `HSTS_MAX_AGE=0` (sinon le navigateur peut
   épingler HSTS sur `localhost` et casser `bun run dev`), `CADDY_HTTP_PORT=8080` et
   `CADDY_HTTPS_PORT=8443` si 80 et 443 sont pris, et les trois URL du site sur
   `https://localhost:8443`.
3. En mode production, les mails partent vraiment par Resend (ni `NUXT_MAIL_REDIRECT_TO`, ni
   outbox) : ne jamais soumettre un formulaire qui envoie un mail contre cette pile, sauf pour
   tester un vrai mail vers sa propre adresse. Le testeur a utilisé une fausse
   `NUXT_RESEND_API_KEY`.
4. Lancer `cd deploy && docker compose up -d`. En fin de test : `docker compose down -v`, puis
   supprimer `deploy/.env`.
5. Limite locale connue : les redirections de Caddy perdent le port non standard
   (`Location: https://localhost/`). Sans effet en production sur 443.
6. Relais des webhooks Stripe vers le conteneur, depuis la racine du dépôt :

   ```bash
   STRIPE_API_KEY=$(grep '^NUXT_STRIPE_SECRET_KEY=' deploy/.env | cut -d= -f2-) \
     stripe listen --forward-to https://localhost:8443/api/stripe/webhook --skip-verify
   ```

   Copier le `whsec_…` affiché dans `NUXT_STRIPE_WEBHOOK_SECRET` de `deploy/.env`, puis recréer
   le conteneur (`cd deploy && docker compose up -d`). La clé passe par la variable
   d'environnement `STRIPE_API_KEY`, jamais en argument (elle apparaîtrait dans `ps` et
   l'historique du shell). `--skip-verify` : le certificat de Caddy pour `localhost` vient de sa
   CA interne.

7. Piège : un `stripe listen` sans `STRIPE_API_KEY` utilise le compte auquel le CLI est connecté,
   qui peut ne pas être celui du site. Il ne voit alors aucun paiement et rien n'arrive à Caddy.
   Contrôle : comparer le compte de la clé à `stripe config --list` (`account_id`), ou vérifier
   que le `whsec_…` affiché change quand `STRIPE_API_KEY` est posée. Les scripts de test évitent
   ce piège avec `scripts/stripe-key.ts` (`STRIPE_API_KEY`).
8. Dans le conteneur (build de production), l'alerte admin « Nouvelle réservation payée » part à
   `NUXT_CONTACT_EMAIL_TO` et le mail de confirmation au vrai destinataire, sans redirection :
   n'utiliser que ses propres adresses.

**Vérifié à la main (étape 10)** :

- 2026-10 : le parcours de connexion complet dans la pile locale, avec une vraie clé Resend posée
  temporairement dans le conteneur. Le mail du lien magique est arrivé, son lien pointait vers
  `https://localhost:8443` et la session s'est ouverte à travers Caddy.
- 2026-10-22 : la connexion admin de l'espace Pro dans le conteneur.
- 2026-10-22 : le paiement complet dans la pile locale. Réservation, Stripe Checkout (mode test,
  carte 4242…), `checkout.session.completed` relayé par le CLI Stripe jusqu'au conteneur à
  travers Caddy, réservation passée à payée, mail de confirmation au client et alerte admin
  envoyés par Resend.

**Non prouvé à ce jour** : la valeur HSTS d'un an dans un navigateur (la pile locale la met à 0),
l'image amd64 sur un vrai VPS, une vraie photo de téléphone, un vrai passage au lecteur d'écran.

## CI/CD

Tout est dans `.github/workflows/ci.yml` (trois jobs) et `.github/dependabot.yml`. Écrit à
l'étape 11 ; le CD n'a **jamais tourné** : premier déploiement réel à l'étape 12.

**Déclencheurs** : push sur `main` et `dev`, et toute `pull_request`. Un seul run par référence
(`concurrency: ci-<ref>`) : un nouveau push annule le run en cours, sauf sur `main`. Permissions
par défaut `contents: read`.

**Job `check`** (tous les déclencheurs) : Node 24.22.1 (`actions/setup-node`), Bun 1.2.14
(`oven-sh/setup-bun`), `bun install --frozen-lockfile`, puis `lint`, `format:check`, `typecheck`,
`test:unit` et `build`. Ce job ne reçoit aucun secret et aucune variable `NUXT_*` : tout ce qui est
présent au `nuxt build` serait cuit dans `.output`. Vérifié par le testeur : l'image `linux/amd64`
(301 Mo) ne contient ni `.env*`, ni clé Resend, Stripe ou JWT, et la configuration d'exécution est
faite de chaînes vides. `check` est aussi le contrôle requis par les rulesets (voir plus bas).

**Job `image`** (push sur `main` ou `dev`, après `check`) : `packages: write`, buildx
`linux/amd64`, push vers GHCR (`ghcr.io/mehdidiasgomes/binovya`, en minuscules). Il expose le
`digest` de l'image.

| Tag               | Branche | Usage                                               |
| ----------------- | ------- | --------------------------------------------------- |
| `dev-<sha>`       | `dev`   | Image de la branche d'intégration, jamais déployée  |
| `<sha>` (40 car.) | `main`  | Repère lisible du commit déployé                    |
| `latest`          | `main`  | Repère pour un humain, jamais utilisé pour déployer |

- Un tag GHCR est **mutable** : seul le digest (`sha256:…`) est immuable. Le déploiement se fait
  donc par digest, jamais par tag seul.
- Cache : `main` construit sans cache (`no-cache`), pour qu'un cache empoisonné depuis une autre
  branche n'entre pas dans l'image de production. `dev` utilise le cache GHA (`scope=image`).

**Job `deploy`** (push sur `main` uniquement, après `image`) : tourne seulement si la variable de
**dépôt** `DEPLOY_ENABLED` vaut `true`. Ce doit être une variable de dépôt et non d'environnement :
le `if` du job est évalué avant l'entrée dans l'environnement. Environnement `production`,
`concurrency: deploy-production` sans annulation (deux déploiements ne se croisent jamais).

- Secrets, tous dans l'environnement `production` et aucun au niveau du dépôt : `SSH_HOST`
  (nom d'hôte ou IPv4, validé par regex, pas d'IPv6 brute), `SSH_USER`, `DEPLOY_PATH` (chemin
  absolu, pas de `~`), `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS` (sortie de `ssh-keyscan` vérifiée
  par un autre canal). Le job refuse de continuer si l'un manque, et valide par regex le SHA
  (40 hexadécimaux) et le digest.
- SSH avec `StrictHostKeyChecking=yes`, `IdentitiesOnly`, `BatchMode`. La clé est écrite dans
  `$RUNNER_TEMP` et supprimée en fin de job (`if: always()`).
- Seul le dossier `deploy/` est récupéré (`sparse-checkout`). `IMAGE_TAG` vaut
  `<sha>@sha256:<digest>`.

**Déroulé sur le VPS** (`$DEPLOY_PATH`, qui contient déjà `.env`) :

1. `docker-compose.yml` et `Caddyfile` sont copiés par `scp` dans `.incoming/`.
2. Sauvegarde : les fichiers actuels vont dans `.previous/`, **seulement** si `.previous/.ok`
   existe (le dossier contient alors une configuration qui a démarré) ou au premier déploiement.
   Sinon un déploiement raté écraserait la dernière bonne version. La copie passe par
   `.previous.tmp`, puis un échange.
3. Les fichiers de `.incoming/` remplacent ceux du dossier.
4. `docker compose pull` avec `IMAGE_TAG=<sha>@sha256:<digest>` en variable du shell (le `.env`
   n'est pas encore modifié).
5. Si le `Caddyfile` a changé (ou si `.previous/.ok` n'existe pas) :
   `docker compose run --rm --no-deps -T caddy caddy validate …`. La validation est hors ligne
   (prouvé par le testeur avec `--network none`) et un `Caddyfile` cassé sort en erreur 1.
6. `docker compose up -d --wait --wait-timeout 180`, avec `--force-recreate` si le `Caddyfile` a
   changé (redémarrage de Caddy d'environ 1 s).
7. Succès : `IMAGE_TAG=<sha>@sha256:<digest>` est écrit dans `.env` et `.previous/.ok` est créé.
8. Échec à l'une des étapes 4 à 6 : les fichiers sont restaurés depuis `.previous/`, `up` est
   relancé sur l'ancien `IMAGE_TAG` du `.env`, et le job sort en erreur.

Pourquoi `--force-recreate` : le hash de configuration de Compose couvre le chemin du `Caddyfile`,
pas son contenu, et un bind mount d'un fichier unique garde l'ancien inode après un `mv`. Sans
recréation, un changement de `Caddyfile` ne serait jamais servi. Pourquoi `.env` en dernier : un
déploiement qui échoue ne laisse jamais un `IMAGE_TAG` inutilisable pour le prochain `up`.
Un déploiement provoque une courte fenêtre de 502 pendant la recréation de `nuxt`.

**Rollback manuel** : mettre dans `deploy/.env` un ancien `IMAGE_TAG` **complet**
(`<sha>@sha256:<digest>`), puis `docker compose up -d --wait`. Le digest se lit dans la ligne
« Deploying … » du journal du job `deploy`, ou avec
`docker buildx imagetools inspect ghcr.io/mehdidiasgomes/binovya:<sha>`. `.previous/` garde les
fichiers Compose précédents. Ne jamais revenir en arrière par le tag seul. Relancer un ancien job
`deploy` redéploie aussi son digest.

**Dependabot** (`.github/dependabot.yml`) : mensuel, `target-branch: dev`, `cooldown` de 7 jours.
Écosystèmes : `github-actions` (`/`), `docker` (`/`, le `Dockerfile`) et `docker-compose`
(`/deploy`, en ignorant l'image de l'application `*mehdidiasgomes/binovya`). Pas d'écosystème JS en
V1 (périmètre réduit).

- Les mises à jour de **sécurité** ignorent `target-branch` et `cooldown` : leurs PR visent
  `main`. À traiter comme un correctif urgent : fusionner dans `main` quand `check` est vert,
  puis fusionner `main` dans `dev` aussitôt.
- Les versions de Bun (`bun-version` dans `ci.yml`, `oven/bun` dans le `Dockerfile`) et de Node
  (24.22.1 dans les deux) sont écrites à deux endroits : les monter ensemble.
- Les actions sont épinglées par SHA de commit complet, sans commentaire de version (le projet
  interdit les commentaires).

**Réglages GitHub manuels** (hors dépôt, à faire à l'étape 12) :

- Environnement `production` limité à la branche `main`, avec les 5 secrets ; aucun secret au
  niveau du dépôt.
- Variable de dépôt `DEPLOY_ENABLED` à `true` **seulement** quand le VPS est prêt.
- Paquet GHCR `binovya` privé, accès Actions limité à ce dépôt. Sur le VPS, `docker login
ghcr.io` avec un jeton en lecture seule (`read:packages`), stocké pour le seul utilisateur de
  déploiement.
- Rulesets sur `main` et `dev` : pas de force-push ni de suppression, contrôle d'état requis
  `check`.
- Réglages Actions : permissions du `GITHUB_TOKEN` en « Read repository contents », « Allow
  GitHub Actions to create and approve pull requests » décoché, approbation requise pour les
  contributeurs extérieurs.
- Alertes Dependabot et mises à jour de sécurité, secret scanning avec push protection, 2FA sur
  le compte.

Les tests d'intégration et e2e restent en local avant chaque fusion (ils utilisent la base et le
compte Stripe de test). Typecheck : `vue-tsc` est en devDependency et le script `typecheck`
(`nuxt typecheck`) vérifie l'app, le serveur et `tests/` : `tests/tsconfig.json`, référencé par
le `tsconfig.json` racine, couvre aussi `scripts/`, `playwright.config.ts` et `vitest.config.ts`.
Le job `check` lance ce script (`bun run typecheck`).

## Tâches planifiées

| Tâche                                                         | Outil                       |
| ------------------------------------------------------------- | --------------------------- |
| Libérer les réservations non payées (`expire_stale_bookings`) | `pg_cron`, toutes les 5 min |
| Mail de rappel (`booking:reminders`)                          | Tâche Nitro, `0 6 * * *`    |

`expire-stale-bookings` (`*/5 * * * *`) appelle `public.expire_stale_bookings()`.

### Rappel par mail

- Tâche Nitro (`server/tasks/booking/reminders.ts`), pas `pg_cron` : le mail part de Node avec
  Resend. Planifiée dans `nuxt.config.ts` à `0 6 * * *`, heure du processus (UTC dans Docker,
  donc 7 h ou 8 h à Paris) ; la date cible est calculée en Europe/Paris.
- Fenêtre J-1 à J-2 : réservations `paid` dont `scheduled_date` tombe demain ou après-demain et
  dont `reminder_sent_at` est vide (J-1 rattrape un paiement tardif ou un échec de la veille).
- Utilise `createServiceRoleClient()` (`server/utils/supabaseServiceClient.ts`), un mail toutes les
  600 ms au plus (limite de débit Resend), puis remplit `reminder_sent_at` (seulement s'il est
  vide et si la date annoncée est toujours la bonne). Une seule instance Nuxt doit tourner. Un
  déplacement admin remet `reminder_sent_at` à zéro.
- La planification n'existe que dans un build de production. En dev : `GET
/_nitro/tasks/booking:reminders`.

## Variables d'environnement

| Variable                     | Usage                                                     |
| ---------------------------- | --------------------------------------------------------- |
| `NUXT_PUBLIC_SUPABASE_URL`   | URL du projet Supabase                                    |
| `NUXT_PUBLIC_SUPABASE_KEY`   | Clé publique Supabase                                     |
| `NUXT_SUPABASE_SECRET_KEY`   | Clé secrète Supabase, serveur uniquement                  |
| `NUXT_RESEND_API_KEY`        | Envoi des mails                                           |
| `NUXT_MAIL_FROM`             | Expéditeur des mails (repli : `contact@dg-zenith.com`)    |
| `NUXT_MAIL_TRANSPORT`        | `resend` (défaut) ou `outbox` (dev et tests seulement)    |
| `NUXT_MAIL_OUTBOX_DIR`       | Dossier de l'outbox (défaut : `.mail-outbox`)             |
| `TEST_MAIL_OUTBOX_DIR`       | Tests seulement : outbox vidée par le runner (voir Tests) |
| `NUXT_CONTACT_EMAIL_TO`      | Contact, alerte de réservation payée, `replyTo` clients   |
| `NUXT_STRIPE_SECRET_KEY`     | Paiement                                                  |
| `NUXT_STRIPE_WEBHOOK_SECRET` | Vérification des webhooks Stripe                          |
| `NUXT_SITE_URL`              | URL publique : Stripe, liens des mails, `Origin` (https)  |
| `NUXT_PUBLIC_SITE_URL`       | Sitemap et robots, même origine que `NUXT_SITE_URL`       |
| `NUXT_PUBLIC_I18N_BASE_URL`  | Canonical et hreflang, même origine que `NUXT_SITE_URL`   |
| `NUXT_ADDRESS_TOKEN_SECRET`  | Signature des adresses (32 caractères minimum)            |

- Les secrets serveur portent le préfixe `NUXT_` et sont lus à l'exécution (`runtimeConfig`) : rien
  n'est figé dans l'image Docker.
- `NUXT_ADDRESS_TOKEN_SECRET` : `openssl rand -base64 48`. Absent ou trop court, la recherche
  d'adresse, les disponibilités, la réservation et le devis répondent 500 (le journal nomme la
  variable, jamais sa valeur).
- Production : les trois variables d'URL à `https://binovya.com`, clés Stripe LIVE, `NUXT_MAIL_FROM` une fois le domaine
  vérifié, clés Supabase de production, `NUXT_MAIL_TRANSPORT` absent.
- Stripe en local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`, `whsec_` dans
  `NUXT_STRIPE_WEBHOOK_SECRET`. En production : endpoint du Dashboard vers `/api/stripe/webhook`
  avec `checkout.session.completed` et `checkout.session.expired`.

## Tests

Pyramide : beaucoup de tests unitaires, quelques tests d'intégration, peu de tests e2e. Seuls les
unitaires tournent en CI (job `check`) ; intégration et e2e (vraie page Stripe) restent locaux
avant chaque fusion.
Dernier relevé (2026-10-22, branche `feat/infrastructure`) : unitaires 1 477, intégration 515
(run complet précédent), e2e 64 réussis sur Chromium et WebKit, soit 32 par projet, 36 tests Caddy
ignorés sans `CADDY_BASE_URL` (8,6 min, `workers: 1`).

L'e2e ne couvre que les parcours critiques : réservation publique payée par la vraie page Stripe
Checkout (annulation et expiration, une réservation en attente par client, carte refusée), lien
magique, réservations et suppression du compte (avec un test de focus clavier), accès Pro,
planning, déplacement (clavier et état d'attente compris), fin d'intervention avec photos,
création Pro (paiement hors ligne, lien de paiement et renvoi, recréation préremplie), une
sauvegarde de disponibilités, envoi du contact, brouillon par jeton d'adresse, sélecteur de langue
(`language-switcher.spec.ts`). Le reste (mise en
page, survol, détails d'interface) relève des tests unitaires, d'intégration et des vérifications
à la main (`TODO.md`, étape 8). Une suite plus large (129 tests) a été réduite : trop lente et
trop instable.

### Commandes

- `bun run test` : unitaires, intégration, e2e, autonome (pas besoin de `bun run dev` ni de
  `stripe listen`). `test:integration` et `test:e2e` passent par `scripts/test-run.ts`, qui
  démarre sa propre infrastructure, sauf si un serveur lancé par `bun run test:server` est
  réutilisable. `test:unit` n'a besoin d'aucun serveur. `TEST_PORT=… bun run test` change le port
  (entier positif). Le script accepte des étapes en argument (`unit`, `integration`, `e2e`).
- Avec une seule étape, le reste des arguments va tel quel à Vitest ou Playwright
  (`bun run test:e2e -- --grep "…"`). Avec plusieurs étapes, le script refuse.
- Le script arrête tout à la fin (Ctrl+C compris). Le `bun run dev` du port 3000 n'est pas touché.
- Modules de `scripts/` : `test-run.ts`, `test-args.ts`, `test-process.ts`, `test-infra.ts`,
  `test-lock.ts`, `test-server-state.ts`, `test-server.ts`.

### Serveur gardé chaud et verrou

- `bun run test:server` démarre le serveur de test (3001) et son `stripe listen`, les garde jusqu'à
  Ctrl+C. Pourquoi : le démarrage à froid de Nuxt coûte du temps (un test e2e : 30 s à froid, 13 s
  chaud). État dans `.cache/test-server.json` (pids, port, outbox, sans secret).
- Un run ne le réutilise que si le fichier est valide, le port est tenu par son groupe de
  processus, son listener Stripe est vivant, l'outbox est dans `.mail-outbox/` et `GET /` répond 200. Le serveur de dev n'est jamais réutilisé. Le run vérifie le listener chaque seconde.
- Les deux terminaux doivent utiliser la même clé de test Stripe. Après un changement d'auto-imports
  (nouveaux composables ou utilitaires), relancer le serveur de test.
- Verrou `.cache/test-run.lock` : un seul run à la fois (serveur et outbox partagés). Un verrou
  périmé est remplacé ; le message donne le pid à arrêter.

### Infrastructure du run

- Serveur de test sur `TEST_PORT` avec `BINOVYA_TEST_SERVER=1` : dossier de build `.nuxt-test` et
  cache Vite `node_modules/.cache/vite-test`.
- Imposés au serveur : `NUXT_MAIL_TRANSPORT=outbox`, `NUXT_MAIL_OUTBOX_DIR`,
  `NUXT_CONTACT_EMAIL_TO=admin@binovya.test`, `NUXT_SITE_URL` sur le port de test.
- Outbox de test : `TEST_MAIL_OUTBOX_DIR` (défaut `.mail-outbox/test-run`, `TEST_OUTBOX_DIR` de
  `scripts/test-outbox.ts`), pas `NUXT_MAIL_OUTBOX_DIR` (Bun charge `.env.local` : un réglage de
  développement aurait été vidé par le `rm -rf` du script). `resolveTestOutboxDir` exige un chemin
  strictement dans `<projet>/.mail-outbox/`, sinon code 1. Vidé à chaque run.
- Son propre `stripe listen` (secret via `--print-secret`). Si un autre `stripe listen` tourne, le
  script refuse : le serveur de dev recevrait les paiements de test et enverrait de vrais mails.
- Clé Stripe (`scripts/stripe-key.ts`) : `STRIPE_API_KEY`, sinon `NUXT_STRIPE_SECRET_KEY`, uniquement
  `sk_test_`, transmise par l'environnement, jamais par `--api-key` (une clé a déjà fuité dans un
  `ps`).
- `vite.optimizeDeps.include` et `tests/e2e/global-setup.ts` (visite de chaque page) évitent qu'un
  rechargement de Vite coupe un test.

### Organisation

- `tests/{unit,integration,e2e}/<domaine>/` (domaines `account`, `booking`, `contact`, `email`,
  `pro`, `seo`, `shared`, `scripts`), kebab-case. Le domaine `seo` couvre les chemins, le XML, les
  pages privées en `noindex`, le sitemap, le `robots.txt` et le `<head>` des pages
  (`tests/unit/seo/`, `tests/integration/seo/`). Aides dans `tests/support/` ; e2e dans
  `tests/e2e/support/`.
- Un test d'intégration par gabarit de mail (`tests/integration/email/`), lisant l'outbox. Un seul
  appel à Resend : `resend-smoke.test.ts` (`GET /domains`, lecture seule, ignoré sans clé).
- Clients créés par les tests : `e2e+…@binovya.test`, nettoyés par ce motif.
- Les tests de rappels (`booking-reminders.test.ts`, `booking-reminder.test.ts`) refusent de
  tourner si une vraie réservation payée est dans la fenêtre J+1..J+2 (la tâche la traiterait et
  le client ne recevrait jamais son rappel).
- Playwright : `actionTimeout` 10 s, `expect` 5 s. `restoreViewport`
  (`tests/e2e/support/booking.ts`) : Chromium peut réduire la fenêtre à 0×0 au deuxième retour de
  Stripe.
- Capacité (`booking-capacity.test.ts`) : journée pleine = 409 `dayTaken`, refus de secteur au-delà
  de 15 km de la première réservation, cinq requêtes simultanées sur la dernière place = une seule
  réussit.
- Session admin partagée en e2e : le setup global crée `e2e+pro-shared-admin@binovya.test`,
  enregistre `tests/e2e/.auth/admin.json`, et `signInAdmin(page)` la réutilise ; le teardown
  supprime le compte. Les tests qui visent l'accès ou la déconnexion créent leur propre session.
- Cookie de session : `supabase.cookieOptions.secure = process.env.NODE_ENV === 'production'`
  dans `nuxt.config.ts`, évalué au build (`nuxi` force `production` au build et `development` en
  dev ; `sameSite: 'lax'` et `maxAge` de 8 h inchangés). Pourquoi : WebKit refuse un cookie
  `Secure` sur `http://localhost` et perdait la session. Le démarrage en production refuse un
  cookie non Secure (voir « URL du site »).
- WebKit : projet Playwright `webkit` rétabli. WebKit applique le réglage par défaut de Safari où
  Tab saute les boutons et les liens : les tests clavier sur WebKit utilisent `Alt+Tab` et
  `Alt+Shift+Tab` (voir `tests/e2e/pro/pro-reschedule.spec.ts`) ; `body` est toléré,
  mais le focus doit se trouver au moins une fois dans le dialogue pour chaque touche.
- Volume au 2026-10-22 : 1477 tests unitaires, 515 d'intégration, 64 e2e réussis sur deux projets
  (32 par projet) plus 36 tests Caddy ignorés sans `CADDY_BASE_URL`. L'e2e complet dure environ
  8,6 min.
- CSP derrière Caddy : `tests/e2e/infra/csp-caddy.spec.ts` (18 tests par projet, ignorés sans
  `CADDY_BASE_URL`) et `tests/e2e/support/csp-monitor.ts` (relève les violations CSP, les erreurs
  de page et les requêtes bloquées). La liste des pages vient de `PUBLIC_PAGE_PATHS` ×
  `SEO_LOCALE_PATH_PREFIXES` plus `/login` et `/pro/login` (14 pages par projet), pour ne pas
  dériver des pages publiques ; s'y ajoutent le test du moniteur et trois parcours (réservation
  avec retour de Stripe Checkout, espace client, espace Pro). Passe du 2026-10-22 : 36/36, aucune
  violation CSP, 3,3 min. Lancement : voir « Caddyfile et CSP ».
- Aides e2e partagées : `STRIPE_BACK_LINK` (`tests/e2e/support/booking.ts`), `moreActions` et
  `waitForHydration` (`tests/e2e/support/pro.ts`, attend `$nuxt.isHydrating === false`, utilisé
  par `signInAdmin` et le test CSP), `CADDY_ORIGIN` (`tests/support/env.ts`).
- Limites connues : `bun run test:server` lancé pendant qu'un run à froid démarre encore Nuxt
  affiche le message « autre `stripe listen` » au lieu de celui du verrou ; course très rare sur un
  verrou périmé ; `TEST_PORT` au-dessus de 65535 ou vide non traité.

## Légal

- L'hébergeur du VPS et Supabase figurent dans les mentions légales.
- Les données restent dans l'UE, sauf Cloudflare (société américaine, déchiffre le trafic en
  transit), listé comme sous-traitant avec son DPA. Un DPA est signé avec chaque fournisseur.

## Points ouverts

- Choix du VPS et du fournisseur ; environnement de préproduction (branche `dev`) : oui ou non ?
- Conditions d'usage de l'API geoportail.lu (contacter support@geoportail.lu).
- Domaine `binovya.com` à vérifier sur Resend ; en attendant, repli `contact@dg-zenith.com`.
- `resolveSiteUrl` repose sur `parseSecureUrl` via `parseSiteUrl` et n'accepte http qu'en
  développement. Le seul écart restant : `emailSitePageUrl` accepte `http://localhost` en
  production. Assumé, à trancher.
- `has_recent_sign_in()` et `is_admin()` acceptent un timestamp d'`amr` en chaîne numérique (la
  regex de `oldest_link_sign_in_at()` ne vérifie pas le type JSON), alors que l'application exige
  un nombre. À trancher dans une migration.
- Sans `NUXT_SITE_URL`, `POST /api/booking` journalise deux fois l'erreur. Sans conséquence.
- La région `role="status"` de `/pro/availability` n'a pas d'`aria-live="polite"` explicite
  (inutile tant que la page n'ouvre aucun dialogue).
- Environ 81 durées de survol et d'appui ne passent pas encore par `duration-press` et
  `duration-lift`. Les anciens `STEP_OFFSET / 2` du site restent à migrer vers `FEEDBACK_OFFSET`.
- `NuxtImg` : ajouter `sizes` dès qu'une `MediaCard` affiche une image.
- `/contact/` (slash final) répond 200 sans redirection ; le canonical est sans slash. Faible.
- Safari avec Option+Tab peut sortir du dialogue de déplacement vers l'interface du navigateur
  après le dernier bouton (comportement voulu de reka-ui). Faible.
- Pas de contrôle de présence au démarrage pour `NUXT_SUPABASE_SECRET_KEY`,
  `NUXT_STRIPE_WEBHOOK_SECRET` et `NUXT_ADDRESS_TOKEN_SECRET` (V2).
- CSP : `script-src 'unsafe-inline'` laisse exécuter un `<script>` injecté. Risque accepté en V1.
  V2 : nonce par requête + `'strict-dynamic'`, la CSP passe alors de Caddy à Nitro.
- Textes qui promettent des « photos avant/après » (description SEO de `/login`, sous-titre du
  tableau de bord) : à relire avec le client.
- `@unhead/vue` est importé (types) dans `app/app.vue` sans figurer dans `package.json`.
  À déclarer ou à remplacer par un type fourni par Nuxt.
- `usePageSeo` type ses clés en `string` : une clé i18n erronée n'est pas détectée à la
  compilation.
- Contraste hors usage : le thème `.dark` donne `--secondary #0b7fb8` (environ 4,4:1 quel que soit
  le texte) et `app/components/ui/button/index.ts:18` met `hover:text-secondary` (environ 2,2:1).
  Aucun des deux n'est actif : le site n'active jamais `dark` et ce bouton shadcn n'est pas
  utilisé.
- Photos d'intervention : aucune purge, durée de conservation à décider (`TODO.md`, étapes 10 et 13).
- Tests instables : `booking-payment.spec.ts` n° 2 (le bouton « Payer » sort de la fenêtre sur la
  page Stripe) et n° 8 (délai de l'API d'adresse externe), délai ponctuel du nettoyage dans
  `account-deletion.test.ts`. Le détail de `customer-area-bookings` est stable depuis que le test
  attend la réponse réseau. À surveiller (`TODO.md`, étape 8) : `pro-create.spec.ts:156` (renvoi du
  lien de paiement parfois > 20 s sous charge), `customer-area.spec.ts:54` (7,4 s en run complet) et
  `pro-complete.test.ts:89` (0 mail une fois, vert 4 fois sur 4 seul). `tests/e2e/customer-area.spec.ts`
  approche 350 lignes (310).
- La branche « développement » de `isMailConfigured()` n'est testable qu'en intégration
  (`import.meta.dev` est figé à la construction).

## V2 (après le lancement)

Pas de détail ici tant que ces sujets ne sont pas planifiés (voir `TODO.md`).

- **Tournées** : cartes OpenStreetMap (Geofabrik Lorraine + Luxembourg), OSRM et VROOM, ordre
  optimisé dans le planning. En V1, la tournée suit l'ordre de la liste via le lien Google Maps.
- **Supervision** : Prometheus, Loki, Alloy, Grafana, node-exporter, cAdvisor, logs JSON de
  Nitro, durée de conservation des logs Loki (les IP sont des données personnelles). Pas de
  Sentry. Contrôle de disponibilité externe gratuit à poser dès le lancement (V1).
- **Sauvegardes** : V1 s'appuie sur les sauvegardes automatiques du plan Supabase Pro (25 $/mois),
  à convenir avec le client. Scripts maison (`pg_dump`, copie du bucket `intervention-photos`,
  chiffrement, envoi hors site, rétention, test de restauration) seulement si le client refuse
  Pro. Le VPS se reconstruit depuis Git et GHCR ; seul `deploy/.env` est à conserver à part.
- **Supabase reproductible** : script de provisionnement, `config.toml` et `config push`,
  `migration repair`, `rls_auto_enable` en migration.
- **Projet Supabase de test dédié à la CI** : intégration et e2e en CI, garde sur l'URL de test.
- **Anti-abus** : Cloudflare Turnstile, limites de débit détaillées par route.
- **Droits par défaut** : `revoke all … from anon` sur les autres tables, `alter default
privileges`, `references` et `trigger` sur `price_grid`, `booking_settings`, `quote_requests`.
- **SMS Brevo** (veille et jour J) et **abonnements récurrents**.

## Coûts estimés

> Prix relevés le 2026-10-14, à revérifier au moment de commander (hausses 2026 sur la RAM).

### Comparatif des VPS (V1 : Caddy + Nuxt)

| Offre               | vCPU | RAM       | Disque      | Datacenter UE       | Prix / mois                 | Remarques                                           |
| ------------------- | ---- | --------- | ----------- | ------------------- | --------------------------- | --------------------------------------------------- |
| **OVHcloud VPS-1**  | 4    | 8 Go      | 75 Go       | France              | **7,79 €** HT               | Société et datacenter français, support en français |
| Contabo Cloud VPS 4 | 4    | 8 Go      | 100 Go SSD  | Allemagne           | 5,50 € (4,40 € sur 24 mois) | Le moins cher, performances et support irréguliers  |
| netcup VPS 1000 G12 | 4    | 8 Go DDR5 | 256 Go NVMe | Allemagne, Autriche | 10,37 € TTC                 | Le plus de disque                                   |
| Hetzner Cloud CPX32 | 4    | 8 Go      | 160 Go      | Allemagne, Finlande | —                           | Plus commandable                                    |

Recommandation : OVHcloud VPS-1, 8 Go de RAM (données en France, prix proche du moins cher).

### Coûts mensuels fixes

| Poste                             | Lancement                        | Quand l'activité démarre                             |
| --------------------------------- | -------------------------------- | ---------------------------------------------------- |
| VPS (OVHcloud VPS-1)              | 7,79 € HT                        | 7,79 € HT                                            |
| Supabase                          | 0 € (Free)                       | 25 $ ≈ 22 € (Pro, sauvegardes quotidiennes incluses) |
| Resend                            | 0 € (3 000 mails/mois, 100/jour) | 20 $ ≈ 18 € (Pro, 50 000 mails/mois) si besoin       |
| GHCR, Géoplateforme               | 0 €                              | 0 €                                                  |
| Contrôle de disponibilité externe | 0 € (offre gratuite)             | 0 €                                                  |
| Domaine `binovya.com`             | Déjà acquis                      | Renouvellement annuel                                |
| **Total**                         | **≈ 8 € / mois**                 | **≈ 30 € / mois**                                    |

Plan Supabase Free : 500 Mo de base, 1 Go de fichiers, pause après une semaine sans activité,
aucune sauvegarde. Avec des photos d'environ 300 Ko, 1 Go représente environ 1 600 interventions.

### Coûts variables par réservation

| Poste                             | Coût                                        |
| --------------------------------- | ------------------------------------------- |
| Stripe, carte européenne standard | 1,5 % + 0,25 €                              |
| Stripe, carte européenne premium  | 2,8 % + 0,25 €                              |
| SMS Brevo (V2, France)            | ≈ 0,045 € par SMS, soit ≈ 0,09 € pour 2 SMS |

Frais Stripe (carte standard) : 0,69 € sur 29 €, 0,99 € sur 49 €, 1,75 € sur 100 €.

### Sources

- [OVHcloud, hausse des prix VPS 2026 (Digitiz)](https://digitiz.fr/hausse-prix-vps-2026/)
- [OVHcloud VPS-1 (VPSBenchmarks)](https://www.vpsbenchmarks.com/hosters/ovhcloud)
- [Contabo Cloud VPS](https://contabo.com/en/vps/)
- [netcup VPS G12 (Valebyte, juillet 2026)](https://valebyte.com/en/blog/netcup-review-2026-the-price-performance-king-and-its-fine-print/)
- [Hetzner, offres Regular Performance](https://www.hetzner.com/cloud/regular-performance/)
- [Supabase, tarifs](https://supabase.com/pricing)
- [Stripe France, tarifs](https://stripe.com/fr/pricing)
- [Resend, tarifs](https://resend.com/pricing)
- [Brevo, prix des SMS (Digitiz)](https://digitiz.fr/blog/logiciels-envoyer-sms-en-masse/)
