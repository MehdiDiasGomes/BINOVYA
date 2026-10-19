# Spec technique

> Statut : en cours de définition. Dernière mise à jour : 2026-10-17.
> Spec fonctionnelle associée : [booking-system.md](./booking-system.md).

## Vue d'ensemble

```
                         Internet
                            │
                     ┌──────▼──────┐
                     │ Cloudflare  │  DNS proxifié, WAF, DDoS, limites de débit par IP
                     └──────┬──────┘
                            │ ports 80/443 ouverts aux seules IP Cloudflare
                     ┌──────▼──────┐
                     │    Caddy    │  HTTPS automatique, seul service exposé (80/443)
                     └──────┬──────┘
                            │ réseau Docker public
                     ┌──────▼──────┐
                     │ Nuxt (Nitro)│  front + API serveur
                     └──┬───────┬──┘
        réseau interne  │       │
                ┌───────▼──┐ ┌──▼───────┐
                │  VROOM   │─▶  OSRM    │  tournées / distances routières
                └──────────┘ └──────────┘

   Prometheus · Loki · Alloy · Grafana · node-exporter · cAdvisor   (réseau interne)

   Services externes : Cloudflare · Supabase (UE) · Stripe · Resend · Brevo · Géoplateforme IGN · geoportail.lu
```

## Stack

| Couche                          | Choix                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| Front et API                    | Nuxt 4 (SSR, preset Nitro `node-server`), Tailwind CSS v4, shadcn-nuxt, i18n FR/EN |
| Gestionnaire de paquets         | Bun                                                                                |
| Base de données, auth, fichiers | Supabase hébergé, région UE (Postgres, Auth par lien magique, Storage, `pg_cron`)  |
| Paiement                        | Stripe Checkout + webhook                                                          |
| Mail                            | Resend, expéditeur `NUXT_MAIL_FROM` (repli : `BINOVYA <contact@dg-zenith.com>`)    |
| SMS                             | Brevo                                                                              |
| Distances routières             | OSRM                                                                               |
| Optimisation des tournées       | VROOM                                                                              |
| Hébergement                     | VPS européen, Docker Compose                                                       |

## Cartographie et tournées

- **Zone couverte par les cartes** : Lorraine + Luxembourg. Extraits OpenStreetMap Geofabrik
  (`europe/france/lorraine`, `europe/luxembourg`) fusionnés avec `osmium merge`.
- **OSRM** : profil voiture (`car.lua`), algorithme MLD. Le prétraitement des cartes se fait dans un job
  CI ou en local, puis le résultat est envoyé sur le VPS. Mise à jour mensuelle des cartes.
- **VROOM** : interroge OSRM pour la matrice des temps de trajet et ordonne les interventions
  du jour, départ et retour au dépôt. Déclenché depuis l'espace admin.
- **Zone desservie** : distance à vol d'oiseau autour du dépôt, à la demande du client.
- **Secteurs du jour** : vol d'oiseau, calculé en SQL dans `get_availability`.
- OSRM et VROOM ne sont jamais exposés à Internet : seul le serveur Nitro les appelle.

## Géocodage

| Pays       | Service                                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| France     | Géoplateforme IGN (Base Adresse Nationale), `data.geopf.fr/geocodage/search`, biaisé vers Uckange                            |
| Luxembourg | geoportail.lu, `apiv4.geoportail.lu/fulltextsearch`, couche `Adresse`, limité au sud du pays (conditions d'usage à vérifier) |

- Le client choisit le pays à côté du champ adresse. Un seul endpoint serveur
  (`/api/address/search?q=…&country=FR|LU`) interroge le service de ce pays. Le front ne
  connaît pas les fournisseurs.
- **Jeton d'adresse** : les coordonnées viennent du navigateur, un client pourrait sinon les
  falsifier pour contourner le rayon de 20 km et le secteur du jour. `/api/address/search`
  renvoie donc un `token` par suggestion (`server/utils/addressToken.ts`) ; les suggestions qui
  ne passent pas le schéma d'adresse sont écartées. Format `<expiresAt>.<mac>` : expiration en
  secondes Unix (24 h), puis HMAC-SHA256 en base64url de libellé, ville, code postal, pays,
  latitude, longitude et expiration, avec le contexte `binovya-address-v1`. La comparaison se
  fait avec `timingSafeEqual`.
- `requireSignedAddress` est appelé par `POST /api/booking`, `POST /api/quote` et
  `POST /api/booking/availability` : jeton absent, modifié ou expiré donne 400 `invalidAddress`.
- **Recherche de commune** : `/api/address/search` accepte `kind=address` (défaut) ou
  `kind=municipality`, pour le secteur imposé d'un jour (espace Pro). France : IGN avec
  `type=municipality`, libellé `<nom> (<code postal>)`. Luxembourg : pas d'appel externe, recherche
  dans la liste fixe `LUXEMBOURG_COMMUNES` (`server/utils/luxembourgCommunes.ts`, 27 communes à
  moins de 35 km du dépôt, au centroïde de leur limite officielle), sans accent ni casse, libellé
  `<nom> (LU)`, code postal vide. Le jeton a le même format mais le contexte
  `binovya-municipality-v1` : `requireSignedMunicipality` refuse un jeton d'adresse et
  `requireSignedAddress` refuse un jeton de commune. Un code postal vide n'est accepté que pour
  le Luxembourg (`municipalityDetailsSchema`, `signedMunicipalitySchema`).
- Disponibilités : `POST /api/booking/availability` (corps JSON, l'adresse signée, 4 Ko max).
  L'ancienne route GET est supprimée et répond 404 : un GET aurait mis les coordonnées dans l'URL
  et les journaux.
- Risque accepté (RGPD, décision de l'utilisateur du 2026-10-16, non planifié) :
  `get_availability` compare l'adresse à la position exacte de la première réservation du jour,
  la réponse `available` ou `outOfSector` sert d'oracle de distance (quelques dizaines de
  requêtes par cible, jeton signé requis). Un point d'ancrage arrondi a été jugé trop lourd.
  Atténué par la règle de limitation de débit Cloudflare de l'étape 12.
- Le téléphone a aussi un sélecteur de pays (+33, +352) : le client saisit son numéro national,
  le serveur reçoit et enregistre le format international (`+33612345678`).
- Avec 20 km à vol d'oiseau autour d'Uckange, seule une petite partie du Luxembourg est
  desservie (Rumelange, sud de Dudelange).
- La validation accepte les deux formats : code postal (5 chiffres FR, 4 chiffres LU) et
  téléphone (+33, +352).

## Demandes de devis

- Page `/quote`, point d'entrée unique de tout devis (particuliers, entreprises, collectivités),
  préremplie avec la réservation en cours (adresse, coordonnées, bacs). Les combinaisons sans
  tarif (3 bacs ou plus, 1 petit + 1 grand) y mènent depuis le parcours.
- Équipements : un ou plusieurs types parmi bacs, PAV, mobilier urbain, signalétique (enum
  `quote_equipment`, colonne `quote_requests.equipment`). Au moins un est obligatoire.
- Les nombres de bacs ne sont demandés que si « bacs » est coché, et valent 0 sinon. La règle
  est tenue des deux côtés : contrainte `quote_requests_bins_required` en base et
  `hasConsistentBins` (Zod, `app/utils/quoteValidation.ts`) côté serveur, pour qu'un appel
  direct à l'API ne puisse pas enregistrer un état incohérent.
- Une seule page de devis pour tous les publics : la page `/professionals` a été supprimée, et
  le bouton « Demander un devis » de l'accueil comme le lien « Devis » de la navigation mènent à
  `/quote`. La société reste facultative, bornée par `COMPANY_MAX_LENGTH`.
- Le bandeau `app/components/QuoteCtaSection.vue` (« Demander un devis » vers `/quote`, « Nous
  contacter » vers `/contact`) remplace l'ancien formulaire sombre `ProFormSection.vue`, supprimé
  de l'accueil. Le lien « Contact » de la navigation et les liens du
  parcours de réservation (adresse hors zone, aucune date) pointent vers `/contact`, plus vers
  `/#contact`.
- `POST /api/quote` reçoit un formulaire multipart : un champ `payload` (JSON validé par Zod) et
  jusqu'à 3 photos de 5 Mo.
- Taille plafonnée avant lecture du corps par `assertBodySize` (`server/utils/requestBody.ts`),
  partagé avec `/api/contact` : 3 photos × 5 Mo plus 64 Ko de multipart. Une requête sans
  `Content-Length` ou en transfert fragmenté (chunked) est refusée (411), car sa taille n'est pas
  annoncée et le plafond pourrait être contourné. Au-delà : 413.
- Les photos sont contrôlées sur leur signature réelle (JPEG, PNG, WebP), jamais sur le type
  déclaré par le navigateur, puis stockées dans le bucket privé `quote-photos`, un dossier par
  demande.
- La demande est enregistrée dans `quote_requests`, puis un mail part à BINOVYA via Resend, avec
  des liens signés valables 7 jours (constante unique `PHOTO_LINK_LIFETIME_DAYS`, reprise dans
  le texte du mail). Tout texte saisi est échappé dans le mail. Un échec d'envoi est journalisé
  sans bloquer le client : la demande est déjà en base.
- Anti-spam : champ piège invisible (`website`, longueur bornée par `HONEYPOT_MAX_LENGTH`),
  taille de requête plafonnée. Une limite de débit par IP reste à poser sur Cloudflare
  au déploiement (voir « Hébergement »).
- Accès : seul l'admin lit `quote_requests` (RLS), le public n'a aucun accès direct.

### Règles de validation partagées

- Réservation, devis et contact partagent `contactSchema` (`app/utils/bookingValidation.ts`) :
  prénom et nom de 2 à 80 caractères, e-mail de 254 caractères au plus, téléphone international
  FR/LU. `honeypotSchema` borne le champ piège.
- Les mails de contact et de devis passent par une mise en page commune
  (`app/templates/email/layout.ts` : `renderEmailLayout`, `emailField`, `emailContactFields`).

### Accessibilité des formulaires

- Après un envoi refusé, le focus passe au premier champ invalide dans l'ordre du DOM
  (`app/utils/focus.ts`). Les erreurs sont liées à leur champ par `aria-describedby` et
  `aria-invalid`.
- L'écran de succès `app/components/FormSent.vue` est commun au devis et au contact (il remplace
  `QuoteSent.vue`). Le libellé du champ piège (`HoneypotField.vue`) est traduit.
- Contrastes : `--primary` assombri à `#0975ab` (texte blanc 5,07:1), bordures de formulaire
  `ink/50`, anneaux de focus pleins, formule choisie marquée d'une icône coche (pas par la seule
  couleur).

## Formulaire de contact

- Page `/contact` (`app/pages/contact.vue`, `ContactForm.vue`, `useContactForm.ts`). Elle sert aux
  questions et aux demandes de rendez-vous, les devis passent par `/quote`.
- Champs : prénom, nom, société (facultative), e-mail, téléphone, objet (`meeting`, `info` ou
  `other`), message de `CONTACT_MESSAGE_MIN_LENGTH` (10) à `CONTACT_MESSAGE_MAX_LENGTH` (2000)
  caractères, champ piège `website`.
- `POST /api/contact` (`server/api/contact.post.ts`) valide le corps avec `contactRequestSchema`
  (`app/utils/contactValidation.ts`), le même schéma Zod que le formulaire. Un seul schéma pour
  les deux côtés évite qu'ils divergent : l'ancien formulaire envoyait des champs que l'API
  rejetait.
- Corps plafonné à 16 Ko par `assertBodySize` (voir « Demandes de devis »). Entrée invalide : 400.
- Champ piège rempli : l'API répond comme un succès sans rien envoyer, pour ne pas indiquer au
  robot qu'il a été repéré.
- Le mail part à `NUXT_CONTACT_EMAIL_TO` via `sendTransactionalEmail` (voir « Mails »), avec
  `replyTo` sur l'e-mail du client. Toutes
  les valeurs sont échappées en HTML. Contrairement au devis, rien n'est stocké en base : le mail
  est la demande.
- Erreurs : 503 si le transport de mail n'est pas prêt (`isMailConfigured()` : clé
  `NUXT_RESEND_API_KEY` absente avec Resend) ou si `NUXT_CONTACT_EMAIL_TO` manque, 502 si l'envoi
  échoue (Resend en erreur ou sans réponse après 5 s). Le client voit donc un échec plutôt qu'un faux
  succès.
- Une limite de débit par IP reste à poser sur Cloudflare.

## Mails

- Tous les envois passent par `sendTransactionalEmail` (`server/utils/mail.ts`), y compris le
  contact et le devis. Elle abandonne après 5 secondes, ne lève jamais d'erreur (elle renvoie
  `true` ou `false`) et ne journalise que le libellé de l'envoi, jamais d'adresse ni de nom. Un
  mail lent ou en échec ne bloque donc jamais le webhook Stripe ni la réponse au client.
- Expéditeur unique, `mailSender()` : `NUXT_MAIL_FROM`, avec repli sur
  `BINOVYA <contact@dg-zenith.com>` tant que `binovya.com` n'est pas vérifié sur Resend.
- `sanitizeEmailSubject` remplace les caractères de contrôle de tous les sujets, pour qu'un texte
  saisi ne puisse pas injecter d'en-tête. Le corps HTML est échappé par `escapeHtml`.
- Mails en français uniquement, quelle que soit la langue du site.
- Gabarits dans `app/templates/email/` : `layout` (mise en page commune), `labels` (textes),
  `bookingDetails` (bloc récapitulatif), `bookingCustomerEmails` (confirmation, rappel,
  remboursement, changement de date), `bookingAdminEmail` (alerte BINOVYA), `photosAvailableEmail`, `accountEmails`
  (lien de connexion client et admin, alerte de suppression), `contactEmail` et `quoteEmail`.
- Logique d'envoi dans `server/utils/bookingEmails.ts` et `server/utils/accountEmails.ts` : le
  client reçoit les mails avec `NUXT_CONTACT_EMAIL_TO` en `replyTo`.

| Mail                             | Déclencheur                                            |
| -------------------------------- | ------------------------------------------------------ |
| Confirmation au client           | Webhook, `confirm_booking_payment` renvoie `paid`      |
| Lien de connexion                | `POST /api/auth/login`, adresse connue et sous plafond |
| Lien de connexion admin          | `POST /api/pro/auth/login`, admin connu, sous plafond  |
| Alerte de suppression (admin)    | `POST /api/account/deletion-request`                   |
| Alerte admin (réservation payée) | Idem, à `NUXT_CONTACT_EMAIL_TO`                        |
| Annulation et remboursement      | Webhook, `refund_required` ou `not_payable`            |
| Rappel                           | Tâche `booking:reminders` (voir « Tâches planifiées ») |
| Changement de date               | `POST /api/pro/bookings/[id]/reschedule`, après succès |
| Photos disponibles               | `POST /api/pro/bookings/[id]/complete`, avec 2 photos  |

- Pas de mail de remboursement si la charge était déjà remboursée (`charge_already_refunded`) :
  un événement Stripe rejoué ne prévient pas deux fois.
- Clés d'idempotence Resend `booking-confirmation-<id>`, `booking-admin-alert-<id>`,
  `booking-refund-<id>`, `booking-reminder-<date>-<id>` (la date de l'intervention annoncée : une
  réservation déplacée reçoit un nouveau rappel), `booking-reschedule-<uuid>-<id>` (un uuid neuf par
  déplacement), `booking-photos-<id>` et
  `account-deletion-<id>-<heure de la demande>` (l'heure change après une demande remise à zéro,
  un nouvel essai envoie donc une nouvelle alerte). Resend les garde 24 heures. Le lien de
  connexion n'en a pas : chaque lien est unique.
- Le bouton « Réserver une autre date » du mail de remboursement pointe vers `/booking`, et le
  lien « Suivre ma réservation » du mail de confirmation vers `/login`, tous deux sur
  `NUXT_SITE_URL`, par `emailSitePageUrl` (`server/utils/bookingEmails.ts`). Cette fonction ne lève
  jamais d'erreur : un mail doit partir sans le lien plutôt que pas du tout. Elle passe par
  `parseSecureUrl` (https, ou http sur `localhost`), alors que `resolveSiteUrl` n'accepte http qu'en
  développement. La différence est assumée, voir « Points ouverts ».
- `sendPhotosAvailableEmail` (`server/utils/bookingEmails.ts`) est lancée par la route de fin
  d'intervention avec `event.waitUntil`, seulement quand la RPC `admin_complete_booking` renvoie
  `send_photos_mail`. Cette valeur n'est vraie qu'avec les deux photos, et au plus une fois par
  réservation : la RPC réserve `bookings.photos_notified_at` dans sa transaction, en plus de la clé
  Resend `booking-photos-<id>`. Un échec est journalisé et jamais retenté. Le bouton « Voir mes
  photos » mène à `/login` par `emailSitePageUrl` (option A, comme « Suivre ma réservation ») :
  jamais un lien de connexion ni une URL signée, donc hors du plafond de `claim_login_link`.
  `isAllowedLoginUrl` a été supprimée.

### Transport des mails

- `NUXT_MAIL_TRANSPORT` vaut `resend` (défaut, valeur vide comprise) ou `outbox`. Avec `outbox`,
  `sendTransactionalEmail` n'appelle pas Resend : elle écrit le mail dans un dossier local
  (`NUXT_MAIL_OUTBOX_DIR`, défaut `.mail-outbox`, relatif à la racine du projet). Les tests
  (qui y pointent par `TEST_MAIL_OUTBOX_DIR`, voir « Tests ») lisent ce dossier au lieu d'envoyer de vrais mails, ce qui supprime le quota Resend, les rebonds et
  les alertes qui arrivaient à l'adresse réelle.
