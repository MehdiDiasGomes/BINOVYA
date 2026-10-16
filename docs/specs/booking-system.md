# Système de réservation en ligne

> Statut : brainstorming, rien n'est développé. Dernière mise à jour : 2026-10-15.

## Objectif

Permettre à un client de réserver une intervention, de la payer en ligne, puis de consulter
ses réservations et les photos avant/après depuis son espace client.

## Parcours

1. Le client saisit son adresse, puis choisit une ou plusieurs prestations et leur quantité.
2. Il indique le ou les jours de collecte de ses bacs (ou « je ne sais pas »).
3. Il choisit un jour parmi ceux ouverts pour son secteur.
4. Il saisit ses coordonnées. Une mention l'informe que ses données servent à exécuter la
   réservation et qu'il pourra ouvrir son espace client via un lien qu'il demande lui-même.
5. Il paie via Stripe Checkout.
6. Il reçoit un mail de confirmation dès le paiement, avec un lien « Suivre ma réservation » vers
   `/login`. Un rappel par mail suit entre J-1 et J-2 (heure de Paris), puis les SMS (la veille et
   le jour J).
7. Après l'intervention, l'admin dépose une photo avant et une photo après. Le client reçoit un
   mail l'informant que ses photos sont disponibles dans son espace client, avec un tutoriel pas
   à pas pour s'y connecter. Le lien du bouton est à décider à l'étape 8 (voir `TODO.md`).
8. Le client demande un lien de connexion sur `/login`, puis consulte ses réservations et ses
   photos aussi souvent qu'il le souhaite, pendant 7 jours après chaque clic sur un lien.

## Services retenus

| Besoin                           | Service                                                  | État                 |
| -------------------------------- | -------------------------------------------------------- | -------------------- |
| Mail                             | Resend                                                   | Déjà en place        |
| SMS                              | Brevo                                                    | À connecter          |
| Paiement                         | Stripe                                                   | Connecté (mode test) |
| Comptes, base de données, photos | Supabase                                                 | À connecter          |
| Géocodage des adresses           | Géoplateforme IGN (France) et geoportail.lu (Luxembourg) | À connecter          |
| Distances routières et tournées  | OSRM et VROOM (auto-hébergés)                            | À installer          |

En production, tous les comptes sont au nom du client final, le développeur y est invité.
En développement : Stripe en mode test sur le compte du développeur, Supabase dans une
organisation dédiée au client (transférable).

- **Supabase** : plan gratuit au lancement, avec maintien en vie programmé
  par action GitHub. Sauvegardes prévues en V2. Passage au plan Pro quand l'activité est réelle.
- **Hébergement** : VPS européen avec Docker, détaillé dans [technical.md](./technical.md).

## Schéma de données

Source de vérité : `supabase/migrations/`. Vue d'ensemble :

```
profiles                      price_grid
--------                      ----------
id (= auth.users.id)          plan (one_off | quarterly | annual)
email                         small_bin_count (0 à 2)
first_name                    large_bin_count (0 à 2)
last_name                     price_cents
phone                         (combinaison absente = devis)
login_link_sent_at
login_link_count
login_link_window_start
deletion_requested_at

bookings                              intervention_photos
--------                              -------------------
id                                    id
customer_id  -> profiles.id           booking_id -> bookings.id
scheduled_date                        kind (before | after)
address, city, postcode, country_code storage_path
latitude, longitude
plan                                  quote_requests
small_bin_count, large_bin_count      --------------
household_collection_weekdays         id
recycling_collection_weekdays         first_name, last_name, company
bins_ready_confirmed_at               email, phone
status (pending_payment | paid |      address, city, postcode, country_code
        completed | cancelled |       latitude, longitude
        expired)                      equipment (bins | pav | urban_furniture
amount_total_cents                      | signage, au moins un)
                                      small_bin_count, large_bin_count (0 sans bacs)
                                      plan
stripe_checkout_session_id            comment, photo_paths
stripe_payment_intent_id              status (new | answered | closed)
expires_at
reminder_sent_at
day_of_sms_sent_at
completed_at

availability_rules            availability_overrides        booking_settings (1 ligne)
------------------            ----------------------        --------------------------
weekday (0 à 6)               date                          depot_latitude, depot_longitude
max_bookings (0 = fermé)      max_bookings (0 = fermé)      service_area_radius_km
                              sector_latitude               day_sector_radius_km
                              sector_longitude              min_lead_days, horizon_days
```

Fonctions réservées au serveur : `get_availability` (statut de chaque jour pour une adresse),
`create_booking` (contrôle, calcul du prix et blocage de la place en une transaction),
`confirm_booking_payment` (confirme un paiement reçu, sous le verrou du jour),
`expire_stale_bookings` (libère les réservations non payées), `claim_login_link` (plafond d'envoi
des liens de connexion). `has_recent_sign_in()` sert aux policies RLS.

## Règles

