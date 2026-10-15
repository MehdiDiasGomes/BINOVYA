# Spec technique

> Statut : en cours de définition. Dernière mise à jour : 2026-10-15.
> Spec fonctionnelle associée : [booking-system.md](./booking-system.md).

## Vue d'ensemble

```
                         Internet
                            │
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

   Services externes : Supabase (UE) · Stripe · Resend · Brevo · Géoplateforme IGN · geoportail.lu
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
  taille de requête plafonnée. Une limite de débit par IP reste à poser sur Caddy au
  déploiement.
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
- Erreurs : 503 si `NUXT_RESEND_API_KEY` ou `NUXT_CONTACT_EMAIL_TO` manque, 502 si l'envoi échoue
  (Resend en erreur ou sans réponse après 5 s). Le client voit donc un échec plutôt qu'un faux
  succès.
- Une limite de débit par IP reste à poser sur Caddy.

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
  remboursement), `bookingAdminEmail` (alerte BINOVYA) et `photosAvailableEmail`.
- Logique d'envoi dans `server/utils/bookingEmails.ts` : le client reçoit les mails avec
  `NUXT_CONTACT_EMAIL_TO` en `replyTo`.

| Mail                             | Déclencheur                                            |
| -------------------------------- | ------------------------------------------------------ |
| Confirmation au client           | Webhook, `confirm_booking_payment` renvoie `paid`      |
| Alerte admin (réservation payée) | Idem, à `NUXT_CONTACT_EMAIL_TO`                        |
| Annulation et remboursement      | Webhook, `refund_required` ou `not_payable`            |
| Rappel                           | Tâche `booking:reminders` (voir « Tâches planifiées ») |
| Photos disponibles               | Gabarit prêt, pas encore appelé                        |

- Pas de mail de remboursement si la charge était déjà remboursée (`charge_already_refunded`) :
  un événement Stripe rejoué ne prévient pas deux fois.
- Clés d'idempotence Resend `booking-confirmation-<id>`, `booking-admin-alert-<id>`,
  `booking-refund-<id>`, `booking-reminder-<id>` et `booking-photos-<id>`. Resend les garde 24
  heures.
- Le bouton « Réserver une autre date » du mail de remboursement pointe vers `/booking` sur
  `NUXT_SITE_URL`.
- `sendPhotosAvailableEmail` n'envoie que si le lien de connexion vise l'hôte Supabase ou celui de
  `NUXT_SITE_URL` (`isAllowedLoginUrl`, https sauf `localhost`), pour qu'un lien détourné ne
  parte jamais dans un mail de BINOVYA.
- Limites connues :
  - Si Resend échoue au moment du paiement, la confirmation est perdue : il n'y a pas de nouvel
    essai.
  - Un rappel peut partir deux fois si l'écriture de `reminder_sent_at` échoue après l'envoi.
  - `sendPhotosAvailableEmail` existe mais n'est pas appelé : le lien magique arrive à l'étape 7,
    le déclenchement à l'étape 8.

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
  `NUXT_SITE_URL` est obligatoire, en https hors développement, sinon 503 « Payment unavailable ».
- Codes d'erreur : 409 `dayTaken`, 409 `pendingPayment`, 422 `outOfArea`, `quoteRequired`,
  `binsNotConfirmed`. Tout autre refus de `create_booking` donne 400 « Booking rejected ». Le code
  métier est lu par le front dans `data.code`. 502 si la création de la session échoue, 500 si le
  rattachement de la session à la réservation échoue : dans les deux cas la session est expirée
  et la réservation libérée.
- Un client n'a qu'une réservation `pending_payment` active : sinon 409 `pendingPayment`. Le
  contrôle se fait dans `create_booking` sous un verrou consultatif par client, pour que deux
  requêtes simultanées ne passent pas toutes les deux. Index
  `bookings_customer_id_status_expires_at_idx`.
- Anti-abus : champ piège `website`. S'il est rempli, l'API renvoie un faux succès qui redirige
  vers `?checkout=cancelled` et ne crée rien. Limite de débit par IP sur `/api/booking` et
  `/api/booking/release` : à poser sur Caddy (étape 10).

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

## Hébergement

**Critères du VPS** : datacenter dans l'UE, au moins 8 Go de RAM (OSRM + supervision), 4 vCPU,
80 Go de SSD, snapshots disponibles. Candidats à comparer : Hetzner, OVHcloud, Scaleway.

**Docker Compose** :

| Service         | Rôle                               | Exposé                    |
| --------------- | ---------------------------------- | ------------------------- |
| `caddy`         | Reverse proxy, certificats HTTPS   | Oui (80/443)              |
| `nuxt`          | Application                        | Via Caddy                 |
| `osrm`          | Distances routières                | Non                       |
| `vroom`         | Optimisation des tournées          | Non                       |
| `prometheus`    | Métriques                          | Non                       |
| `loki`          | Logs                               | Non                       |
| `alloy`         | Collecte des logs Docker vers Loki | Non                       |
| `grafana`       | Tableaux de bord, alertes          | Non, accès par tunnel SSH |
| `node-exporter` | Métriques du serveur               | Non                       |
| `cadvisor`      | Métriques des conteneurs           | Non                       |

**Sécurité du serveur** : connexion SSH par clé uniquement, root désactivé, pare-feu `ufw`
(22, 80, 443), `fail2ban`, mises à jour de sécurité automatiques (`unattended-upgrades`).

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

## Supervision

- **Métriques** : Prometheus collecte node-exporter, cAdvisor et les métriques de Nitro.
- **Logs** : Nitro écrit des logs JSON, Alloy les envoie à Loki.
- **Alertes** : Grafana, envoyées par mail (serveur saturé, taux d'erreur, service arrêté).
- **Disponibilité** : contrôle externe gratuit, car une supervision hébergée sur le VPS ne peut
  pas signaler la panne du VPS.
- **Pas de Sentry** : les erreurs survenant dans le navigateur des clients ne sont pas
  collectées.

## Sauvegardes

Prévues en V2, rien n'est mis en place en V1 pour éviter de complexifier le lancement.

Pistes pour la V2 : `pg_dump` de la base et copie du bucket photos vers un stockage objet
compatible S3 en région UE, chez un fournisseur différent de celui du VPS.

En V1, le VPS se reconstruit à l'identique (code et `docker-compose.yml` dans Git, images
dans GHCR, cartes OSRM régénérables). Seul le fichier `.env` est à conserver à part, dans un
gestionnaire de mots de passe.

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
  `reminder_sent_at` (seulement s'il est encore vide). Une seule instance Nuxt doit tourner, sinon
  deux instances enverraient le même rappel.
- La planification n'existe que dans un build de production (`NODE_ENV=production`). En dev,
  aucun cron : on lance la tâche à la main avec `GET /_nitro/tasks/booking:reminders`, une route
  qui n'existe qu'en dev.

## Variables d'environnement

| Variable                     | Usage                                                   |
| ---------------------------- | ------------------------------------------------------- |
| `NUXT_PUBLIC_SUPABASE_URL`   | URL du projet Supabase                                  |
| `NUXT_PUBLIC_SUPABASE_KEY`   | Clé publique Supabase                                   |
| `NUXT_SUPABASE_SECRET_KEY`   | Clé secrète Supabase, serveur uniquement                |
| `NUXT_RESEND_API_KEY`        | Envoi des mails                                         |
| `NUXT_MAIL_FROM`             | Expéditeur des mails (repli : `contact@dg-zenith.com`)  |
| `NUXT_CONTACT_EMAIL_TO`      | Contact, alerte de réservation payée, `replyTo` clients |
| `NUXT_STRIPE_SECRET_KEY`     | Paiement                                                |
| `NUXT_STRIPE_WEBHOOK_SECRET` | Vérification des webhooks Stripe                        |
| `NUXT_SITE_URL`              | URL publique : retour Stripe (https en prod.), mail     |
| `BREVO_API_KEY`              | Envoi des SMS                                           |
| `OSRM_URL`                   | URL interne d'OSRM                                      |
| `VROOM_URL`                  | URL interne de VROOM                                    |

Les secrets serveur portent le préfixe `NUXT_` et sont lus à l'exécution (`runtimeConfig` dans
`nuxt.config.ts`), pas à la construction : aucun secret n'est figé dans l'image Docker.

### Mise en place de Stripe

- En local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`, puis copier le
  `whsec_` affiché dans `NUXT_STRIPE_WEBHOOK_SECRET`.