- Un fichier JSON par mail (`MailOutboxRecord`) : `to`, `from`, `subject`, `html` (déjà finalisé
  par `finalizeEmailHtml`, donc tel que Resend le recevrait), `replyTo`, `idempotencyKey`,
  `logLabel`, `sentAt`. L'écriture est atomique (fichier temporaire puis `link`) : un lecteur ne
  voit jamais un fichier à moitié écrit.
- Idempotence : une clé déjà utilisée n'écrit pas un second fichier et l'envoi compte comme
  réussi, comme chez Resend. Le marqueur est un fichier `.keys/<sha256 de la clé>.key`, créé avec
  le drapeau `wx` (échec si présent), donc sans course entre deux envois simultanés. Il est
  supprimé si l'écriture du mail échoue.
- Le transport `outbox` n'est permis qu'en développement (`import.meta.dev`) ou sous Vitest
  (`NODE_ENV=test`), voir `isOutboxAllowed`. Nitro remplace `NODE_ENV` par `"production"` à la
  construction : un build de production ne peut donc jamais l'activer, même par erreur.
- Valeur inconnue (probablement une faute de frappe de `outbox`) : refusée en développement, où
  elle enverrait de vrais mails (aucun envoi, `isMailConfigured()` renvoie `false`) ; hors
  développement, repli sur Resend pour que les mails de production partent quand même, avec un
  avertissement.
- `server/plugins/mailTransportCheck.ts` journalise une erreur au démarrage hors développement si
  `outbox` ou une valeur inconnue est configuré.
- `isMailConfigured()` (utilisée par le contact et le devis) remplace le contrôle direct de la clé
  Resend : l'outbox n'a pas besoin de clé.
- Le dossier `.mail-outbox` est ignoré par git et bloqué par `vite.server.fs.deny`
  (`**/.mail-outbox/**`) : les mails contiennent des données personnelles et le serveur de dev
  ne doit jamais les servir. `tests/integration/email/outbox-access.test.ts` le vérifie.
- `NUXT_MAIL_TRANSPORT` doit être absent en production.

### Habillage BINOVYA

- `renderEmailLayout` (`app/templates/email/layout.ts`) habille tous les mails. Deux variantes :
  `customer` (défaut, en-tête centré, pour les mails au client) et `notification` (version
  compacte, avec une note en pied, pour les mails internes : contact, devis, alerte admin).