- **Créneau** : le client réserve un jour, jamais une heure. Le passage ce jour-là est garanti.
- **Capacité** : `availability_rules` fixe le nombre d'interventions par jour de semaine,
  `availability_overrides` gère les exceptions (congés, jours fériés, journée renforcée).
- **Secteur du jour** : la première réservation d'un jour fixe son secteur. Le jour ne reste
  ouvert qu'aux adresses situées à moins de **15 km** de ce point. L'admin peut aussi
  imposer à l'avance le secteur d'un jour.
- **Zone desservie** : **30 km** autour du dépôt (Uckange, 57270) pour commencer, au-delà la réservation est
  refusée. Les deux rayons sont des valeurs de configuration, modifiables sans redéploiement.
- **Jour de collecte** : règle souple. Le jour de collecte et le lendemain sont mis en avant
  comme recommandés, les autres jours restent réservables avec l'avertissement « vos bacs
  doivent être vides ». Le SMS de la veille le rappelle.
- **Place bloquée** : la place est prise dès la création de la réservation, dans une
  transaction, pour 35 minutes. Elle est libérée (`expired`) si la session Stripe expire sans
  paiement, si le client abandonne ou revient en arrière, ou par la tâche planifiée.
- **Une réservation en attente par client** : tant qu'une réservation `pending_payment` est
  active, une nouvelle est refusée.
- **Paiement tardif** : un paiement reçu après la libération est accepté si le jour est encore
  disponible. Sinon la réservation est annulée et Stripe rembourse automatiquement. Un paiement
  sur une réservation déjà annulée est aussi remboursé. Dans les deux cas, le client reçoit un
  mail d'annulation et de remboursement. Aucun mail si la charge était déjà remboursée.
- **Alerte BINOVYA** : chaque réservation payée envoie aussi un mail à l'adresse de contact de
  BINOVYA.
- **Bornes** : délai minimum avant intervention et horizon maximum de réservation, à définir.
- **Paiement** : la réservation est créée en `pending_payment`, le webhook Stripe la passe en `paid`.
- **Public** : particuliers et professionnels réservent en ligne sur la même grille tarifaire
  (1 ou 2 bacs, hors 1 petit + 1 grand). Au-delà, ou pour d'autres équipements et les remises de
  volume, ils demandent un devis sur `/quote`, page unique pour tous les publics.
  `/quote` couvre bacs, PAV, mobilier urbain et signalétique, au moins un type à cocher. Le
  nombre de bacs n'est demandé que si « bacs » est coché.
- **Contact** : `/contact` sert aux questions et aux demandes de rendez-vous (objet
  `meeting`, `info` ou `other`), pas aux devis. Les liens « adresse hors zone » et « aucune date
  disponible » du parcours de réservation y mènent.
- **Prestations** : une réservation contient une ou plusieurs lignes (`booking_items`), une
  par prestation, avec sa quantité et son total figé.
- **Tarif dégressif** : premier bac au prix plein, suivants au prix réduit (petits bacs
  19,90 € puis 9,90 €, grands bacs 39,90 € puis 29,90 €), appliqué par prestation. Le total
  est calculé côté serveur.
- **Montant** : figé dans `amount_total_cents` au moment du paiement.
- **Photos** : bucket privé, URL signées temporaires créées à chaque consultation de l'espace.
- **Espace client (décision RGPD « option C »)** : la réservation crée la fiche client
  (`profiles`), nécessaire au contrat. L'espace ne s'ouvre que lorsque le client clique sur un lien
  de connexion qu'il a lui-même demandé. Pas de mot de passe, pas de mail de bienvenue, aucune
  mention « compte créé » dans l'interface ni dans les mails. La mention à la réservation et la
  section « Espace client » de la page de confidentialité l'expliquent.
- **Contenu de l'espace** (`/account`) : réservations `paid`, `completed` et `cancelled`, les plus
  récentes d'abord, et photos avant/après des interventions terminées (URL signées de 10 minutes,
  recréées à chaque chargement). Le client ne modifie rien : aucun UPDATE client sur `profiles`
  (une modification des coordonnées passera plus tard par une route serveur).
- **Accès** : RLS, un client ne lit que ses données, seul l'admin écrit photos et statuts. La RLS
  de lecture client exige aussi une connexion de moins de 7 jours (`has_recent_sign_in()`).