- En production : créer le endpoint webhook dans le Dashboard Stripe vers
  `/api/stripe/webhook`, avec les événements `checkout.session.completed` et
  `checkout.session.expired`, puis reporter son secret.

## Tests

- Clients créés par les tests : `delivered+e2e-…@resend.dev`, adresse que Resend accepte toujours,
  pour que les vrais envois ne rebondissent jamais. Le nettoyage supprime ce motif et l'ancien
  `e2e+…@binovya.test`.
- `bun run test:integration` demande `NUXT_RESEND_API_KEY` avec un accès en lecture
  (`GET /emails`, pour vérifier les mails envoyés) et `NUXT_CONTACT_EMAIL_TO`.
- Le test d'intégration des rappels refuse de tourner s'il existe une vraie réservation payée
  dans la fenêtre J+1..J+2, car la tâche enverrait un vrai rappel à un vrai client.

## Légal

- L'hébergeur du VPS et Supabase figurent dans les mentions légales.
- Toutes les données restent dans l'UE.
- Un accord de traitement des données (DPA) est signé avec chaque fournisseur.

## Points ouverts

- Choix du VPS et du fournisseur.
- Conditions d'usage de l'API geoportail.lu.
- Environnement de préproduction (branche `dev`) : oui ou non ?
- Domaine `binovya.com` à vérifier sur Resend : tant que ce n'est pas fait, l'expéditeur reste
  `contact@dg-zenith.com` (repli de `NUXT_MAIL_FROM`).

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