- Chaque mail a un préheader (texte d'aperçu de la boîte de réception), échappé comme le reste.
- Le logo est remplacé par le mot « BINOVYA » en texte. Les polices citent Montserrat et Quicksand
  puis retombent sur celles du système : aucune police n'est chargée depuis Google Fonts (RGPD).
- Couleurs : mot-symbole `#135a73`, primaire et bouton `#0975ab`, barre d'accent `#22c0de`, texte
  secondaire `#4a5d6e` (contraste AA), fond `#f4f9fb`, bloc de détails `#e8f4f8`.
- Le style tient dans un seul bloc `<style>` dans le code source. `finalizeEmailHtml`
  (`server/utils/mail.ts`), appelée par `sendTransactionalEmail`, le copie en attributs `style`
  avec `juice` au moment de l'envoi, car beaucoup de clients mail ignorent `<style>`. La media
  query (< 620 px) reste dans `<style>` pour les clients qui la gèrent.
- Pied de page : le marqueur `EMAIL_FOOTER_LINKS_SLOT` est remplacé à l'envoi par les liens tirés
  de `NUXT_CONTACT_EMAIL_TO` et `NUXT_SITE_URL`. Un lien manquant ou invalide est simplement omis.
- `parseSecureUrl` et `isPlausibleEmail` (`app/utils/link.ts`) n'autorisent que https, ou http sur
  `localhost` et `127.0.0.1`. Ils servent au pied de page, au bouton du mail de remboursement, au
  lien du site dans le mail photos et à `emailSitePageUrl`.
- Protections : `juice.codeBlocks` est vidé et `escapeHtml` échappe aussi `{` et `}`. Un texte de
  visiteur contenant `{{…}}` ou `JUICE_CODE_BLOCK_n_` provoquait une expansion exponentielle et
  pouvait faire planter le processus. Ne pas réactiver `codeBlocks`.
- En production, `NUXT_SITE_URL` doit commencer par `https://`, sinon le lien du site dans le
  pied de page et le bouton « Réserver une autre date » sont omis.
- Aperçu : aucun outil de prévisualisation n'est versionné. Le rendu se vérifie dans de vrais
  clients (Gmail, Outlook, Apple Mail), avec des envois de test `[Aperçu]` faits à la main.
- Limites connues :
  - Si Resend échoue au moment du paiement, la confirmation est perdue : il n'y a pas de nouvel
    essai.
  - Un rappel peut partir deux fois si l'écriture de `reminder_sent_at` échoue après l'envoi.
  - Le mail « photos disponibles » n'est jamais retenté : s'il échoue, la réservation est quand
    même terminée et `photos_notified_at` reste posé.

## Paiement

### Création de la réservation

- `POST /api/booking` (`server/api/booking/index.post.ts`) : corps plafonné à 16 Ko, validé par
  `bookingRequestSchema`. Il retrouve ou crée le client, appelle `create_booking` (place bloquée
  35 minutes), ouvre une session Stripe Checkout et renvoie `{ bookingId, amountTotalCents,
checkoutUrl }`. Le navigateur est ensuite redirigé vers `checkoutUrl`.
- Checkout (`server/utils/bookingCheckout.ts`) : carte uniquement, session de 31 minutes. Elle
  expire avant la fin de la place (35 minutes), pour qu'un paiement ne puisse pas aboutir sur une
  place déjà libérée. Clé d'idempotence `booking-checkout-<id>`.
- Le nom du produit vient de la clé i18n `booking.checkout.productName`, où `{plan}` est remplacé
  par `booking.plans.<plan>.title`. La description est la date en format long dans la langue du
  client.
- Retour sur `/booking?checkout=success` ou `?checkout=cancelled` (préfixe `/en` en anglais).
  `NUXT_SITE_URL` est obligatoire, en https hors développement : `assertCheckoutSiteUrl`
  (`server/utils/bookingCheckout.ts`) le vérifie dès le début de la requête, avant de créer quoi
  que ce soit, sinon 503 « Payment unavailable ». Les URL de retour sont construites par
  `localizedSiteUrl` (voir « Espace client »).
- Codes d'erreur : 409 `dayTaken`, 409 `pendingPayment`, 422 `outOfArea`, `quoteRequired`,
  `binsNotConfirmed`, et 400 `invalidAddress` (jeton d'adresse refusé, aussi sur `/api/quote`).
  Tout autre refus de `create_booking` donne 400 « Booking rejected ». Le code
  métier est lu par le front dans `data.code`. 502 si la création de la session échoue, 500 si le
  rattachement de la session à la réservation échoue : dans les deux cas la session est expirée
  et la réservation libérée.
- Un client n'a qu'une réservation `pending_payment` active : sinon 409 `pendingPayment`. Le
  contrôle se fait dans `create_booking` sous un verrou consultatif par client, pour que deux
  requêtes simultanées ne passent pas toutes les deux. Index
  `bookings_customer_id_status_expires_at_idx`.
- Anti-abus : champ piège `website`. S'il est rempli, l'API renvoie un faux succès qui redirige
  vers `?checkout=cancelled` et ne crée rien. Limite de débit par IP sur `/api/booking` et
  `/api/booking/release` : à poser sur Cloudflare (étape 10).

### Webhook Stripe

- `POST /api/stripe/webhook` (`server/api/stripe/webhook.post.ts`) : corps plafonné à 512 Ko,
  signature vérifiée avec `NUXT_STRIPE_WEBHOOK_SECRET` sur le corps brut. 503 si le secret manque,
  400 si la signature est absente ou invalide.
- `checkout.session.completed` : appelle `confirm_booking_payment`, qui verrouille la réservation
  et compare la session et le montant. Réservation encore valable : `paid`. Réservation expirée
  par le cron ou par l'expiration de la session : elle passe `paid` si le jour est encore
  disponible sous le verrou du jour, sinon le webhook la passe `cancelled` et rembourse. Un
  paiement sur une réservation déjà `cancelled` est remboursé.
- `checkout.session.expired` : `pending_payment` devient `expired`.
- Chaque mise à jour est conditionnée au statut courant et les remboursements ont une clé
  d'idempotence `booking-refund-<id>` : un événement rejoué ne change rien. Un échec renvoie 500,
  pour que Stripe rejoue l'événement.

### Libération d'une réservation abandonnée

- `POST /api/booking/release` (corps `{ bookingId }`, 1 Ko, réponse `{ isReleased }`) expire la
  session Stripe puis passe la réservation à `expired`. Si la session ne peut pas être expirée
  (par exemple déjà payée), rien n'est libéré. Une réservation payée n'est jamais touchée.
- Le front garde le brouillon et l'identifiant dans `sessionStorage` pendant la redirection
  (`useBookingCheckout.ts`). Au retour (`useBookingCheckoutReturn.ts`), la libération part dans
  trois cas : `?checkout=cancelled`, bouton Retour du navigateur (bfcache, événement `pageshow`),
  rechargement de `/booking` sans `?checkout` avec une entrée stockée (aucun message dans ce
  dernier cas). Le brouillon est restauré à l'étape paiement. Sans entrée stockée : étape
  coordonnées, rien n'est libéré.
- Sur `?checkout=success`, l'écran de confirmation s'affiche sans attendre le webhook.
- Le `pg_cron` `expire_stale_bookings` rattrape ce que ces mécanismes ratent (voir « Tâches
  planifiées »).

## Espace client

Règles métier et décisions : [booking-system.md](./booking-system.md). Ici, le fonctionnement.

### Parcours et pages

- Pages : `/login` (demande du lien, `useLoginForm.ts`), `/account/confirm` (vérification du
  lien), `/account` (cartes de réservation, suppression) et `/account/bookings/[id]` (détail d'une
  réservation). Elles ont un en-tête clair, sans bandeau sombre (pages courtes). `/account`,
  `/account/bookings/[id]` et `/account/confirm` sont en `noindex`, et `/account/confirm` envoie
  `referrer: no-referrer`.
- Carte de réservation (`AccountBookingCard.vue`, d'après la maquette validée
  `docs/design/account-booking-card.html`) : bâtie sur `MediaCard`, ligne de statut avec icône et
  texte, rappel ambre `AccountBookingReminder.vue` pour une réservation à venir, un seul lien
  « Voir la réservation ». Les calculs d'affichage sont dans `app/utils/accountBookingCard.ts`.
- Page `/account/bookings/[id]` : résumé, `AccountBookingDocuments.vue` (photos avant/après,
  masquées si annulée, puis « Reçu de paiement »), « Réserver une autre date » si annulée,
  « Réservation introuvable » sur un 404 ou un identifiant invalide.
- Photos (`AccountBookingDocuments.vue`) : les URL signées valent 10 minutes
  (`ACCOUNT_PHOTO_URL_LIFETIME_SECONDS`). Le composant les renouvelle sans recharger la page, par
  la fonction `refreshLinks` de la page : un `$fetch` dédié de `GET /api/account/bookings/[id]`,
  qui ne remplace que `documents`. Pourquoi : `refresh()` de la page viderait toute la
  réservation en cas d'échec. Le renouvellement part trois fois : un minuteur
  `ACCOUNT_PHOTO_URL_REFRESH_MARGIN_SECONDS` (60 s) avant l'expiration, le retour de l'onglet au
  premier plan (`visibilitychange`) si les liens ont vieilli, et un clic sur une photo dont le lien
  est périmé (le clic est annulé, le renouvellement est annoncé et il faut cliquer de nouveau). Un échec n'est annoncé
  que si l'utilisateur l'a provoqué ; les photos restent affichées et le prochain geste réessaie.
  Un `401` termine la session (`expireSession`) sans annonce. Une image qui ne charge pas
  (`error`) laisse sa place avec un message annoncé, et « Recharger les photos » passe par le
  même chemin, avec un retour du focus sur le titre des photos.
- Composants partagés : `MediaCard.vue` (tons `success`, `info`, `neutral`, image facultative via
  `NuxtImg`, prop `interactive` : seules les cartes cliquables se soulèvent au survol, coque
  commune `MEDIA_CARD_SHELL_CLASS`), `MediaCardSkeleton.vue` et `SkeletonBlock.vue`.
- Squelettes de chargement : `aria-hidden`, de la même hauteur que le contenu réel (`h-lh`), avec
  une seule région `sr-only` en `aria-live` qui reste dans le DOM (une région ajoutée en même temps
  que son texte n'est pas annoncée). `/account` en affiche 2 sur mobile, 4 dès `sm`
  (`ACCOUNT_SKELETON_MOBILE_CARD_COUNT`, `ACCOUNT_SKELETON_CARD_COUNT`).
- `useAccountPageState` (`app/composables/useAccountPageState.ts`), commun aux deux pages
  `/account` : état de chargement, `401` vers `expireSession`, focus sur le `h1` une seule fois
  après le premier chargement (aussi au retour arrière), et `reload` pour « Réessayer » : le focus
  va au contenu chargé si le rechargement réussit, il reste sur le bouton si l'erreur persiste.
- Middlewares : `customer` (protège `/account`, renvoie vers `/login`, avec `?session=expired` si
  la session a dépassé 7 jours) et `guest` (renvoie un client connecté de `/login` vers
  `/account`).
- `useCustomerSession` (`app/composables/useCustomerSession.ts`) expose `status` (`none`,
  `active` ou `expired`, calculé depuis l'`amr` du jeton), `isActive`, `endSession` et
  `expireSession`. `endSession` déconnecte globalement (`scope: 'global'`, toutes les sessions et
  jetons de renouvellement) avec un délai maximal de 3 s (`SIGN_OUT_TIMEOUT_MS`), puis se replie
  sur une déconnexion locale si Supabase ne répond pas. `expireSession` termine la session et
  mène à `/login?session=expired`. La page `/account` et la demande de suppression l'appellent sur
  tout `401`.
- Constantes dans `app/constants/account.ts` : `LOGIN_LINK_LIFETIME_HOURS` (24),
  `CUSTOMER_SESSION_MAX_AGE_SECONDS` (7 jours), `ACCOUNT_BOOKING_STATUSES` (`paid`, `completed`,
  `cancelled`), `ACCOUNT_STATUS_ICONS` et `ACCOUNT_STATUS_TONES` (icône et ton de `MediaCard` par
  statut), `ACCOUNT_PHOTO_KINDS` (`before`, `after`), `ACCOUNT_SKELETON_CARD_COUNT` (4) et
  `ACCOUNT_SKELETON_MOBILE_CARD_COUNT` (2), `ACCOUNT_PHOTO_URL_LIFETIME_SECONDS` (600),
  `ACCOUNT_PHOTO_URL_REFRESH_MARGIN_SECONDS` (60) et, pour le reçu, `PAYMENT_RECEIPT_TIMEOUT_MS`
  (4 000), `PAYMENT_RECEIPT_CACHE_TTL_MS` (5 min), `PAYMENT_RECEIPT_MISS_CACHE_TTL_MS` (30 s),
  `PAYMENT_RECEIPT_CACHE_MAX_ENTRIES` (500) et `STRIPE_RECEIPT_HOST_SUFFIX` (`.stripe.com`).
- `/account/confirm` lit le fragment `#token_hash=…`, l'efface aussitôt de l'historique, puis
  appelle `verifyOtp({ token_hash, type: 'email' })` dans le navigateur. Le jeton ne passe donc
  jamais par un serveur. Sans jeton, un client déjà connecté va à `/account`, sinon la page
  d'échec explique comment redemander un lien.
- Champs de formulaire : `describedByIds` (`app/utils/field.ts`) construit l'attribut
  `aria-describedby` (aide et erreur) de `BookingField` et `BookingPhoneField`.
- `localeSchema` (`app/utils/bookingValidation.ts`) : `fr` ou `en`, `fr` par défaut. Réservation et
  connexion s'en servent pour choisir la langue des pages liées dans les mails.

### Routes serveur

- `POST /api/auth/login` (`server/api/auth/login.post.ts`) : corps de 4 Ko, validé par
  `loginRequestSchema` (e-mail, langue, champ piège `website`). Réponse `{ success: true }`
  identique que l'adresse existe ou non, que le plafond soit atteint ou non, et pour un champ piège
  rempli. La RPC `claim_login_link` réserve l'envoi, puis `sendLoginLinkEmail` part en tâche de
  fond (`event.waitUntil`), pour que le temps de réponse ne distingue pas non plus les cas.
- `GET /api/account/bookings` : lit le profil et les réservations avec le client Supabase de la
  session, donc sous RLS. Elle ne renvoie pas de photos : elles ne viennent que de la page d'une
  réservation. Réponse en `Cache-Control: private, no-store`. 500 « Bookings unavailable » si la lecture du profil échoue,
  404 « Account not found » si la fiche manque.
- `GET /api/account/bookings/[id]` (`server/api/account/bookings/[id].get.ts`) : réponse
  `{ booking, documents }` (`documents` : `photos` avec `before` et `after`, URL signées ou
  `null`, et `receiptUrl`), en `Cache-Control: private, no-store` posé en premier. 401 sans session, contrôlé
  avant le 400 (identifiant qui n'est pas un UUID, `accountBookingParamsSchema` dans
  `server/utils/accountSchemas.ts`). 404 « Booking not found » identique pour une réservation
  inexistante, d'un autre client ou d'un autre statut : rien ne permet de deviner l'existence d'un
  identifiant. 500 « Booking unavailable » si la lecture échoue. Nitro remplace l'en-tête par
  `no-cache` sur un 404, ce qui reste privé.
- `POST /api/account/deletion-request` : contrôle l'`Origin` (`assertSameOrigin`) puis la session,
  pose `profiles.deletion_requested_at` (une seule fois : une demande déjà posée renvoie sa date),
  et envoie l'alerte à `NUXT_CONTACT_EMAIL_TO`. Si l'alerte échoue (adresse absente ou Resend en
  erreur), la date est remise à zéro et la route répond 502 : mieux vaut un échec visible qu'une
  demande que personne ne verra.
- Mutations du client : aucune. L'UPDATE client sur `profiles` est retiré (migration `…010000`),
  seul le serveur écrit.

### Fonctions serveur

- `requireCustomerId(event)` (`server/utils/customerSession.ts`) : renvoie l'identifiant du client
  depuis le cookie de session vérifié. 401 sans session valide. Si la connexion date de plus de 7
  jours, 401 et révocation globale des sessions (`auth.admin.signOut(…, 'global')`) lancée en tâche
  de fond avec `event.waitUntil` : la réponse n'attend pas Supabase et ne dépend pas de son succès.
- `signInTimestamp` et `isSignInExpired` (`app/utils/customerSession.ts`), partagées par le serveur
  et le navigateur : l'heure de connexion est la plus ancienne entrée `otp` ou `magiclink` de
  l'`amr`, qui ne bouge pas au renouvellement du jeton. Sans entrée lisible, la session compte
  comme expirée. Le navigateur lit le jeton sans le vérifier, uniquement pour masquer l'espace ;
  le serveur vérifie toujours.
- `createLoginLink` (`server/utils/loginLink.ts`) : ne génère le lien que si l'utilisateur Auth et
  la fiche `profiles` portent la même adresse, pour que Supabase ne crée jamais un compte. Elle
  appelle `generateLink({ type: 'magiclink' })` et construit
  `<site>/account/confirm#token_hash=…` (fragment limité à `token_hash`). Ne lève jamais d'erreur,
  renvoie `null`.
- `sendLoginLinkEmail` (`server/utils/accountEmails.ts`) : envoie ce lien à l'adresse du profil,
  avec `NUXT_CONTACT_EMAIL_TO` en `replyTo`. `sendDeletionRequestAlert` envoie l'alerte admin.
  Aucune ne lève d'erreur.
- `assertSameOrigin` (`server/utils/requestOrigin.ts`) : garde CSRF des routes qui s'authentifient
  par cookie. L'en-tête `Origin` doit être celui de `NUXT_SITE_URL` (en dev, aussi celui de la
  requête). Sinon 403.
- `resolveSiteUrl` et `localizedSiteUrl` (`server/utils/siteUrl.ts`) : l'URL publique (sans `/`
  final) et l'URL d'une page dans une langue (`/en` en préfixe, le français n'en a pas). Sans
  `NUXT_SITE_URL`, ou sans https hors développement : 503 « Site URL unavailable ».
- `loadAccountBookings` et `loadAccountBooking` (`server/utils/accountBookings.ts`) : la liste
  (plus récentes d'abord) et une réservation (`null` si absente, d'un autre client ou d'un statut
  hors espace). Elles partagent les mêmes colonnes et le même convertisseur de ligne. La seconde
  renvoie aussi `stripe_payment_intent_id` (`AccountBookingRecord`), qui ne sort jamais du serveur.
- `loadAccountBookingDocuments` (`server/utils/accountDocuments.ts`) : ne lève jamais d'erreur,
  une photo ou un reçu manquant laisse seulement l'entrée vide.
  - Photos : lues et signées (`createSignedUrls`) avec le client Supabase de la session du client,
    donc sous RLS, et seulement pour une réservation `completed`. Le service role n'est pas
    utilisé : si la règle des 7 jours ou le statut changent, la base refuse.
  - Reçu : `paymentIntents.retrieve` avec `expand: ['latest_charge']`, délai de 4 s, aucun nouvel
    essai (`maxNetworkRetries: 0`), et `receipt_url` gardée seulement si c'est une URL `https` d'un
    hôte `*.stripe.com`. Le résultat est mis en cache en mémoire par réservation : 5 minutes, 30
    secondes quand Stripe n'a rien donné, 500 entrées au plus (la plus ancienne sort en premier).
    Pourquoi : recharger la page ne doit pas consommer la limite de débit Stripe partagée avec
    Checkout, ni marteler Stripe pendant une panne. Le cache est propre à chaque instance du
    serveur. Le reçu reflète un remboursement.

### Motion

- Source unique : `app/constants/motion.ts`, reprise dans les jetons de `app/assets/css/tailwind.css`.
  Le mouvement doit être identique partout.
- Jetons Tailwind : `ease-brand` (courbe `0.22, 1, 0.36, 1`), `duration-press` (200 ms, survol et
  appui), `duration-lift` (300 ms, soulèvement d'une carte), `duration-enter` (600 ms,
  apparition).
- Préréglages TypeScript : `MOTION_EASE`, `REVEAL_DURATION` (0,6 s), `REVEAL_MAX_STAGGER_STEPS`,
  `CONTENT_ENTER_TRANSITION` et `CONTENT_ENTER_OFFSET` pour tout contenu qui apparaît,
  `HERO_ENTER_CLASS` (600 ms, 24 px, `ease-brand`). `STEP_OFFSET` et `STEP_TRANSITION` ne servent
  qu'aux formulaires à étapes et aux échanges de formulaire en place. `FEEDBACK_OFFSET`
  (`STEP_OFFSET / 2`, 8 px) est le décalage des messages qui apparaissent sous un champ ou un bouton ;
  l'espace Pro et la page d'une réservation l'emploient en `-FEEDBACK_OFFSET` (le message descend).
  Les anciens `STEP_OFFSET / 2` du site restent à migrer (`TODO.md`).
- Défilement doux : `html { scroll-behavior: smooth }` (`app/assets/css/tailwind.css`) n'est actif
  que sous `prefers-reduced-motion: no-preference`.
- `tests/unit/shared/motion-tokens.test.ts` vérifie que les deux sources donnent les mêmes valeurs.
  Modifier l'une sans l'autre fait échouer le test.

### Base de données et réglages Supabase

- À appliquer dans l'ordre, dans le SQL Editor : `20261016000000_customer_area_profiles`
  (colonnes `login_link_sent_at` et `deletion_requested_at`), `…010000_login_link_rate_limit`
  (plafond `claim_login_link`, retrait de l'UPDATE client), `…020000_customer_session_max_age`
  (`has_recent_sign_in()` et policies) et `…030000_auth_email_hook_and_session_rule`
  (`suppress_auth_emails`, règle de session sur la plus ancienne connexion).
- `claim_login_link(p_email)` : une seule instruction `UPDATE` atomique. 60 s entre deux liens, 5
  liens sur 24 h glissantes. Elle compare `profiles.email` sans conversion, qui **doit donc rester
  en minuscules** (index unique utilisé). Réservée à `service_role`.
- `has_recent_sign_in()` : la connexion la plus ancienne (`otp` ou `magiclink`) doit dater de moins
  de 7 jours. Utilisée par les policies de `profiles`, `bookings`, `intervention_photos` et du
  bucket `intervention-photos`. Elle ne change pas de comportement avec la migration admin, mais
  lit désormais l'`amr` par `oldest_link_sign_in_at()`, partagée avec `is_admin()`. `is_admin()`
  n'y échappe plus : voir « Espace Pro ».
- `suppress_auth_emails(event)` : renvoie `{}`. Supabase n'envoie plus aucun mail d'auth, les mails
  partent tous de notre serveur (`generateLink` puis Resend). Cela inclut l'accès admin.
- Réglages manuels attendus dans le tableau de bord Supabase :
  - Auth Hook « Send Email » activé, vers `public.suppress_auth_emails` ;
  - « Allow new users to sign up » désactivé (aucun compte créé par un lien) ;
  - Email OTP Expiration = 86 400 s, à garder égal à `LOGIN_LINK_LIFETIME_HOURS` ;
  - Secure email change et Secure password change activés, limite d'e-mails 2 par heure,
    détection de réutilisation des jetons de renouvellement activée ;
  - « Time-box user sessions » : indisponible sur le plan Free, d'où la règle des 7 jours faite
    par nous.
- Pourquoi une règle des 7 jours : le cookie `@supabase/ssr` vaut 400 jours et son `maxAge` écrase
  celui de `@nuxtjs/supabase` (8 h), voir `node_modules/@supabase/ssr/dist/main/cookies.js:230`.
  Une connexion par mot de passe donnerait `amr=password`, refusée par l'application et la RLS.
- Limite connue : un refresh token volé et jamais présenté au site reste valide chez GoTrue. Il
  n'accède plus à aucune donnée après 7 jours (RLS et serveur). Autre risque : un scanner de mail
  qui exécute le JavaScript peut consommer le lien.

### Mise en place du projet Supabase de production

Le projet de production vit dans l'organisation Supabase du client (étape 12 de `TODO.md`).

> **Attention** : les réglages Auth ci-dessous ne sont dans aucune migration. Si l'un est oublié, la
> sécurité de l'espace client de l'étape 7 ne tient pas (mails d'auth envoyés par Supabase,
> comptes créés par un lien, sessions trop longues).

1. Appliquer dans le SQL Editor, dans l'ordre des horodatages, les 12 migrations de
   `supabase/migrations/` :
   - `20261010000000_booking_schema`
   - `20261010010000_profiles_email`
   - `20261014000000_pricing_grid_and_quotes`
   - `20261014010000_quote_requests_equipment`
   - `20261015000000_expire_stale_bookings_cron`
   - `20261015010000_booking_payment_guards`
   - `20261016000000_customer_area_profiles`
   - `20261016010000_login_link_rate_limit`
   - `20261016020000_customer_session_max_age`
   - `20261016030000_auth_email_hook_and_session_rule`
   - `20261017000000_admin_login_link`
   - `20261017010000_admin_session_rule`
2. Refaire à la main les réglages Auth (posés sur le projet de développement à l'étape 7) :
   - Auth Hook « Send Email » activé, type Postgres, vers `public.suppress_auth_emails` ;
   - « Allow new users to sign up » désactivé ;
   - Secure email change et Secure password change activés ;
   - Email OTP Expiration = 86 400 s (égal à `LOGIN_LINK_LIFETIME_HOURS`) ;
   - détection de réutilisation des jetons de renouvellement activée ;
   - limite d'e-mails au minimum ;
   - Site URL et Redirect URLs = `https://binovya.com` uniquement (aucune URL de dev) ;
   - utilisateur admin avec `app_metadata.role = 'admin'`, créé SANS mot de passe (voir « Espace
     Pro », « Créer un admin ») ;
   - « Time-box user sessions » à 7 jours seulement si le client prend le plan Pro ;
   - RLS automatique sur les nouvelles tables : le projet de développement a un event trigger
     `ensure_rls` (`ddl_command_end`) qui appelle `public.rls_auto_enable()` (`security definer`,
     `search_path` à `pg_catalog`) et active la RLS sur toute table créée dans `public`. Il n'est
     dans aucune migration (créé hors de nos fichiers, sans doute par une option du tableau de
     bord Supabase) et n'existera donc pas en production. Activer la même option sur le projet de
     production, ou le fournir par une migration dédiée : décision à prendre. C'est un filet de
     sécurité contre une table créée sans RLS, car Supabase donne par défaut tous les droits à
     `anon` et `authenticated` sur les nouvelles tables de `public`.
3. Vérifier, en lecture seule, avec les mêmes requêtes que celles de l'étape 7 :

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

-- Policies qui appliquent la règle des 7 jours : profiles, bookings, intervention_photos
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
  `supabase_auth_admin`. La troisième requête renvoie `false` et `false`. La quatrième ne renvoie
  aucune ligne (sinon un admin a un mot de passe : le supprimer et le recréer sans mot de passe). La cinquième
  renvoie une ligne (`ensure_rls`,
  `ddl_command_end`, `rls_auto_enable`). On n'utilise pas `information_schema.role_table_grants` :
  elle n'affiche que les droits visibles pour le rôle qui exécute la requête, donc un résultat
  vide peut être un faux « OK ». `has_table_privilege` répond pour le rôle nommé, quel que soit
  celui qui interroge.
- Les réglages Auth ne se lisent pas en SQL : les contrôler dans le tableau de bord, puis tester
  qu'un lien demandé sur `/login` arrive bien par Resend et jamais par Supabase.

## Espace Pro

Règles métier : [booking-system.md](./booking-system.md). Les trois lots de l'étape 8 sont faits :
accès, planning, liste, itinéraire ; disponibilités et déplacement d'une intervention ; photos,
« Terminer l'intervention » et photos côté client. Une passe de désencombrement a suivi (fiche
d'intervention, lignes mobiles, pied de page, jours marqués des sélecteurs de date, alerte
urgente du planning) ; la passe de tests de fin d'étape reste à faire.

### Pages et mise en page

- Pages : `/pro/login` (demande du lien), `/pro/confirm` (vérification du lien, comme
  `/account/confirm`), `/pro` (planning du jour), `/pro/interventions` (liste filtrée,
  `app/pages/pro/interventions/index.vue`), `/pro/interventions/[id]` (fiche d'une intervention en
  quatre étapes, `[id].vue`) et `/pro/availability` (capacité par jour de semaine, exception d'une
  date, jours à signaler, paramètre `?date=` pour ouvrir une date). Toutes en `noindex, nofollow` ;
  `/pro/confirm` envoie aussi `referrer: no-referrer`.
- Layout `pro` (`app/layouts/pro.vue`) : barre latérale fixe (`ProNavPanel`) à partir de
  `PRO_SIDEBAR_MIN_WIDTH` (1024 px, requête `PRO_SIDEBAR_QUERY`), en-tête sombre avec menu burger
  en dessous. Le burger ouvre la même navigation dans un panneau `Dialog` reka-ui
  (`PRO_NAV_SHEET_ID`) qui se ferme au passage au mode barre latérale ; le focus revient alors sur
  le premier lien de la barre, sinon sur le bouton du menu. Sans session admin, ni barre ni
  burger, seulement le nom de la marque.
- `ProNavPanel.vue` : liens de `PRO_NAV_ITEMS` (planning, interventions, disponibilités) avec
  `aria-current`, adresse de l'admin connecté et bouton de déconnexion.
- Pied de page du layout `pro` : bande navy compacte, décalée de la barre latérale à partir de
  `lg`. Une `nav` « Liens du site BINOVYA » avec « Mentions légales » (`/legal`), « Politique de
  confidentialité » (`/privacy`) et « Retour au site » (`/`), puis le copyright. Dans le DOM, la
  `nav` précède le copyright ; à partir de `sm`, `order` les remet dans l'ordre visuel
  copyright puis liens (sous `sm`, la `nav` est au-dessus du copyright). Le réordonnancement
  passe par `order` et non par `display: contents`. Les liens font 44 px de haut (`min-h-11`).

### Routes serveur

- `POST /api/pro/auth/login` : `handleLoginRequest` avec la RPC `claim_admin_login_link` et
  `sendAdminLoginLinkEmail`.
- `GET /api/pro/planning?date=` : interventions `paid` et `completed` du jour (aujourd'hui en
  Europe/Paris sans `date`), coordonnées du dépôt et `day` (`ProDayOverview` du jour, ou `null`
  si `admin_day_overview` échoue : l'erreur est journalisée et le planning reste affiché).
  Chaque intervention porte `isToMove`.
- `GET /api/pro/interventions?status&from&to&page` : page de 50 interventions. `status` vaut
  `all` par défaut, `page` va de 1 à 1000. `from` postérieur à `to` donne 400 (le navigateur
  l'écarte avant l'appel). Les dates des interventions `paid` de la page passent par
  `admin_day_overview` (un appel par plage de 400 jours au plus, `loadDayOverviewsOfDates`) pour
  poser `isToMove` ; si l'appel échoue, la liste s'affiche sans badge (erreur journalisée).
- `GET /api/pro/interventions/[id]` : une intervention `paid`, `completed` ou `cancelled`
  (`ProIntervention` : client, adresse, bacs, formule, `photos` `{ before, after }`,
  `completedWithoutPhotos`, `isToMove`). Un identifiant qui n'est pas un uuid, inconnu ou d'un
  autre statut donne le même 404 `data.code = 'notFound'` (`bookingNotFound`,
  `server/utils/proErrors.ts`, aussi employé par les routes d'écriture). Mêmes `Cache-Control`,
  `requireAdmin` et lecture sous RLS que les autres `GET`. Les interventions du planning et de la
  liste portent elles aussi `photos` et `completedWithoutPhotos`
  (`loadInterventionPhotoFlags`).
- `GET /api/pro/interventions/days?from&to` : nombre d'interventions `paid` et `completed` par
  jour, pour les points des `DatePicker` (`{ days: [{ date, count }] }`, seulement les jours qui
  en ont, par date croissante). `from` et `to` sont obligatoires, `from` au plus égal à `to` et
  `to` au plus 41 jours après `from` (une grille de 42 jours, `CALENDAR_GRID_DAY_COUNT`), sinon 400. Même ordre que les autres `GET` (`requireAdmin` puis Zod puis client de session sous
  RLS). Le serveur ne lit que `scheduled_date`, par lots de 1 000 lignes (`max_rows` de
  PostgREST, qui tronquerait sans le dire une réponse plus grande), au plus 3 lots. Exactement
  3 000 interventions sont acceptées : une lecture de contrôle de la ligne 3 001 doit être
  vide. Au-delà, ou sur erreur de lecture, 500 `Interventions unavailable`. Les statuts sont
  ceux du planning, pas du filtre de la liste.
- Ordre des `GET`, identique : `Cache-Control: private, no-store` posé en premier, puis
  `requireAdmin`, puis la validation Zod (`server/utils/proSchemas.ts`, 400), puis la lecture avec
  le client Supabase de la session, donc sous la RLS `is_admin()`. Une erreur de lecture donne 500.
- `requireAdmin` : 401 sans session, 403 sans le rôle admin, 401 et révocation globale en tâche de
  fond si la session a plus de 7 jours ou vient d'un mot de passe.
- Page au-delà du total : PostgREST répond `PGRST103` (plage non satisfaisable). La route refait
  alors une requête qui ne fait que compter et renvoie une page vide avec le total, pour que le
  navigateur retourne à la dernière page.
- Routes du lot 2, toutes avec `Cache-Control: private, no-store`. Les lectures passent par
  `requireAdmin`. Les écritures passent par `assertSameOrigin`, puis `requireAdminForWrite`
  (voir plus bas), puis la taille du corps, puis Zod, et écrivent avec le rôle `service_role` : la
  RLS n'autorise plus aucune écriture à `authenticated`.
  - `GET /api/pro/availability?from&to` : règles par jour de semaine et jours « notables »
    (`isNotableDay` : exception, jour fermé avec interventions payées, ou plus de réservations que
    la capacité). Par défaut d'aujourd'hui à +365 jours (`PRO_AVAILABILITY_HORIZON_DAYS`), au
    plus 400 jours (`PRO_AVAILABILITY_MAX_RANGE_DAYS`), sinon 400. Réponse
    `{ from, to, rules, days }`.
  - `PUT /api/pro/availability/rules` (2 Ko) : `{ rules: [{ weekday, maxBookings }] }`, 1 à 7
    jours distincts, capacité de 0 à `PRO_DAY_CAPACITY_MAX` (50). Un seul `upsert`, donc toutes
    les règles ou aucune. Renvoie les 7 règles.
  - `PUT /api/pro/availability/overrides/[date]` (4 Ko) : corps `maxBookings` (nombre ou
    `null`), `note` (texte ou `null`) et `sector` (commune signée, `null` ou absent). Une date
    invalide ou au-delà de l'horizon donne 400, une date passée 422. `sector` absent garde le
    secteur enregistré, `null` l'efface. Une commune au jeton invalide donne 400 `invalidAddress`. Une note vide
    devient `null`. Une exception laissée sans capacité, sans secteur et sans note est supprimée.
    Renvoie le `ProDayOverview` du jour.
  - `DELETE /api/pro/availability/overrides/[date]` : mêmes contrôles de date (400, 422). Supprimer
    une exception absente réussit. Renvoie le `ProDayOverview` du jour.
  - `POST /api/pro/bookings/[id]/reschedule` (1 Ko) : `{ date, force }`. Réponse
    `{ bookingId, oldDate, newDate, overriddenCodes }`. Les refus portent `data.code` :
    `notFound` 404 (aussi pour un identifiant qui n'est pas un uuid), `invalidDate` 400,
    `tooFar` 400 (aussi levé par Zod, au-delà de 365 jours), `notPaid` 422, `sameDate` 422,
    `pastDate` 422, `tooFrequent` 429, `outOfArea`, `dayClosed`, `dayFull` et `outOfSector` 409
    (forçables avec `force: true`). Le mail au client part après la réponse
    (`event.waitUntil(sendBookingRescheduleEmail)`, qui ne lève jamais).
- Routes du lot 3, mêmes en-têtes et même ordre que le lot 2 (`assertSameOrigin`,
  `requireAdminForWrite`, uuid, taille du corps, validation), écriture avec `service_role` :
  - `PUT /api/pro/bookings/[id]/photos/[kind]` (`kind` : `before` ou `after`, sinon 400
    `invalidKind`) : le corps est le JPEG brut, 5 Mo au plus (`PRO_PHOTO_MAX_BYTES`). Sans
    `Content-Length` (ou en `Transfer-Encoding`) : 411 ; au-delà : 413 `tooLarge` ; un corps vide,
    non JPEG, mal formé ou suivi d'octets après son `EOI` : 400 `invalidImage`. La signature et
    la structure sont lues (jamais le `Content-Type` annoncé), puis `stripJpegMetadata` réécrit le
    fichier sans EXIF (GPS compris), XMP, ICC, IPTC ni commentaires : seuls APP0 (JFIF) et APP14
    (transformation de couleur Adobe) sont gardés avec les tables et l'image. Il faut un
    en-tête de trame (SOF) et un balayage (SOS), au plus 1 024 segments. Pourquoi côté serveur : le
    navigateur nettoie déjà (le canvas ne garde pas l'EXIF), mais le serveur ne doit pas lui faire
    confiance. Réponse `{ bookingId, kind, replaced }`.
  - Refus de la route : 404 `notFound`, 422 `notPaid` (statut autre que `paid` ou `completed`),
    422 `futureDate` (réservation `paid` dont le jour n'est pas venu), 500 « Photo not saved ». Le
    statut est lu avant l'envoi (`assertBookingAcceptsPhotos`) pour ne laisser aucun fichier à une
    réservation refusée, puis la RPC le revérifie sous le verrou de la ligne.
  - `POST /api/pro/bookings/[id]/complete` (1 Ko) : `{ force }` (faux par défaut). Réponse
    `{ bookingId, withoutPhotos, customerNotified }`. Refus (`data.code`) : `notFound` 404,
    `alreadyCompleted` 409, `notPaid` 422, `futureDate` 422, `missingPhotos` 409 (une photo
    manque et `force` est faux). Le mail « photos disponibles » part après la réponse
    (`event.waitUntil(sendPhotosAvailableEmail)`) quand `customerNotified` est vrai.

### Fonctions serveur

- `requireAdmin` (`server/utils/adminSession.ts`) : rôle lu dans `app_metadata.role` (jamais
  `user_metadata`) puis session active (`hasAdminRole`, `isActiveAdminClaims` dans
  `app/utils/adminSession.ts`, partagées avec le navigateur). L'ordre 403 puis 401 évite de
  révoquer la session d'un simple client qui appellerait la route.
- `requireSessionIdentity` et `rejectExpiredSession` (`server/utils/session.ts`) : partagées avec
  `requireCustomerId`. La seconde lève 401 et lance la révocation globale par `event.waitUntil`.
- `handleLoginRequest` (`server/utils/loginRequest.ts`), commune à `/api/auth/login` et
  `/api/pro/auth/login` : corps de 4 Ko, même réponse `{ success: true }` dans tous les cas, RPC de
  plafond puis envoi du mail après la réponse (`event.waitUntil`).
- `server/utils/loginLink.ts` : `claimLoginLink` (appel de la RPC), `createLoginLink` (client),
  `createAdminLoginLink` (admin : n'agit que si l'utilisateur Auth a encore le rôle admin, lien
  vers `/pro/confirm#token_hash=…`) et `generateMagicLink` (interne, `generateLink`).
- `sendAdminLoginLinkEmail` (`server/utils/accountEmails.ts`) : mail en français, sans `replyTo`
  (voulu : il part à l'admin lui-même).
- `loadDayInterventions`, `loadInterventionsPage`, `loadDepot` (`server/utils/proInterventions.ts`)
  : lectures sous RLS. Les profils sont lus à part, par lot d'identifiants. Tri du planning par
  code postal puis adresse, de la liste par date puis date de création. `paidInterventionDates` et
  `flagInterventionsToMove` posent `isToMove` : intervention `paid` dont le jour est fermé, jamais
  un jour seulement en dépassement de capacité.
- `loadInterventionDayCounts` (`server/utils/proInterventionDays.ts`) : compte les interventions
  par jour sur une plage courte, lot après lot (`loadScheduledDates`, récursive, `range` de
  PostgREST avec tri par date puis `id` pour des lots stables). Lit sous la RLS : le client doit
  porter une session admin.
- `requireAdminForWrite` (`server/utils/adminSession.ts`) : `requireAdmin`, puis relit le compte
  par `auth.getUser()` (appel à Supabase Auth, pas seulement le jeton). 401 si l'identifiant
  diffère ou si Auth ne répond pas, 403 si le rôle a été retiré ou si le compte est banni. Pourquoi :
  un rôle retiré reste lisible dans le jeton jusqu'à 1 h. Employé par les quatre routes
  d'écriture du lot 2 et par les deux routes du lot 3 (photos et fin d'intervention).
- `server/utils/proAvailability.ts` : `loadDayOverviews`, `loadDayOverview`,
  `loadDayOverviewsOfDates` (appels de `admin_day_overview`, service role), `loadWeekdayRules`
  (7 règles, un jour sans règle vaut 0), `saveWeekdayRules`, `saveDayOverride` (upsert puis
  suppression si l'exception est vide) et `deleteDayOverride`. Une erreur de lecture donne 500
  `Availability unavailable`, une erreur d'écriture 500 `Availability not saved`.
- `server/utils/proReschedule.ts` : `rescheduleBooking` appelle `admin_reschedule_booking` et
  traduit la ligne de refus (`reason`) en erreur HTTP avec `data.code`. `proSchemas.ts` : le
  schéma `proHorizonDateSchema` marque l'issue « trop loin » pour que la route réponde `tooFar`
  (`isBeyondProHorizon`) plutôt que `invalidDate`.
- `sendBookingRescheduleEmail` (`server/utils/bookingEmails.ts`) : mail de changement de date au
  client, clé d'idempotence `booking-reschedule-<uuid>-<id>` avec un uuid neuf à chaque appel
  (un mail par déplacement, même aller-retour dans la journée). Le rappel
  (`server/utils/bookingReminders.ts`) a maintenant la clé `booking-reminder-<date>-<id>` : sans
  la date, un rappel déjà envoyé aurait bloqué celui de la nouvelle date. Le `update` de
  `reminder_sent_at` est conditionné à la date annoncée.
- `server/utils/proPhotos.ts` : `readPhotoBody` (lecture du corps brut, contrôle et nettoyage),
  `assertBookingAcceptsPhotos` et `saveInterventionPhoto`. Celle-ci envoie le fichier dans le
  bucket privé (`upsert`, chemin `{booking_id}/{kind}.jpg`, `cacheControl` de 60 s) puis appelle
  `admin_set_intervention_photo`. Si la RPC refuse et qu'aucune ligne de ce type n'existe, avant
  l'envoi comme après le refus (relecture), le fichier envoyé est supprimé : pas de fichier sans
  sa ligne. Un échec passager de la RPC garde le fichier, car un envoi concurrent du même type a
  pu l'enregistrer entre-temps. Aucun mail ne part d'un envoi de photo. `loadInterventionPhotoFlags`
  lit quelles photos existent, par lot de réservations, sous RLS.
- `server/utils/proCompletion.ts` : `completeBooking` appelle `admin_complete_booking` et traduit
  la ligne de refus (`reason`) en erreur HTTP avec `data.code`.
- `app/utils/image.ts` : `hasJpegSignature`, `stripJpegMetadata` (partagée avec le navigateur) et
  `fitWithin` (calcul de la taille réduite). `app/utils/proPhotos.ts` : règles partagées
  (`photoStatusRefusal`, `canCompleteIntervention`, photos manquantes).

### Base de données

- `admin_login_links` (`user_id`, `sent_at`, `link_count`, `window_start`) : compteurs de
  plafond des admins, qui n'ont pas de fiche `profiles`. RLS active, aucun droit hors
  `service_role`.
- `claim_admin_login_link(p_email)` : même `INSERT … ON CONFLICT DO UPDATE` atomique que
  `claim_login_link` (60 s, 5 liens sur 24 h), mais l'adresse doit être celle d'un utilisateur Auth
  avec `app_metadata.role = 'admin'`, non supprimé et non banni. Réservée à `service_role`.
- `oldest_link_sign_in_at()` : heure de la plus ancienne entrée `otp` ou `magiclink` de l'`amr`
  du JWT.
- `is_admin()` (plpgsql, `stable`) : vrai si `app_metadata.role = 'admin'` ET si
  `oldest_link_sign_in_at()` a moins de 7 jours. Une session par mot de passe n'est donc jamais
  admin. Elle était en SQL simple (rôle seul) : en plpgsql elle n'est plus remplacée par son
  corps dans les requêtes et s'évalue par ligne si la policy l'appelle directement. Depuis la
  migration `20261017020000`, toutes les policies l'écrivent `(select public.is_admin())` : elle
  est évaluée une fois par requête. Déclarée dans `Functions` de `app/types/database.types.ts`.
- `has_recent_sign_in()` : inchangée dans son comportement (voir « Espace client »).
- Migrations du lot 2, appliquées et vérifiées en base :
  - `20261017020000_pro_availability_admin` : contraintes (capacité ≤ 50, latitude et longitude
    bornées, note ≤ 500 caractères) ; `day_check(date, lat, lon, exclude_booking, apply_bounds)`,
    qui reprend la logique de `day_status` (fermé, complet, `outOfSector`, disponible) en ignorant
    au besoin une réservation et les bornes de délai minimum et d'horizon ; `day_status` garde sa
    signature et son comportement en appelant `day_check` ; `admin_day_overview` ; première
    version d'`admin_reschedule_booking` ; retrait des écritures `authenticated` sur `bookings`
    (UPDATE), `availability_rules` et `availability_overrides` (il ne reste que des policies
    `select` admin) ; réécriture des policies en `(select public.is_admin())`.
  - `20261017030000_pro_availability_hardening` : colonne `availability_overrides.sector_label`
    (1 à 300 caractères, seulement avec des coordonnées) ; colonnes `bookings.rescheduled_at`,
    `reschedule_count` et `reschedule_window_start` ; `admin_reschedule_booking` refait avec
    `too_far` et `too_frequent` et `overridden_reasons` (tableau) ; `admin_day_overview` renvoie
    `sector_label` et ne renvoie plus les coordonnées de la première réservation (adresse d'un
    client) ; écritures de `price_grid`, `booking_settings` et `quote_requests` réservées au
    serveur (policies `select` admin seulement), `INSERT`, `DELETE` et `TRUNCATE` de `bookings`
    retirés à `anon` et `authenticated`.
- `admin_day_overview(p_from, p_to)` : une ligne par date (400 jours au plus, sinon exception
  `INVALID_RANGE`) avec capacité effective et sa source (`rule` ou `override`), `is_closed`,
  secteur imposé et son libellé, note, réservations actives (comptées dans la capacité) et
  payées (à déplacer si le jour est fermé).
- `admin_reschedule_booking(p_booking_id, p_new_date, p_force)` : verrouille la réservation
  (`for update`) puis les deux jours (verrous consultatifs, dans l'ordre des dates). Refus jamais
  forçables, dans l'ordre : `not_found`, `not_paid`, `invalid_date`, `same_date`, `past_date`,
  `too_far` (plus de 365 jours), `too_frequent` (quatrième déplacement dans la même heure).
  Contrôles forçables : `out_of_area` puis ceux de `day_check` (`day_closed`, `day_full`,
  `out_of_sector`). Sans `p_force`, le premier refuse ; avec, tous ceux qui échouent sont
  renvoyés dans `overridden_reasons`. Elle remet `reminder_sent_at` et `day_of_sms_sent_at` à
  zéro et compte le déplacement. Un nouvel essai après un délai dépassé côté navigateur est donc
  protégé côté base : même date (`same_date`) ou plafond (`too_frequent`).
- `day_check`, `admin_day_overview` et `admin_reschedule_booking` sont réservées à `service_role`.
- Migrations du lot 3, appliquées et vérifiées en base :
  - `20261019000000_pro_intervention_photos` : colonnes `bookings.completed_without_photos` et
    `photos_notified_at`, `intervention_photos.updated_at`, contrainte
    `intervention_photos_storage_path_format` (chemin `{booking_id}/{kind}.jpg`, ajoutée sans
    validation) ; bucket `intervention-photos` privé, 5 Mo, `image/jpeg` seulement ; RPC
    `admin_set_intervention_photo` et `admin_complete_booking`, réservées à `service_role` ;
    retrait des policies d'écriture du bucket et de la table (`anon` et `authenticated` perdent
    tous leurs droits sur `intervention_photos`, `authenticated` garde `SELECT`). Seul le serveur
    écrit désormais les photos, avec le service role.
  - `20261019010000_pro_photos_rules` : les policies de lecture client (table et bucket) exigent
    en plus `bookings.status = 'completed'`, la règle ne repose donc pas sur la seule route ;
    `admin_set_intervention_photo` refuse une réservation `paid` dont le jour n'est pas venu
    (`future_date`) ; `admin_complete_booking` ne renvoie plus de données client mais `ok`,
    `reason`, `send_photos_mail`, `without_photos` et `booking_date` ; la contrainte de chemin est
    validée (la migration échoue en bloc si une ligne existante ne la respecte pas).
- `admin_set_intervention_photo(p_booking_id, p_kind, p_storage_path)` : verrouille la
  réservation (`for update`). Refus dans l'ordre : `not_found`, `not_paid` (statut hors `paid` et
  `completed`), `future_date` (`paid` après aujourd'hui, Europe/Paris ; `completed` toujours
  accepté), `invalid_kind`, `invalid_path`. Insère ou remplace la ligne (`updated_at = now()`) et
  renvoie `replaced`.
- `admin_complete_booking(p_booking_id, p_force)` : verrouille la réservation. Refus jamais
  forçables : `not_found`, `already_completed`, `not_paid`, `future_date`. `missing_photos` si un
  des deux types manque et que `p_force` est faux. Sinon passe en `completed`, pose
  `completed_at` et `completed_without_photos`, et réserve `photos_notified_at` dans la même
  transaction : `send_photos_mail` est vrai seulement avec les deux photos, donc au plus une fois.
  Une fin forcée ne notifie jamais, même si des photos sont ajoutées ensuite.
- Créer un admin SANS mot de passe : invitation du tableau de bord Supabase, ou
  `auth.admin.createUser` sans `password`, avec `email_confirm: true` et
  `app_metadata: { role: 'admin' }`. Pas de fiche `profiles`. Un mot de passe ne donnerait de toute
  façon pas accès (méthode `password` refusée), mais le retirer réduit la surface d'attaque. Adresse
  dédiée et non publiée. Contrôle en production : la requête « Aucun admin avec mot de passe » de la
  check-list Supabase.

### Client

- Middlewares : `admin` (protège `/pro`, `/pro/interventions`, `/pro/interventions/[id]` et `/pro/availability` ; sans session
  valide renvoie vers
  `/pro/login`, avec `?access=denied` si la session n'est pas admin, avec `?session=expired` si la
  session admin a plus de 7 jours) et `admin-guest` (renvoie un admin connecté de `/pro/login` vers
  `/pro`). Les avis passent par `NoticeBanner.vue`. `customer` et `guest` renvoient un admin vers
  `/pro`.
- `useAdminSession` : `isAdmin`, `isExpiredAdmin`, `hasSession`, `endSession`, `leave` (retour à
  `/pro/login`) et `expire` (idem avec l'avis d'expiration). Le navigateur lit le jeton sans le
  vérifier, le serveur revérifie toujours.
- `useCustomerSession` : nouveau statut `admin`. `expireSession` n'y termine pas la session, il
  renvoie vers `/pro`. La navigation (`app/constants/account.ts`) affiche « Espace admin »
  (`account.navAdmin`, icône `LayoutDashboard`) vers `/pro`.
- `useProPageState` : se pose sur `useAccountPageState`. 401 : retour à `/pro/login` avec l'avis
  d'expiration ; 403 : retour à `/pro/login` sans avis.
- `useBusinessToday` : date du jour en Europe/Paris (`businessToday`, `app/utils/date.ts`),
  recalculée quand l'onglet redevient visible, pour qu'une page laissée ouverte la nuit passe au
  jour suivant.
- `parseIsoDate` et `toIsoDate` (`app/utils/date.ts`) : `parseIsoDate` pose l'année par
  `setFullYear`, car `new Date(année, …)` lit les années 0 à 99 comme 1900 à 1999 ; `toIsoDate`
  écrit l'année sur 4 chiffres (`padStart`) pour rester un `YYYY-MM-DD` valide.
- `groupPhoneDigits` (`app/utils/phone.ts`) : sépare un numéro français ou luxembourgeois en
  groupes de chiffres (`+33 6 12 34 56 78`, `06 12 34 56 78`, `+352 26 12 34 56`, `+352 621 123
456`), pour que le lecteur d'écran le dise groupe par groupe. Un format inconnu est rendu tel
  quel. Le lien `tel:` garde le numéro brut (`telHref`).
- `useProInterventionDays(source)` : alimente les points de `DatePicker` sur `/pro` et
  `/pro/interventions`. Il appelle `GET /api/pro/interventions/days` avec la grille visible
  (`loadDays`, branché sur `@visible-range`) et garde les comptes dans `markedDays`.
  - Cache par grille (`from/to`) : une grille déjà chargée n'est pas redemandée. Le cache est
    vidé quand la donnée de la page (`source`, le planning ou le résultat de la liste) change,
    car un déplacement ou une fin d'intervention modifie les comptes.
  - Une réponse périmée est ignorée (jeton par requête) : la page a pu invalider le cache ou
    changer de grille pendant l'appel.
  - Les erreurs sont silencieuses (les jours restent sans point, la grille est redemandée à
    la prochaine ouverture), sauf 401 et 403, traités par `useProAuthError`.
- `useProInterventionsFilters` : l'URL est la source de vérité (`status`, `from`, `to`, `page`).
  Un brouillon réactif applique les filtres dès qu'ils changent (`isSameFilters` évite un
  changement d'URL identique), sauf si la plage est invalide. `navigateWithQuery` choisit
  `router.replace` pour les filtres et `router.push` pour les pages.
- `useMobileMenu` et `MenuToggleButton.vue` (accueil et Pro) : nom accessible fixe « Menu » avec
  `aria-expanded`. Échap et tout changement de route ferment le menu. Un lien vers la page courante
  ou vers une ancre met le focus sur le titre ciblé, sinon sur le bouton. `MenuToggleButton`
  prend la prop `isMorphing` (`true` par défaut) : les trois barres se changent en croix quand le
  menu est ouvert. Dans le layout Pro, `isMorphing` vaut `false` : le panneau a sa propre croix
  (✕ de fermeture), la seconde croix ferait doublon.
- `DatePicker.vue` : `Popover` shadcn et `CalendarRoot` / `CalendarCellTrigger` de reka-ui. Nom
  accessible du bouton par `aria-labelledby` (libellé et valeur), `aria-invalid` quand il y a une
  erreur, `isLabelHidden` pour masquer le libellé,
  bornes `min` / `max`, lundi en premier. Le calendrier montre toujours 6 semaines (`fixed-weeks`),
  s'ouvre toujours sous son champ (`side-flip` désactivé) et défile en interne quand la place
  manque (`max-h` sur la hauteur disponible de reka). Le panneau n'est monté qu'à la première
  ouverture (`isPanelMounted`). Pourquoi : dans reka-ui 2.7.0, un popover téléporté et toujours
  monté dans un dialogue perturbe le `FocusScope` et fait perdre l'autofocus du dialogue. À
  revérifier pour tout composant téléporté monté dans un dialogue. Les classes du calendrier
  sont partagées avec `BookingCalendar` dans `app/constants/booking.ts` (déplacement vers
  `app/constants/form.ts` prévu, voir `TODO.md`). Le filtre de statut est un `Select` shadcn.
  - Nom du panneau : `aria-label` « Choisir la date : {libellé} » sur le `PopoverContent`.
    Pourquoi le garder : le bouton déclencheur garde son `id` (il sert à `aria-labelledby` et au
    retour du focus), donc l'`aria-labelledby` que reka pose sur le contenu pointe dans le vide.
  - Focus initial par `@open-auto-focus` (`focusCalendarDay`), qui met le focus sur le jour
    sélectionné ou courant (`tabindex="0"`). Pourquoi pas `initial-focus` : sur Safari et iOS, le
    piège à focus du `Dialog` modal n'est mis en pause qu'après un `nextTick`, et `initial-focus`
    fermait le calendrier dans « Changer la date ». Le gestionnaire appelle
    `event.preventDefault()` puis `focus()` sur la cellule.
  - Prop `markedDays` (`Record<string, number>`, date ISO vers nombre d'interventions) : un point
    décoratif (`aria-hidden`) sur le jour, et l'événement `visibleRange` qui donne
    `{ from, to }` de la grille affichée (42 jours, `CALENDAR_GRID_DAY_COUNT` dans
    `app/constants/calendar.ts`, à partir du lundi de la semaine du 1ᵉʳ du mois). Il est émis à l'ouverture puis à
    chaque changement de mois, jamais deux fois pour la même grille tant que le panneau reste
    ouvert.
  - Un jour marqué reçoit un `aria-label` complet par `calendarDayAttributes`
    (`app/utils/calendar.ts`) : « {date longue}, une intervention » ou « …, N interventions ».
    Pourquoi : reka pose son propre `aria-label` sur la cellule (la date longue), qu'un texte
    ajouté dans la cellule ne remplacerait pas. `BookingCalendar` s'en sert aussi pour « {date
    longue}, jour recommandé » (`booking.date.recommendedDay`).
  - Légende « Point : jour avec au moins une intervention, à faire ou terminée », affichée
    seulement si au moins un jour du mois affiché est marqué.
  - Les points ne suivent pas le filtre de statut de la liste : ils comptent les interventions
    `paid` et `completed`, jours passés compris (voir « Points ouverts »).
  - Sur `/pro` et `/pro/interventions`, `useProInterventionDays` fournit `markedDays` et
    `loadDays` (voir « Routes serveur »).
- `AppButton.vue` et `buttonClass` (`app/constants/buttons.ts`, `cva`) : bouton ou lien commun.
  Variantes `primary`, `secondary`, `destructive`, `warning`, `onDark`, `onDarkWarning`,
  `onDarkGhost` et `onDarkOutline`, tailles `md` (48 px) et `sm` (44 px). Props `to` (lien interne,
  `NuxtLink`), `href`, `icon`, `trailingIcon`, `isLoading` et `isDisabled`. Un bouton bloqué (en
  chargement ou désactivé) porte `aria-disabled` plutôt que `disabled`, pour garder le focus et
  la lecture par un lecteur d'écran ; son clic est annulé, et un lien bloqué devient un `a` avec
  `role="link"` sans `href`. Le contenu est dans un `span` `contents *:min-w-0` : ainsi un
  bouton en icône seule (texte `sr-only`) reste centré. `focus()` est exposé. Utilisé par les
  pages Pro, la connexion, l'espace client et `DatePicker` ; les boutons de la réservation, du
  devis et du contact restent à migrer (`TODO.md`).
- `ProDayStatusPanel.vue` (planning) : alerte du jour, avec `data-tone` (`urgent`, `warning` ou
  `info`). Elle montre le titre (`h3`), la raison, la note du jour, un conseil, une consigne et
  un seul lien d'action : « Rouvrir ce jour » ou « Augmenter la capacité de ce jour », vers
  `/pro/availability?date=` tant que la date est modifiable. Il n'y a plus de bouton « Déplacer
  l'intervention » ni de mise au focus du premier « Changer la date » (`focusFirstReschedule`
  n'existe plus) : l'admin déplace depuis le menu « … » de chaque intervention.
  - Urgente (`data-tone="urgent"`, fond rouge, bordure épaisse) dès que `dayMoveCount` dépasse 0 :
    titre « N intervention(s) à déplacer d'urgence » (`pro.dayStatus.urgent.title`, via
    `dayAlertTitle`). La consigne en gras renvoie au menu « ⋯ (Plus d'actions) » puis « Changer
    la date ». Deux variantes selon `status.kind` : jour fermé (`closedWithBookings`), qui
    renvoie au badge « À déplacer » ; dépassement de capacité (`overCapacity`), sans badge
    puisque aucune intervention n'est marquée. Les textes des consignes reprennent
    `pro.intervention.toMove` et `pro.intervention.reschedule` par messages liés (`@:`), pour
    rester d'accord avec le badge et le menu.
  - Le conseil du dépassement se base sur `dayMoveCount` : « Déplacez-en au moins N ou augmentez
    la capacité » s'il y a des interventions à déplacer, sinon `overCapacityNoMove` (« Augmentez
    la capacité de ce jour. ») quand aucune intervention `paid` n'est déplaçable ; le panneau
    garde alors le ton d'avertissement (`warning`, ambre). Un jour fermé et vide reste une
    information (`info`).
  - `app/utils/proAvailability.ts` : `dayStatus` (genre et ton), `dayStatusTitle` (titre du
    statut, aussi celui des cartes de `/pro/availability`), `dayMoveCount` (interventions `paid`
    à déplacer : toutes celles d'un jour fermé ; sinon les réservations au-delà de la capacité,
    au plus les `paid`) et `dayAlertTitle` (titre urgent s'il y a quelque chose à déplacer,
    sinon `dayStatusTitle`). La forme plurielle vient du 3ᵉ argument de `t` ; aucun paramètre
    nommé ne s'appelle `n` ou `count` dans ces titres, car vue-i18n choisirait la forme plurielle
    d'après eux avant l'argument explicite.
  - La région live de `/pro` annonce `dayAlertTitle` après le nombre d'interventions
    (`pro.planning.loadedStatus`). Le panneau n'a ni `role="alert"` ni focus automatique : il
    s'ajoute à ce qui est lu au chargement, sans voler le focus.
- `ProCapacityField.vue` : champ numérique (`NumberField` reka) de 0 à `PRO_DAY_CAPACITY_MAX`
  avec boutons plus et moins de 44 px. Dans une exception de date (`isNullable`), le champ vide
  affiche en gris la valeur de la règle (« N (règle) », `rulePlaceholder`) alors que la valeur
  enregistrée reste vide (`null` = suit la règle) ; les flèches et les boutons partent de cette
  valeur. Le texte tapé est appliqué au fil de la frappe (limité aux bornes) et une valeur
  inchangée n'est jamais réémise. Pourquoi : reka n'applique le texte qu'au `blur`, et le
  changement de mise en page provoqué au-dessus de « Enregistrer » (bouton « Suivre la règle »,
  jour fermé, erreur) déplaçait le bouton avant la fin du clic, qui tombait à côté.
  « Suivre la règle » remet `null`.
- `useProDayOverrideDrafts` : brouillons du formulaire d'exception (capacité, note, commune,
  erreurs, retour). Remis à zéro au changement de date et après le rechargement qui suit un
  enregistrement ; la réponse d'une date que l'admin a quittée ne touche pas les brouillons de
  la date affichée.
- `ProWeekdayRulesForm`, `ProDayOverrideForm`, `ProDayOverviewList` (jours signalés avec leur
  bouton de modification) et `ProFormFeedback` : formulaires de `/pro/availability`. Les messages
  d'enregistrement passent par `useLiveAnnouncement` dans la région `role="status"` de la page.
- `ProRescheduleDialog.vue` (`Dialog` reka-ui) : fenêtre « Changer la date ». Sur mobile, feuille
  basse avec une hauteur minimale pour que le calendrier tienne sous le champ ; à partir de
  `sm:`, fenêtre centrée.
  - Focus initial sur « Nouvelle date ». Une date vide donne une erreur de champ.
  - Fermeture bloquée pendant l'envoi : Échap, la croix, « Annuler » et le fond sont sans effet
    (`handleOpenChange` ; la croix et « Annuler » sont `aria-disabled`).
  - Délai de la requête `PRO_RESCHEDULE_TIMEOUT_MS`, sans nouvel essai automatique. Au dépassement,
    le message `pro.reschedule.errors.timeout` précise que le déplacement a peut-être été
    enregistré, le focus reste sur « Déplacer », et toute fermeture recharge la liste puis place
    le focus sur son titre. Un nouvel essai est protégé côté serveur (verrou de la ligne,
    `same_date`, `too_frequent`).
  - Un refus forçable affiche « Forcer quand même » (variante `destructive`) ; un autre refus
    redonne le focus à « Déplacer ».
  - Après un déplacement réussi, la fenêtre se ferme, l'annonce de succès n'est émise qu'une fois
    le contenu du dialogue démonté (`aria-hidden` retiré de la page), puis la liste se recharge et
    son titre prend le focus (`useProPageState.handleRescheduled`). Sans déplacement ni délai
    dépassé, le focus revient sur le bouton « … » de la carte qui a ouvert le menu.
  - La région `role="status"` de `/pro` et `/pro/interventions` porte `aria-live="polite"`
    explicite : `hideOthers` de reka épargne seulement les éléments `[aria-live]`, et sans cet
    attribut l'annonce serait perdue pendant que le dialogue est ouvert.
  - Dépendance technique : l'ordre d'annonce s'appuie sur reka-ui 2.7 (`FocusScope` émet
    `closeAutoFocus` pendant `scope.stop()`, et `useHideOthers` retire `aria-hidden` dans un
    `onUnmounted` après le rendu) et sur Vue 3.5. À revérifier à chaque mise à jour de reka-ui.
- `ProInterventionCard.vue` : deux rendus de la même intervention, choisis par CSS. Sous `sm`, une
  ligne compacte sombre (`ProInterventionRow.vue`) ; à partir de `sm`, la carte `MediaCard`.
  - Logique commune dans `useProInterventionCard` (`app/composables/`) : ton, pastille
    d'avancement (`interventionProgressStatus`, `PRO_PROGRESS_VIEWS` : icône et libellé), action
    (`interventionCardAction` : « Commencer », « Continuer » ou « Voir »), route de la fiche, nom du
    client, sujet pour les lecteurs d'écran, lignes de détail (date si `showDate`, bacs, formule)
    et `isReschedulable` (intervention `paid`). Les props et leurs défauts sont partagés
    (`ProInterventionCardProps`, `PRO_INTERVENTION_CARD_DEFAULTS` dans
    `app/constants/proInterventionCard.ts`).
  - Ligne mobile : pastille de statut ronde (le libellé du statut est dans un `p` `sr-only`), nom
    du client tronqué, adresse et détails sur 2 lignes au plus (`line-clamp-2`), badge « À
    déplacer » (`ProToMoveBadge.vue`, `isToMove`, texte masqué « jour fermé » pour les lecteurs
    d'écran). Le lien de la fiche est dans le titre et son `after:inset-0` couvre toute la ligne,
    qui devient cliquable. Le menu `ProRescheduleMenu` est en `relative z-10` au-dessus de ce
    lien. Les détails sont des `dt` / `dd` en ligne séparés par un point médian, leurs libellés
    en `sr-only`.
  - Carte (`sm` et plus) : pastille et libellé en `eyebrow`, badge, détails en `dl`, lien
    principal puis `ProRescheduleMenu`.
  - `ProRescheduleMenu.vue` : bouton « … » (nom « Plus d'actions pour {sujet} ») et
    `DropdownMenu` avec le seul élément « Changer la date ». Le dialogue de déplacement ne
    s'ouvre qu'à `closeAutoFocus` du menu (`openPendingReschedule`), pour ne pas se disputer le
    focus avec lui ; l'événement `reschedule` renvoie le bouton « … » pour lui rendre le focus.
  - Les listes (`ProInterventionList`) sont en `grid-cols-1` sous `md`, deux colonnes ensuite. Le
    squelette de chargement a une ligne mobile (`PRO_SKELETON_MOBILE_ROW_COUNT`, 6 lignes) et le
    `MediaCardSkeleton.vue` à partir de `sm` (qui garde ses props `tallRows` et `collapsedRows`).
- Fiche d'une intervention, `app/pages/pro/interventions/[id].vue` : charge
  `GET /api/pro/interventions/[id]` (`useFetch`, `server: false`) avec `useAccountPageState`
  (401 et 403 traités par `useProAuthError`). Le mode vient de `interventionMode` :
  `steps` (réservation `paid` dont le jour est venu, `canCompleteIntervention`), `upcoming`
  (jour pas encore venu), `completed` ou `cancelled` ; `upcoming` et `cancelled` sont en lecture
  seule, `completed` montre le récapitulatif avec « Remplacer ». Après une fin réussie, la page
  passe en `completed` sans attendre le rechargement (`completion`). Un 400 ou 404 affiche « fiche
  introuvable ». `?origin=list` mémorise l'origine : le lien « Retour » rend la liste avec ses
  filtres et sa page, lus par une liste blanche (`proListQuery`, `interventionBackRoute`) ; sans
  `origin`, il rend le planning du jour de l'intervention. `interventionPageRoute` construit le
  lien de la carte avec cette liste blanche. L'`h1` est le nom du client.
  - En-tête réduit en mode `steps` (`isHeaderMetaShown`) : seulement le `h1` (et le badge « À
    déplacer » si besoin). L'étiquette de statut et l'adresse ne s'affichent que dans les autres
    modes, car l'étape 1 montre déjà l'adresse. Pourquoi : désencombrer l'écran du téléphone, où
    l'admin ne doit voir que l'étape en cours.
  - Une seule région `role="status"` pour toute la page (`liveStatus`). Le composable
    `useProPhotoUpload` reçoit `announce` en option et y envoie ses annonces ; les étapes
    n'ont aucune région propre.
- Étapes (`ProInterventionFlow.vue`, `useProInterventionSteps`, `app/utils/proSteps.ts`,
  `app/constants/proSteps.ts`) : 1 Itinéraire, 2 Photo avant, 3 Photo après, 4 Récapitulatif.
  - L'étape est dans `?step=n`. Sans valeur valide, `initialInterventionStep` la déduit des
    photos enregistrées (aucune : 1 ; seulement la avant : 3 ; seulement l'après : 2 ; les deux : 4) et l'écrit avec `router.replace` (aucune entrée d'historique en plus). « Continuer » fait
    un `push` : le bouton retour du téléphone revient à l'étape précédente.
  - `useProStepHistory` : quand la page n'affiche plus les étapes (terminée, à venir, annulée),
    les entrées d'historique qui portent `step` sont sautées dans le sens où l'admin allait
    (`router.back()` ou `router.forward()` selon la direction du `popstate`), pour qu'un appui
    quitte la page. Sans entrée dans ce sens, ou pour toute autre navigation, `step` est retiré
    avec `replace`. Rien n'est compté, donc un rechargement ou les liens de la barre d'étapes ne le
    désynchronisent pas.
  - Focus et annonces : à chaque changement d'étape, le focus va au `h2` de l'étape (préfixe
    `sr-only` « Étape N sur 4 : »), qui nomme l'étape, rien d'autre n'est annoncé. La première
    étape est annoncée au montage. Après une fin réussie, le focus va au `h2` « Intervention
    terminée ».
  - `ProInterventionSteps.vue` : compteur « Étape N sur 4 » et quatre segments (état `current`,
    `done`, `skipped`, `todo` selon les photos). La forme dit l'état sans dépendre de la couleur
    seule (`PRO_STEP_BAR_TONES`) : faite pleine, en cours plus haute, à faire creuse, passée en
    pointillé ambre. Chaque segment autre que l'étape courante est un lien (zone de 44 px, texte
    `sr-only` : numéro, nom, état) ; l'étape courante porte `aria-current="step"`.
  - `ProStepDirections.vue` (étape 1) : carte « destination » (icône, adresse), menu
    `ProDirectionsMenu.vue` et bouton d'appel carré en icône seule quand le client a un
    téléphone (nom accessible : nom du client et numéro groupé). Le bouton « Je suis sur place »
    passe à l'étape 2.
  - `ProStepPhoto.vue` et `ProPhotoSlot.vue` : une ligne « À nettoyer » (bacs de la réservation),
    la consigne, la prise ou le remplacement de la photo avec aperçu local. Sans photo,
    « Passer cette photo » ouvre une confirmation en ligne (avertissement : sans les deux
    photos, pas de mail photos au client). Le focus va sur l'avertissement ; « Oui, passer »
    avance, « Annuler » rend le focus à « Passer cette photo ». Quand la photo arrive, la
    confirmation disparaît et « Continuer » remplace le bouton, avec le focus si l'admin était sur
    la confirmation ou sur « Passer ».
  - `ProStepRecap.vue` : les deux emplacements, avertissement des photos manquantes et
    « Terminer l'intervention ». `ProInterventionPageSkeleton.vue` : squelette de chargement.
  - `ProInterventionDetails.vue` : accordéon « Plus d'infos » sous l'étape, fermé par défaut et
    refermé quand l'identifiant de l'intervention change. Il regroupe le téléphone (lien
    `tel:`, chiffres groupés par `groupPhoneDigits`), la date, les bacs, la formule, les jours de
    collecte et le montant ; il n'a pas de ligne de paiement. Le bouton est un `button` dans un
    `h2` (`aria-expanded`, `aria-controls`).
  - Animation de l'accordéon (`app/constants/motion.ts`) : `ACCORDION_ENTER_ACTIVE_CLASS` utilise
    une courbe symétrique `cubic-bezier(0.37, 0, 0.63, 1)` sur `duration-lift`, et
    `ACCORDION_LEAVE_ACTIVE_CLASS` garde `ease-brand` sur `duration-press`. Pourquoi : à
    l'ouverture, `ease-brand` parcourait 61 % du trajet en 50 ms et l'ouverture paraissait
    instantanée.
- Itinéraire (`ProDirectionsMenu.vue`, `app/utils/navigationApps.ts`,
  `app/constants/navigationApps.ts`) : `detectNavigationPlatform` lit `navigator.userAgent` et
  `maxTouchPoints` au montage seulement (iPadOS se présente comme un Mac, l'écran tactile les
  distingue). Liste par plateforme (`NAVIGATION_APPS`) : iOS Plans, Google Maps, Waze ; Android
  Google Maps, Waze, « Autre application… » (URI `geo:0,0?q=lat,lon(adresse)`) ; Mac Google Maps,
  Waze, Plans ; autre Google Maps, Waze. Tous s'ouvrent dans un nouvel onglet sauf `geo:`, que
  Android confie à une application. Plans utilise le format `daddr` (`dirflg=d`) : celui que
  comprennent aussi les versions d'iOS antérieures à 18.4. Waze : lien profond `ll=…&navigate=yes`
  (ou `q=` sans coordonnées valides). `WazeIcon.vue` reprend le logo de simple-icons (licence CC0) ;
  Plans a une icône neutre (`Map`), car aucun logo Apple n'est librement utilisable. Le menu est un
  `DropdownMenu` shadcn.
- Envoi des photos (`useProPhotoUpload`, `app/utils/photoResize.ts`, `ProPhotoSlot.vue`) :
  - Un seul champ fichier (`accept="image/*"`, sans `capture`) : le téléphone propose l'appareil
    photo ou la galerie. Pas de `getUserMedia`, donc pas besoin de `camera=` dans
    `Permissions-Policy`.
  - `preparePhotoForUpload` décode l'image avec un élément `<img>` (qui applique l'orientation
    EXIF) puis la redessine dans un canvas : 2 000 px au plus (`PRO_PHOTO_MAX_DIMENSION`), JPEG à
    la qualité 0,85, puis 0,7 et 0,55 (`PRO_PHOTO_JPEG_QUALITIES`) tant que le fichier dépasse 5
    Mo. Le canvas ne garde aucune métadonnée. Pourquoi : une photo de téléphone pèse
    plusieurs mégaoctets et le serveur n'accepte que du JPEG de 5 Mo au plus.
  - `PUT` du JPEG brut (`Content-Type: image/jpeg`), délai `PRO_PHOTO_UPLOAD_TIMEOUT_MS` (60 s).
    Le composable est tenu par la page, pas par l'étape : l'envoi continue quand l'admin change
    d'étape, un seul à la fois. Les indicateurs locaux (`photos`) sont gardés jusqu'au rechargement
    de la fiche, et le JPEG envoyé sert d'aperçu (`URL.createObjectURL`, révoqué au démontage, d'où
    `blob:` dans `img-src` de la CSP, voir `TODO.md`).
  - Un échec est annoncé dans la région `role="status"` de la page quelle que soit l'étape. Si
    l'étape affichée n'est pas celle de la photo en échec (hors récapitulatif), une boîte visible
    avec un lien vers l'étape concernée s'affiche aussi (`ProInterventionFlow.vue`).
  - Un délai dépassé laisse le résultat inconnu (le serveur a pu l'enregistrer) : la fiche est
    rechargée avec un message, sans inviter à réessayer. 401 et 403 passent par `useProAuthError`.
- Terminer (`ProCompleteDialog.vue`, `AlertDialog` reka-ui) : « Terminer l'intervention » est
  inactif (`aria-disabled`) pendant un envoi. Avec les deux photos, la confirmation est simple ;
  sinon le dialogue passe en mode « sans photos » (titre et bouton `destructive`, texte qui nomme
  les photos manquantes) et envoie `force: true`. Si le serveur répond `missingPhotos` alors que
  la fiche croyait les photos présentes, le dialogue bascule en mode forcé. Délai
  `PRO_COMPLETE_TIMEOUT_MS` (15 s) : le résultat est inconnu, le bouton se bloque et la fiche est
  rechargée à la fermeture, comme pour le déplacement. Un refus qui rend la fiche périmée
  (`alreadyCompleted`, `notPaid`…) la recharge aussi. Le focus ne revient sur le déclencheur que
  s'il existe encore.
- `PRO_DIALOG_CONTENT_CLASS` et `PRO_DIALOG_OVERLAY_CLASS` (`app/constants/pro.ts`) : classes
  communes aux deux dialogues Pro (`ProRescheduleDialog` et `ProCompleteDialog`).
- `GoogleMapsIcon.vue` : icône officielle de 2020, téléchargée une fois depuis Wikimedia Commons
  (`https://upload.wikimedia.org/wikipedia/commons/a/aa/Google_Maps_icon_%282020%29.svg`), aucune
  requête à l'exécution. Libre de droits d'auteur mais marque Google : l'utiliser seulement pour
  pointer vers Google Maps, couleurs inchangées.

### Itinéraires Google Maps

- Le planning (`/pro`) garde le bloc de la tournée en Google Maps. L'itinéraire d'une seule
  intervention passe par le menu de la fiche (voir « Itinéraire » plus haut), dont Google Maps est
  l'une des entrées via `directionsUrl`.
- `app/utils/googleMaps.ts` : `directionsUrl` (une adresse) et `roundDirectionsUrls` (la tournée).
  Format officiel `https://www.google.com/maps/dir/?api=1&destination=…&travelmode=driving`, avec
  `origin` et `waypoints` pour la tournée.
- Les coordonnées sont utilisées si elles sont valides, sinon le texte de l'adresse. La tournée part
  du dépôt (`booking_settings`) et y revient, en ordre d'affichage. Elle est coupée en tronçons de
  `GOOGLE_MAPS_MAX_WAYPOINTS` (9) étapes, chacun partant d'où le précédent s'arrête.
- Limite connue : les navigateurs mobiles sans l'application Google Maps n'acceptent que 3 étapes.

### Ajouter un composant shadcn

La CLI shadcn-vue actuelle ne convient pas à ce projet : son registre déclare un paquet npm `cn` et
`@lucide/vue`, et relève `reka-ui` et `@vueuse`. Ajouter les composants à la main, avec les
transformations de la CLI (alias, imports), et ne jamais faire confiance aux dépendances qu'elle
installe.

### Risques acceptés

- Un rôle admin retiré ne coupe la lecture qu'après 1 h au plus, durée de vie du jeton lu par
  `getClaims`. Les écritures des lots 2 et 3 (déplacement, photos, fin d'intervention) relisent le
  compte par `auth.getUser()` (`requireAdminForWrite`).
- Les liens signés des photos valent 10 minutes et se copient : quiconque en a un l'ouvre
  jusqu'à son expiration. La RLS empêche seulement d'en obtenir un sans session valide.
- Adresse admin dédiée et non publiée : n'importe qui peut en demander un lien, et 5 liens sur 24 h
  verrouillent l'admin pour le reste de la journée.
- Un appel à `/api/pro/*` avec une session par mot de passe révoque globalement les sessions de
  cet admin. Seul celui qui connaît déjà le mot de passe peut le provoquer.

### Tests

- Cadence : les tests (unitaires, d'intégration, e2e) sont écrits et lancés une fois par
  fonctionnalité, c'est-à-dire pour toute l'étape 8 (`feat/pro-space`), à la fin du lot 3 et avant
  la fusion dans `dev`, pas après chaque lot. Les revues de code suivent en revanche chaque
  passage. Les fichiers du lot 2 ci-dessous sont écrits mais n'ont pas été rejoués : aucun
  décompte de tests pour le lot 2.
- À faire pour la passe de fin d'étape 8 (le lot 3 n'a ni test écrit ni test adapté) :
  - écrire les tests du lot 3 : `PUT` des photos (taille, 411, 413, `invalidImage`, `notPaid`,
    `futureDate`, remplacement, nettoyage du fichier orphelin), `stripJpegMetadata`, `POST`
    `complete` (codes, mail une seule fois, fin forcée sans mail), `GET /api/pro/interventions/[id]`,
    `navigationApps`, `proSteps`, `loadAccountBookingDocuments` (photos seulement si `completed`,
    reçu, cache) et le mail « photos disponibles » en intégration ;
  - adapter `tests/unit/email/booking-emails.test.ts`, qui importe `isAllowedLoginUrl` (supprimée) ;
  - adapter `tests/e2e/pro/pro-mobile.spec.ts` (« Afficher plus » n'existe plus, la carte ne
    se replie plus) ;
  - revoir les tests qui visent la carte ou la liste (`tests/e2e/pro/pro-interventions.spec.ts`,
    `tests/integration/pro/pro-interventions.test.ts`, `pro-to-move.test.ts`) : le bouton
    « Itinéraire Google Maps » a quitté la carte, « Changer la date » est dans le menu « … »,
    les interventions portent `photos` et `completedWithoutPhotos`, la page de la liste est
    `app/pages/pro/interventions/index.vue`. Ces tests n'ont pas été relus pour ce document ;
  - adapter `tests/e2e/pro/pro-availability.spec.ts` (l. 124-129 et 164-171) : le planning
    n'affiche plus les titres `dayStatus.title.closedWithBookings` et `overCapacity` dans le
    `h3` du panneau mais le titre urgent (`dayAlertTitle`, `pro.dayStatus.urgent.title`) ;
  - écrire les tests de `GET /api/pro/interventions/days`, `loadInterventionDayCounts`,
    `dayMoveCount`, `dayAlertTitle`, `groupPhoneDigits`, `parseIsoDate` / `toIsoDate`,
    `calendarDayAttributes` et `useProInterventionDays` ;
  - 27 échecs unitaires existaient déjà avant ce travail, répartis dans 7 fichiers (chiffre
    relevé le 19 octobre 2026, fichiers non listés) : à examiner avant la fusion ;
  - relancer le serveur de test du port 3001 avant `bun run test` : il tourne avec des
    auto-imports périmés (nouveaux composables et utilitaires non vus).
- Tests dans `tests/{unit,integration,e2e}/pro/`, aide `tests/support/admin.ts` (création d'un
  admin directement dans Auth, lecture des compteurs, nettoyage).
- Tests du lot 2 :
  - Unitaires : `tests/unit/pro/pro-availability.test.ts` (statut d'un jour, titres, secteur,
    codes de refus), `pro-availability-schemas.test.ts` (schémas Zod), `pro-availability-server.test.ts`
    (lectures et écritures), `pro-reschedule-server.test.ts` (déplacement, `isToMove`),
    `pro-day-override-drafts.test.ts` ;
    `tests/unit/booking/municipality-token.test.ts`,
    `tests/unit/email/booking-reschedule-email.test.ts`,
    `tests/unit/shared/button-class.test.ts` et `fetch-error.test.ts`.
  - Intégration : `tests/integration/pro/pro-availability-access.test.ts` (accès),
    `pro-availability-write.test.ts` (écritures), `pro-reschedule.test.ts` (déplacement),
    `pro-to-move.test.ts` (badge) ; `tests/integration/booking/address-search-municipality.test.ts`
    et `tests/integration/email/booking-reschedule.test.ts` (un mail par déplacement).
  - E2E : `tests/e2e/pro/pro-availability.spec.ts`, `pro-availability-form.spec.ts`,
    `pro-reschedule.spec.ts` et `pro-date-picker.spec.ts`.
  - Aides : `tests/support/pro.ts` (dates lointaines réservées aux tests, lecture et nettoyage
    des exceptions et des règles, sessions admin) et `tests/support/pro-fixtures.ts` (faux client
    Supabase et jeux de données des tests unitaires). `tests/e2e/support/pro.ts` complété.
- `tests/integration/booking/booking-reminders.test.ts` et
  `tests/integration/email/booking-reminder.test.ts` refusent de tourner tant que de vraies
  réservations payées (ou de démonstration) sont dans la fenêtre de rappel. La clé de rappel par
  date (`booking-reminder-<date>-<id>`) n'est donc vérifiée que sur une base sans telles
  réservations.
- E2E instable : `tests/e2e/pro/pro-interventions.spec.ts:152` (`ERR_ABORTED` pendant un
  rechargement du serveur de dev).
- E2E lent et fragile : chaque test ouvre sa propre session admin par lien magique (43
  connexions), et `signInNewAdmin` reste parfois bloqué sur `/pro/confirm`. Une session partagée
  (`storageState`) est prévue, voir `TODO.md`.
- Vérification de types : `bunx nuxi typecheck` échoue sur cette machine (`npx` récupère vue-tsc
  3.3.13 avec TypeScript 7) ; le projet n'a ni script `typecheck` ni `vue-tsc` en devDependency, et
  5 erreurs existaient déjà (`HeroSection.vue`, `ServicesSection.vue`, `TrustStripSection.vue`,
  `LanguageSwitcherDesktop.vue`, `LanguageSwitcherMobile.vue`). Voir `TODO.md`, étape 11.

## Hébergement

**Critères du VPS** : datacenter dans l'UE, au moins 8 Go de RAM (OSRM + supervision), 4 vCPU,
80 Go de SSD, snapshots disponibles. Candidats à comparer : Hetzner, OVHcloud, Scaleway.

**Docker Compose** :

| Service         | Rôle                               | Exposé                      |
| --------------- | ---------------------------------- | --------------------------- |
| `caddy`         | Reverse proxy, certificats HTTPS   | Oui (80/443, IP Cloudflare) |
| `nuxt`          | Application                        | Via Caddy                   |
| `osrm`          | Distances routières                | Non                         |
| `vroom`         | Optimisation des tournées          | Non                         |
| `prometheus`    | Métriques                          | Non                         |
| `loki`          | Logs                               | Non                         |
| `alloy`         | Collecte des logs Docker vers Loki | Non                         |
| `grafana`       | Tableaux de bord, alertes          | Non, accès par tunnel SSH   |
| `node-exporter` | Métriques du serveur               | Non                         |
| `cadvisor`      | Métriques des conteneurs           | Non                         |

**Sécurité du serveur** : connexion SSH par clé uniquement, root désactivé, pare-feu `ufw`,
`fail2ban`, mises à jour de sécurité automatiques (`unattended-upgrades`), posés à l'étape 12.
Le port 22 reste ouvert comme avant. `fail2ban` ne surveille que SSH : derrière Cloudflare il ne
voit que des IP Cloudflare sur 80 et 443, et bannirait Cloudflare. Les ports 80 et 443 n'acceptent que les plages d'IP publiées par Cloudflare : sinon
un attaquant qui connaît l'IP du VPS contourne le WAF et les limites de débit en l'appelant
directement.

### Cloudflare

- Plan gratuit, devant le VPS, avec le DNS proxifié (nuage orange). Cloudflare déchiffre le trafic
  puis le rechiffre vers Caddy : c'est un sous-traitant RGPD (société américaine), à lister avec
  son DPA dans la politique de confidentialité.
- DNS hébergé chez Cloudflare :
  - `A` `binovya.com` vers l'IPv4 du VPS (proxifié), `AAAA` vers l'IPv6 s'il y en a une
    (proxifié), `CNAME` `www` vers `binovya.com` (proxifié) ;
  - enregistrements Resend (TXT SPF et DKIM, `MX send`) et TXT `_dmarc` en « DNS only » : ils ne
    passent pas par le proxy ;
  - `CAA` facultatif pour limiter l'émission de certificats ; `MX` de réception seulement si une
    boîte mail est voulue.
- Limite de débit par IP, posée en règles Cloudflare (et non plus sur Caddy) sur
  `/api/auth/login`, `/api/pro/auth/login`, `/api/booking`, `/api/booking/release`,
  `/api/contact` et `/api/quote`. Le
  nombre de règles du plan gratuit est à vérifier à la pose. Les limites applicatives (par
  exemple `claim_login_link`) restent : elles protègent même si Cloudflare est contourné.
- Cloudflare Turnstile (captcha gratuit) à évaluer sur `/login`, `/booking`, `/contact` et
  `/quote`, en plus du champ piège.
- DDoS et WAF fournis par Cloudflare.
- Mode SSL « Full (strict) » : Caddy garde un certificat valide sur l'origine (Let's Encrypt ou
  Cloudflare Origin CA). Derrière le nuage orange, le défi HTTP-01 fonctionne ; le défi DNS avec
  le plugin Cloudflare est l'alternative. À trancher à la mise en place.
- Caddy lit l'IP réelle du visiteur dans `CF-Connecting-IP`, grâce à `trusted_proxies` réglé sur
  les plages Cloudflare, pour les logs et toute logique liée à l'IP. Sans cela, Caddy ne voit que
  les IP de Cloudflare.

### Caddyfile cible

Point de départ, écrit et testé en local à l'étape 10, posé sur le serveur à l'étape 12. Sans bloc `rate_limit`, il n'y a pas besoin d'une
version de Caddy compilée sur mesure. Le réglage `trusted_proxies` / `CF-Connecting-IP` (bloc
global `servers`) s'y ajoute avec les plages Cloudflare.

```
{
	email contact@binovya.com
}

www.binovya.com {
	redir https://binovya.com{uri} permanent
}

binovya.com {
	encode zstd gzip

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
		Permissions-Policy "camera=(self), microphone=(), geolocation=()"
		Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://<ref>.supabase.co; img-src 'self' data: https://<ref>.supabase.co; frame-ancestors 'none'"
		-Server
	}

	reverse_proxy nuxt:3000

	log {
		output stdout
		format json
	}
}
```

- HSTS force HTTPS côté navigateur. Les autres en-têtes bloquent le sniffing de type, l'affichage
  en iframe et les fuites de `Referer`.
- `camera=(self)` : l'étape 8 prend les photos avant/après depuis le téléphone avec un seul
  `<input type="file" accept="image/*">`, sans `capture` ni `getUserMedia`. Ce champ n'a pas besoin
  de cette permission ; elle ne servirait qu'à une caméra en direct, qui n'existe pas. À retirer
  ou à garder, à décider avec la CSP.
- La CSP démarre en `Report-Only`, puis passe en application une fois vérifiée contre Nuxt et
  Supabase. `img-src` devra aussi autoriser `blob:` (aperçu des photos choisies dans l'espace Pro). Le cookie de session est lisible par le JavaScript : la CSP est la principale parade
  au vol de session par XSS.
- Logs en JSON, pour Loki.
- Le volume `/data` de Caddy doit être persisté : il contient les certificats, et Let's Encrypt
  limite à 5 les certificats identiques par semaine.
- Port 80 pour le défi ACME et la redirection http vers https, port 443 pour le service.

## CI/CD

**CI** (GitHub Actions, à chaque push et pull request) :

1. Lint, formatage, typecheck
2. Tests
3. Build Nuxt
4. Dernier job, seulement si tout est vert : build de l'image Docker et push vers GHCR
   (`ghcr.io/mehdidiasgomes/binovya`, nom obligatoirement en minuscules).

**Tags de l'image** (générés par `docker/metadata-action`) :

| Tag                           | Quand                 | Usage                                               |
| ----------------------------- | --------------------- | --------------------------------------------------- |
| SHA du commit (ex. `1241c7d`) | Chaque build          | Immuable, seul tag utilisé pour déployer            |
| `latest`                      | Sur `main` uniquement | Repère pour un humain, jamais utilisé pour déployer |

**CD** (après la CI sur `main`) : connexion SSH au VPS, écriture du SHA dans le `.env`
(`IMAGE_TAG=<sha>`), puis `docker compose pull` et `docker compose up -d`. Le
`docker-compose.yml` référence l'image par `ghcr.io/mehdidiasgomes/binovya:${IMAGE_TAG}`.

**Rollback** : remettre le SHA précédent dans `IMAGE_TAG` et relancer
`docker compose up -d`.

**Secrets** : stockés dans GitHub Actions et dans un fichier `.env` sur le VPS, jamais dans
l'image Docker.

**Tests en CI** (décisions du 2026-10-16, à mettre en place) :

- La CI lance `bun scripts/test-run.ts unit integration`, pas `bun run test` : le e2e passe par la
  vraie page Stripe et reste local. Le script démarre son propre serveur de test sur le port 3001,
  avec les mails simulés, et son propre `stripe listen` (voir « Tests »). La CI tourne sur une VM
  neuve à chaque fois : installation de Bun et de la CLI Stripe (téléchargement court), avec le
  cache du fournisseur (clés basées sur `bun.lock`). Le Chromium de Playwright n'est pas
  nécessaire.
- Secrets de la CI : une clé Stripe `sk_test_` (`NUXT_STRIPE_SECRET_KEY` ou `STRIPE_API_KEY`,
  transmise à la CLI Stripe par l'environnement) et les clés Supabase d'un projet de test
  DÉDIÉ, jamais celles de la production. Aucune clé Resend : les mails sont simulés et le test
  de fumée Resend est ignoré sans clé.
- Garde à ajouter dans les tests : refuser de tourner si l'URL Supabase n'est pas celle du
  projet de test, comme `assertTestStripeKey` le fait pour Stripe.
- `concurrency` dans GitHub Actions : deux exécutions de la CI ne tournent jamais en même temps.
  Elles partagent la base de test et le compte Stripe de test, et le nettoyage des lignes e2e et
  des événements webhook entrerait en collision.
- Règle inchangée (`CLAUDE.md`) : tests unitaires et d'intégration en CI ; le parcours de bout
  en bout via la vraie page Stripe reste local, avant la fusion vers `main`.

## Supervision

- **Métriques** : Prometheus collecte node-exporter, cAdvisor et les métriques de Nitro.
- **Logs** : Nitro écrit des logs JSON, Alloy les envoie à Loki. Ils contiennent les IP des
  visiteurs (donnée personnelle, RGPD) : la durée de rétention dans Loki est à fixer avec
  l'étape 13 (légal) et à mettre en place à l'étape 12.
- **Alertes** : Grafana, envoyées par mail (serveur saturé, taux d'erreur, service arrêté).
- **Disponibilité** : contrôle externe gratuit, car une supervision hébergée sur le VPS ne peut
  pas signaler la panne du VPS.
- **Pas de Sentry** : les erreurs survenant dans le navigateur des clients ne sont pas
  collectées.

## Sauvegardes

Décision du 2026-10-16 : les sauvegardes passent de la V2 à l'étape 10 (infrastructure), car la
base contiendra de vraies réservations payées et des photos de clients. Rien n'est encore en
place.

- **Base** : cron nocturne sur le VPS, script shell qui lance `pg_dump` sur la base Supabase de
  production. Pas besoin de Python.
- **Photos** : copie du bucket Storage `intervention-photos`. Le dump ne contient que les
  chemins des fichiers, pas les fichiers.
- **Chiffrement** : les dumps sont chiffrés (`age` ou `gpg`) avant de quitter le VPS, car ils
  contiennent des données personnelles (RGPD).
- **Copie hors site** : stockage objet compatible S3 en UE, chez un fournisseur différent de
  celui du VPS (Backblaze B2, Scaleway, OVH). Une sauvegarde qui reste uniquement sur le VPS
  disparaît avec lui.
- **Rétention** : à définir, par exemple 7 quotidiennes, 4 hebdomadaires et 12 mensuelles. Une
  alerte prévient en cas d'échec.
- **Test de restauration mensuel automatisé** : la dernière sauvegarde est restaurée dans un
  conteneur Postgres jetable (`docker run --rm postgres:17`). Quelques comptages (nombre de
  réservations, date de la dernière) sont comparés à la production, en lecture seule, puis le
  conteneur est détruit. La production n'est jamais modifiée. Une alerte part si les comptages
  ne correspondent pas : une sauvegarde jamais restaurée n'est pas une garantie.
- **Plan Supabase** : le plan Free n'offre aucune sauvegarde automatique téléchargeable. Le plan
  Pro (25 $/mois) est l'alternative à discuter avec le client (voir « Coûts estimés »).

Le VPS se reconstruit à l'identique (code et `docker-compose.yml` dans Git, images dans GHCR,
cartes OSRM régénérables). Seul le fichier `.env` est à conserver à part, dans un gestionnaire
de mots de passe.

## Tâches planifiées

| Tâche                                                         | Outil                       |
| ------------------------------------------------------------- | --------------------------- |
| Libérer les réservations non payées (`expire_stale_bookings`) | `pg_cron`, toutes les 5 min |
| Mail de rappel (`booking:reminders`)                          | Tâche Nitro, `0 6 * * *`    |
| SMS de la veille et du jour J                                 | `pg_cron`                   |
| Mise à jour des cartes OSRM                                   | GitHub Action mensuelle     |

Le job `expire-stale-bookings` (`*/5 * * * *`) appelle `public.expire_stale_bookings()`.

### Rappel par mail (`booking:reminders`)

- Tâche Nitro (`server/tasks/booking/reminders.ts`), pas `pg_cron` : le mail part de Node, avec
  Resend. Planifiée dans `nuxt.config.ts` à `0 6 * * *`. L'heure suit le fuseau du processus :
  UTC dans le conteneur Docker, donc 7 h ou 8 h à Paris. La date cible, elle, est calculée en
  Europe/Paris.
- Fenêtre J-1 à J-2 : les réservations `paid` dont `scheduled_date` tombe demain ou après-demain
  et dont `reminder_sent_at` est vide. J-1 rattrape une réservation payée tard ou un passage
  manqué, et un envoi échoué est retenté le lendemain.
- Utilise `createServiceRoleClient()` (`server/utils/supabaseServiceClient.ts`), envoie un mail
  toutes les 600 ms au plus pour rester sous la limite de débit de Resend, puis remplit
  `reminder_sent_at` (seulement s'il est encore vide et si la réservation est toujours à la date
  annoncée). Une seule instance Nuxt doit tourner, sinon deux instances enverraient le même
  rappel. Un déplacement admin remet `reminder_sent_at` à zéro (voir « Espace Pro »).
- La planification n'existe que dans un build de production (`NODE_ENV=production`). En dev,
  aucun cron : on lance la tâche à la main avec `GET /_nitro/tasks/booking:reminders`, une route
  qui n'existe qu'en dev.

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
| `NUXT_ADDRESS_TOKEN_SECRET`  | Signature des adresses (32 caractères minimum)            |
| `BREVO_API_KEY`              | Envoi des SMS                                             |
| `OSRM_URL`                   | URL interne d'OSRM                                        |
| `VROOM_URL`                  | URL interne de VROOM                                      |

En production : `NUXT_SITE_URL` en https, clés Stripe LIVE, `NUXT_MAIL_FROM` une fois le domaine
vérifié, clés du projet Supabase de production. `NUXT_MAIL_TRANSPORT` doit rester absent : le
serveur refuse `outbox` hors développement et journalise une erreur au démarrage
(`server/plugins/mailTransportCheck.ts`).

`NUXT_ADDRESS_TOKEN_SECRET` : génération par `openssl rand -base64 48`. Absent ou trop court, la
recherche d'adresse, les disponibilités, la réservation et le devis répondent 500, et le journal
serveur nomme la variable (jamais sa valeur).

Les secrets serveur portent le préfixe `NUXT_` et sont lus à l'exécution (`runtimeConfig` dans
`nuxt.config.ts`), pas à la construction : aucun secret n'est figé dans l'image Docker.

### Mise en place de Stripe

- En local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`, puis copier le
  `whsec_` affiché dans `NUXT_STRIPE_WEBHOOK_SECRET`.
- En production : créer le endpoint webhook dans le Dashboard Stripe vers
  `/api/stripe/webhook`, avec les événements `checkout.session.completed` et
  `checkout.session.expired`, puis reporter son secret.

## Tests

**Commandes**

- `bun run test` : unitaires, puis intégration, puis e2e. Il est autonome et ne demande ni
  `bun run dev` ni `stripe listen` lancés à la main. `test:integration` et `test:e2e` passent par
  le même script (`scripts/test-run.ts`) et démarrent leur propre infrastructure, sauf si un
  serveur de test déjà lancé par `bun run test:server` peut être réutilisé (voir plus bas).
  `bun run test:unit` n'a besoin d'aucun serveur. `TEST_PORT=… bun run test` change le port ;
  `TEST_PORT` doit être un entier positif, sinon le script s'arrête.
  `scripts/test-run.ts` accepte aussi des étapes en argument (`unit`, `integration`, `e2e`).
- Arguments transmis : avec une seule étape, tout ce qui suit est passé tel quel à Vitest ou à
  Playwright (`bun run test:e2e -- --grep "…"`). Avec plusieurs étapes, le script refuse. Une
  première valeur qui n'est ni une étape ni une option donne « Étape de test inconnue ».
- Le script arrête tout à la fin, y compris sur Ctrl+C. Ton `bun run dev` sur le port 3000 peut
  continuer à tourner.
- Le script est découpé en modules dans `scripts/` : `test-run.ts` (orchestration), `test-args.ts`
  (lecture des arguments), `test-process.ts` (processus, ports, signaux), `test-infra.ts`
  (serveur de test, listener Stripe, outbox), `test-lock.ts` (verrou), `test-server-state.ts`
  (état du serveur gardé chaud) et `test-server.ts` (`bun run test:server`).

**Serveur de test gardé chaud** (`bun run test:server`)

- Il démarre le serveur de test (port 3001) et son `stripe listen`, puis les garde jusqu'à Ctrl+C
  (ou SIGHUP, SIGTERM). Pourquoi : le démarrage à froid de Nuxt coûte du temps à chaque run. Mesuré
  pour un seul test e2e : 30 s à froid, 13 s avec le serveur chaud.
- Il écrit `.cache/test-server.json` (pids, port, outbox, sans clé ni secret).
- Un run (`test-run.ts`) ne le réutilise que si tout est vrai : le fichier est valide, le port est
  tenu par le groupe de processus du serveur, son listener Stripe est vivant, l'outbox est dans
  `.mail-outbox/` et `GET /` répond 200. Sinon il démarre sa propre infrastructure. Le serveur de
  dev de l'utilisateur n'est donc jamais réutilisé.
- Le run vérifie le listener toutes les secondes et échoue s'il s'arrête.
- Les deux terminaux doivent utiliser la même clé de test Stripe.
- Si le port est déjà pris par des processus orphelins, le message affiche
  `kill -- -<pgid>` puis `kill <pid>` du listener.

**Verrou** (`.cache/test-run.lock`)

- Un seul run à la fois, car les runs partagent le serveur de test et son outbox.
- Le verrou n'est respecté que si son pid est un `test-run.ts` vivant. Un verrou périmé (pid mort
  ou réutilisé par un autre processus) est remplacé. Le message d'erreur donne le pid à arrêter.
- `bun run test:server` affiche ce message quand un run tient le port.

**Infrastructure lancée par `scripts/test-run.ts`**

- Un serveur de test sur `TEST_PORT` (3001 par défaut), démarré avec `BINOVYA_TEST_SERVER=1` :
  `nuxt.config.ts` lui donne son propre dossier de build (`.nuxt-test`) et son propre cache Vite
  (`node_modules/.cache/vite-test`), pour ne pas gêner le serveur de dev.
- Variables imposées au serveur : `NUXT_MAIL_TRANSPORT=outbox`, `NUXT_MAIL_OUTBOX_DIR`,
  `NUXT_CONTACT_EMAIL_TO=admin@binovya.test` et `NUXT_SITE_URL` sur le port de test. Aucun mail ne
  sort de la machine.
- Outbox de test : le script lit `TEST_MAIL_OUTBOX_DIR` (défaut `.mail-outbox/test-run`, constante
  `TEST_OUTBOX_DIR` de `scripts/test-outbox.ts`), pas `NUXT_MAIL_OUTBOX_DIR`. Bun charge
  `.env.local` dans `process.env` : un réglage d'outbox de développement aurait été vidé par le
  `rm -rf` du script. Avant tout démarrage, `resolveTestOutboxDir` vérifie que le chemin résolu
  est strictement dans `<projet>/.mail-outbox/` ; sinon le script s'arrête (code 1). Le dossier
  est vidé à chaque exécution, puis son chemin absolu est exporté en `NUXT_MAIL_OUTBOX_DIR` vers
  le serveur de test et les processus de test.
- Son propre `stripe listen`, avec le secret du webhook lu par `--print-secret`. Si un autre
  `stripe listen` tourne déjà, le script refuse de démarrer : sinon le serveur de dev recevrait les
  paiements de test et enverrait de vrais mails. Le script s'arrête aussi si son listener meurt.
- Clé Stripe (`scripts/stripe-key.ts`) : `STRIPE_API_KEY`, sinon `NUXT_STRIPE_SECRET_KEY`
  (environnement, puis `.env.local`), uniquement `sk_test_`. Elle est transmise à la CLI par
  l'environnement, jamais par `--api-key` : une clé de test a déjà fuité dans une sortie de `ps`.
  Un avertissement s'affiche si les deux clés diffèrent, car elles doivent viser le même compte
  Stripe.
- Pour éviter qu'un rechargement de Vite coupe un test en cours, `vite.optimizeDeps.include`
  liste les dépendances à pré-optimiser et `tests/e2e/global-setup.ts` visite chaque page avant le
  premier test. Si une étape échoue, le script affiche les événements Vite (`optimized`,
  `reload`).

**Organisation**

- `tests/{unit,integration,e2e}/<domaine>/` avec les domaines `account`, `booking`, `contact`,
  `email`, `pro`, `shared` et `scripts`. Noms de fichiers en kebab-case. Les aides communes sont dans
  `tests/support/` (`api`, `db`, `seed`, `env`, `dates`, `account`, `admin`, `outbox`, `pro`,
  `pro-fixtures`) ; celles propres au e2e dans `tests/e2e/support/`.
- Un test d'intégration par gabarit de mail, dans `tests/integration/email/` : confirmation,
  alerte admin de paiement, remboursement après paiement tardif, rappel, changement de date,
  lien de connexion, alerte de suppression, contact et devis. Ils lisent l'outbox (`tests/support/outbox.ts`). Le
  mail « photos disponibles » n'a qu'un test unitaire de gabarit : son test d'intégration (envoi
  par la route de fin d'intervention) est à écrire dans la passe de fin d'étape 8.
- Les autres tests ne vérifient pas les mails, sauf les parcours qui en ont besoin (lien de
  connexion) et l'idempotence.
- Clients créés par les tests : `e2e+…@binovya.test`. Le nettoyage supprime ce motif.
- Un seul appel à Resend dans toute la suite : `tests/integration/email/resend-smoke.test.ts`,
  en lecture seule (`GET /domains`). Il vérifie que la clé est valide et que le domaine de
  l'expéditeur est vérifié. Il est ignoré sans `NUXT_RESEND_API_KEY`, et n'envoie aucun mail.
- Le test d'intégration des rappels refuse de tourner s'il existe une vraie réservation payée
  dans la fenêtre J+1..J+2 : la tâche la traiterait, marquerait son rappel comme envoyé et le
  client ne le recevrait jamais.
- Playwright (`playwright.config.ts`) : `actionTimeout` 10 s, `expect` 5 s (10 s explicite sur le
  titre de la page `/en` au premier chargement). `restoreViewport`
  (`tests/e2e/support/booking.ts`) : Chromium peut réduire la fenêtre à 0×0 au deuxième retour de
  Stripe ; l'aide la redimensionne puis attend qu'elle ait une taille.
- Capacité : `tests/integration/booking/booking-capacity.test.ts`. Journée pleine : 409
  `dayTaken`, aucune ligne créée. Refus de secteur (plus de 15 km de la première réservation du
  jour) avec de vraies communes (Thionville, Cattenom, Woippy), accepté un autre jour. Cinq
  requêtes simultanées sur la dernière place, sur trois dates : une seule réussit.
- Dernier passage complet : environ 8 min, le 2026-10-16 (branche `fix/booking-address-token`) :
  623 tests unitaires, 182 d'intégration, 61 e2e.
- Limites connues, laissées volontairement : `bun run test:server` lancé pendant qu'un run à froid
  démarre encore Nuxt affiche le message « autre `stripe listen` » au lieu de celui du verrou ;
  une course très rare sur un verrou périmé sous forte charge ; `TEST_PORT` au-dessus de 65535 ou
  vide n'est pas traité spécialement.

**Process des agents** (`.claude/agents/`)

- `ui-stylist` n'utilise que la skill `ui-ux-pro-max` (`frontend-design` est retirée).
- Chaque passage de code est suivi d'un `code-reviewer` neuf.
- Les fiches des agents ont une liste « Mistakes already made, do not repeat », tenue par
  l'orchestrateur.

## Légal

- L'hébergeur du VPS et Supabase figurent dans les mentions légales.
- Toutes les données restent dans l'UE, à une exception près : Cloudflare (société américaine)
  déchiffre le trafic en transit. Il figure comme sous-traitant, avec son DPA.
- Un accord de traitement des données (DPA) est signé avec chaque fournisseur.

## Points ouverts

- Choix du VPS et du fournisseur.
- Conditions d'usage de l'API geoportail.lu.
- Environnement de préproduction (branche `dev`) : oui ou non ?
- Domaine `binovya.com` à vérifier sur Resend : tant que ce n'est pas fait, l'expéditeur reste
  `contact@dg-zenith.com` (repli de `NUXT_MAIL_FROM`).
- Incohérence connue : `parseSecureUrl` accepte `http://localhost` même en production, alors que
  `resolveSiteUrl` (`server/utils/siteUrl.ts`) n'accepte http qu'en développement. Elle est
  assumée pour `emailSitePageUrl` (le mail part sans lien plutôt que pas du tout) mais reste à
  trancher.
- `has_recent_sign_in()` et `is_admin()` acceptent un timestamp d'`amr` transmis en chaîne
  numérique (la regex de `oldest_link_sign_in_at()`, qu'elles partagent, ne vérifie pas le type
  JSON), alors que l'application exige un nombre. À trancher dans une future migration.
- Sans `NUXT_SITE_URL`, `POST /api/booking` journalise deux fois l'erreur (`assertCheckoutSiteUrl`
  puis `resolveSiteUrl`). Sans conséquence.
- La région `role="status"` de `/pro/availability` n'a pas d'`aria-live="polite"` explicite, contrairement
  à `/pro` et `/pro/interventions` (là où un dialogue peut être ouvert). Sans conséquence tant que
  la page n'ouvre aucun dialogue, à ajouter sinon.
- reka-ui 2.7 : deux comportements internes sont utilisés (ordre d'émission de `closeAutoFocus`
  du dialogue de déplacement, et `FocusScope` d'un popover téléporté dans un dialogue). À
  revérifier à chaque mise à jour de reka-ui (voir « Espace Pro », client).
- `tests/e2e/customer-area.spec.ts` approche la limite de 350 lignes (310) : le découper avant d'y
  ajouter des tests.
- La branche « développement » de `isMailConfigured()` (valeur inconnue refusée, outbox permise)
  n'est pas testable en unitaire : `import.meta.dev` est figé à la construction. Elle n'est
  couverte que par les tests d'intégration.
- Réglages par défaut de Supabase : les nouvelles fonctions du schéma `public` sont exécutables par
  `anon` et `authenticated` (`pg_default_acl`). Chaque migration doit donc retirer l'exécution des
  fonctions sensibles. Durcissement possible plus tard (idée, non fait) :
  `alter default privileges … revoke execute on functions from anon, authenticated`.
- 8 fichiers échouent à `prettier --check` sur `dev`, sans lien avec l'étape en cours :
  `BeforeAfterSection`, `OffersSection`, `ServicesSection`, `TrustStripSection`,
  `layouts/footer`, `pages/about`, `i18n/locales/fr/solutions.ts` et `README.md`. À corriger dans
  un chore dédié.
- E2E instable, `booking-payment.spec.ts` n° 2 : le bouton « Payer » sort de la fenêtre sur la
  page Stripe (3 échecs sur environ 6 passages). À traiter dans une branche dédiée (taille de la
  fenêtre, défilement jusqu'au bouton).
- E2E instable, `booking-payment.spec.ts` n° 8 : délai dépassé de l'API d'adresse externe.
- Délai dépassé ponctuel du nettoyage Supabase dans le `beforeAll` de
  `tests/integration/account/account-deletion.test.ts` (une fois).
- Environ 81 durées de survol et d'appui du site ne passent pas encore par les jetons de mouvement
  (`duration-press`, `duration-lift`). Branche dédiée prévue.
- `hasLoaded` de `useAccountPageState` reprend les conditions du gabarit (faible).
- `NuxtImg` : ajouter `sizes` dès qu'une `MediaCard` affiche réellement une image.
- Des textes promettent encore des « photos avant/après » (description SEO de `/login`, sous-titre
  du tableau de bord) : conservés volontairement, les photos existent depuis l'étape 8 mais le
  texte est à relire avec le client.
- Aucun `<html lang>` sur le site (WCAG 3.1.1) : à poser avec `useLocaleHead` dans `app.vue`,
  dans la branche SEO (`TODO.md`).
- Étape 8 : trois passes à revoir à chaque mise à jour de reka-ui 2.7 et de Vue 3.5, car l'ordre
  du focus et des annonces en dépend : dialogue de déplacement, dialogue de fin
  (`ProCompleteDialog`, `closeAutoFocus` puis annonce au tick suivant) et menu « … » de la carte
  (`openPendingReschedule`).
- Nettoyage des photos : aucune purge (durée de conservation à décider, `TODO.md` étapes 10 et 13).
- Les points de `DatePicker` des filtres de `/pro/interventions` ne suivent pas le filtre de
  statut : ils comptent toujours les interventions `paid` et `completed`, jours passés compris.
- `role="list"` sur les listes stylées (`ul` en grille de `ProInterventionList`) est bloqué par la
  règle `vuejs-accessibility/no-redundant-roles`. Décision de l'utilisateur en attente.
- Libellés « Continuer » (`pro.steps.next`) des étapes photo : décision de l'utilisateur en
  attente.

## Coûts estimés

> Prix relevés le 2026-10-14. Les hébergeurs ont augmenté leurs tarifs en 2026 (hausse du
> prix de la RAM), à revérifier sur le site officiel au moment de commander.

### Dimensionnement du VPS

Estimation de la consommation de chaque service en fonctionnement normal :

| Service                           | RAM          | Disque       |
| --------------------------------- | ------------ | ------------ |
| Système + Docker                  | 500 Mo       | 8 Go         |
| Nuxt (Nitro)                      | 300 à 500 Mo | 1 Go (image) |
| OSRM (Lorraine + Luxembourg, MLD) | 1 Go         | 3 Go         |
| VROOM                             | 100 Mo       | 200 Mo       |
| Caddy                             | 50 Mo        | 100 Mo       |
| Prometheus (rétention 15 jours)   | 300 à 600 Mo | 5 Go         |
| Loki (rétention 30 jours)         | 300 à 500 Mo | 5 Go         |
| Grafana                           | 150 à 250 Mo | 500 Mo       |
| Alloy                             | 150 à 300 Mo | 200 Mo       |
| cAdvisor + node-exporter          | 150 à 250 Mo | 100 Mo       |
| **Total**                         | **3 à 4 Go** | **≈ 25 Go**  |

**Besoin retenu** : 8 Go de RAM et au moins 75 Go de disque, soit une marge d'environ 2× sur
la RAM et 3× sur le disque. Le prétraitement des cartes OSRM, le plus gourmand, se fait dans
la CI et ne compte pas dans ce budget.

### Comparatif des VPS (8 Go de RAM)

| Offre               | vCPU | RAM       | Disque      | Datacenter UE       | Prix / mois                 | Remarques                                              |
| ------------------- | ---- | --------- | ----------- | ------------------- | --------------------------- | ------------------------------------------------------ |
| **OVHcloud VPS-1**  | 4    | 8 Go      | 75 Go       | France              | **7,79 €** HT               | Société et datacenter français, support en français    |
| Contabo Cloud VPS 4 | 4    | 8 Go      | 100 Go SSD  | Allemagne           | 5,50 € (4,40 € sur 24 mois) | Le moins cher, performances et support moins réguliers |
| netcup VPS 1000 G12 | 4    | 8 Go DDR5 | 256 Go NVMe | Allemagne, Autriche | 10,37 € TTC                 | Le plus de disque, facturation à l'heure possible      |
| Hetzner Cloud CPX32 | 4    | 8 Go      | 160 Go      | Allemagne, Finlande | —                           | Plus commandable (offres cloud indisponibles)          |

**Recommandation** : OVHcloud VPS-1. Données hébergées en France, ce qui simplifie les
mentions légales et le RGPD, et prix proche du moins cher. Contabo reste l'option la plus
économique si le budget prime.

### Coûts mensuels fixes

| Poste                                  | Lancement                        | Quand l'activité démarre                             |
| -------------------------------------- | -------------------------------- | ---------------------------------------------------- |
| VPS (OVHcloud VPS-1)                   | 7,79 € HT                        | 7,79 € HT                                            |
| Supabase                               | 0 € (Free)                       | 25 $ ≈ 22 € (Pro, sauvegardes quotidiennes incluses) |
| Resend                                 | 0 € (3 000 mails/mois, 100/jour) | 20 $ ≈ 18 € (Pro, 50 000 mails/mois) si besoin       |
| GHCR (images Docker)                   | 0 €                              | 0 €                                                  |
| OSRM, VROOM, Prometheus, Grafana, Loki | 0 € (open source)                | 0 €                                                  |
| Géoplateforme IGN                      | 0 €                              | 0 €                                                  |
| Contrôle de disponibilité externe      | 0 € (offre gratuite)             | 0 €                                                  |
| Stockage objet des sauvegardes (UE)    | À chiffrer                       | À chiffrer (dépend du volume de photos)              |
| Domaine `binovya.com`                  | Déjà acquis                      | Renouvellement annuel                                |
| **Total**                              | **≈ 8 € / mois**                 | **≈ 30 € / mois**                                    |

**Limites du plan Supabase Free** : 500 Mo de base, 1 Go de fichiers, projet mis en pause
après une semaine sans activité, aucune sauvegarde. Avec des photos compressées à environ
300 Ko, 1 Go représente environ 1 600 interventions (2 photos chacune).

### Coûts variables par réservation

| Poste                             | Coût                                        |
| --------------------------------- | ------------------------------------------- |
| Stripe, carte européenne standard | 1,5 % + 0,25 €                              |
| Stripe, carte européenne premium  | 2,8 % + 0,25 €                              |
| SMS Brevo (France)                | ≈ 0,045 € par SMS, soit ≈ 0,09 € pour 2 SMS |

Exemples de frais Stripe (carte standard) : 0,69 € sur 29 €, 0,99 € sur 49 €, 1,75 € sur
100 €.

### Sources

- [OVHcloud, hausse des prix VPS 2026 (Digitiz)](https://digitiz.fr/hausse-prix-vps-2026/)
- [OVHcloud VPS-1, caractéristiques (VPSBenchmarks)](https://www.vpsbenchmarks.com/hosters/ovhcloud)
- [Contabo Cloud VPS](https://contabo.com/en/vps/)
- [netcup VPS G12 (Valebyte, juillet 2026)](https://valebyte.com/en/blog/netcup-review-2026-the-price-performance-king-and-its-fine-print/)
- [Hetzner, offres Regular Performance](https://www.hetzner.com/cloud/regular-performance/)
- [Hetzner, hausse de juin 2026 (WZ-IT)](https://wz-it.com/en/blog/hetzner-price-increase-june-2026-cpx-ccx-alternatives/)
- [Supabase, tarifs](https://supabase.com/pricing)
- [Stripe France, tarifs](https://stripe.com/fr/pricing)
- [Resend, tarifs](https://resend.com/pricing)
- [Brevo, prix des SMS (Digitiz)](https://digitiz.fr/blog/logiciels-envoyer-sms-en-masse/)
- [GitHub Packages, facturation](https://docs.github.com/en/billing/concepts/product-billing/github-packages)