- **Rôle admin** : stocké dans `app_metadata` (jamais `user_metadata`, modifiable par
  l'utilisateur), lu dans les policies via `auth.jwt() -> 'app_metadata' ->> 'role'`.
- **Connexion par lien magique** : sur `/login`, le client saisit son adresse e-mail.
  `POST /api/auth/login` répond toujours la même chose, que l'adresse soit connue ou non, pour ne
  pas révéler quels clients existent, et ne crée jamais de compte. Si l'adresse correspond à une
  fiche, le serveur envoie le lien par Resend (mise en page BINOVYA, français uniquement). Supabase
  n'envoie lui-même aucun mail d'auth.
- **Le lien** : `/account/confirm#token_hash=…`. Le jeton est dans le fragment, qui n'est jamais
  envoyé à un serveur ni journalisé. Le fragment ne contient que `token_hash` ; les anciens liens
  avec `&type=magiclink` restent acceptés. La vérification se fait dans le navigateur avec
  `verifyOtp({ type: 'email' })` ; la méthode enregistrée reste `otp` (`amr`). Valable 24 h, à
  usage unique. En cas d'échec, la page explique comment redemander un lien.
- **Plafond d'envoi** : 60 secondes entre deux liens et 5 liens sur 24 h glissantes par client,
  tenus en base (`claim_login_link`). Au-delà, la réponse reste identique et rien n'est envoyé.
- **Session absolue de 7 jours** : comptée depuis le clic sur le lien, sans prolongation par le
  renouvellement du jeton. Elle est appliquée à trois endroits : côté serveur (`401` et
  révocation globale des sessions en tâche de fond), côté navigateur (middlewares `customer` et
  `guest`, puis retour vers `/login?session=expired` sur tout `401` de l'espace, au chargement
  comme à la suppression) et en RLS. Raison : le cookie `@supabase/ssr` dure 400 jours et son
  `maxAge` écrase les 8 h de `@nuxtjs/supabase` ; sans règle propre, la session ne finirait
  jamais. Un mot de passe ne peut pas ouvrir l'espace : sa méthode (`password`) est refusée par
  l'application et par la RLS.
- **Suppression** : bouton « Demander la suppression » dans l'espace. La demande est traitée à la
  main « sous un mois » (délai RGPD). BINOVYA reçoit une alerte par mail ; si l'alerte échoue, la
  demande est remise à zéro et le client voit une erreur, pour qu'il puisse réessayer. Les
  réservations payées sont conservées pour la comptabilité. La requête est refusée si son
  `Origin` n'est pas celui du site.
- **Connexion admin (étape 8)** : une route serveur utilisera `generateLink`, puisque Supabase
  n'envoie plus aucun mail d'auth. `is_admin()` n'est pas soumis à la règle des 7 jours.
- **SMS** : tâche quotidienne (`pg_cron`), les colonnes `*_sent_at` empêchent les doublons.
- **Confidentialité** : téléphone, photos des locaux et durée de conservation des données
  client à mentionner dans la page dédiée. Suppression des données sur simple demande.

## Limites connues

- **Vol d'oiseau** : les distances sont calculées en ligne droite, pas par la route. Suffisant
  pour regrouper par secteur, la distance routière demanderait une API payante.
- **Le premier client décide** : une première réservation isolée bloque la journée pour son
  secteur. Parade : l'admin impose le secteur du jour à l'avance.
- **Zone desservie** : sans distance maximale autour du dépôt, n'importe quelle adresse en
  France pourrait réserver. D'où la limite de 30 km.

- **Anti-abus** : champ piège et une seule réservation en attente par client pour l'instant. La
  limite de débit par IP sur `/api/booking` et `/api/booking/release` (Cloudflare) est reportée
  à l'étape 12.
- **Libération par identifiant** : `/api/booking/release` n'est protégé que par l'uuid de la
  réservation, impossible à deviner. Un jeton de libération dédié reste possible.
- **Réservations abandonnées** : elles et leurs comptes ne sont ni purgés ni anonymisés. La durée
  de conservation se décide à l'étape 13.
- **Lien magique et scanners de mail** : un antivirus ou un scanner de boîte mail qui exécute le
  JavaScript peut consommer le lien (usage unique) avant le client. Il redemande alors un lien.
- **Jeton de renouvellement non présenté** : sans « Time-box user sessions » (indisponible sur le
  plan Free), un refresh token volé et jamais présenté au site reste valide chez Supabase. Il
  n'ouvre plus aucune donnée après 7 jours, la RLS et le serveur refusant la session.
- **Alerte de suppression en double** : si Resend accepte le mail mais répond trop tard, la demande
  est remise à zéro et un second clic peut envoyer une deuxième alerte.
- **Utilisateur Auth orphelin** : si l'insertion du profil échoue après la création de
  l'utilisateur Auth (comportement antérieur), il reste un utilisateur sans fiche.
- **Modifications futures du profil** : une édition de profil par l'admin devra passer par une
  route serveur, un client n'ayant aucun droit d'écriture sur `profiles`.
- **Écran de confirmation** : il affiche « Paiement reçu » dès le retour de Stripe, avant que le
  webhook ait confirmé. C'est voulu.

- **Collecte déclarée par le client** : pas de source nationale connue des jours de collecte.
  Jours fériés décalés et collectes une semaine sur deux ne sont pas gérés. Les réponses
  accumulées par commune permettront plus tard de préremplir la question.

## Coûts récurrents

- **Stripe** : commission par paiement, pas d'abonnement (tarif à vérifier sur stripe.com/fr/pricing).
- **Brevo** : environ 0,045 € par SMS, soit environ 0,09 € par réservation (à confirmer).

## À remplir (à voir avec le client)

- Capacité d'une journée : en nombre d'interventions, ou en quantité de bacs ?
- Délai minimum avant intervention et horizon maximum de réservation ?
