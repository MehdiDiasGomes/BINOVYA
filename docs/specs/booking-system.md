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
7. Le jour de l'intervention, l'admin ouvre sa fiche dans BINOVYA Pro et suit quatre étapes :
   itinéraire, photo avant, photo après (facultative), récapitulatif. Il termine l'intervention
   depuis le récapitulatif. Le client reçoit alors un mail l'informant que ses photos sont
   disponibles dans son espace client, avec un tutoriel pas à pas pour s'y connecter ; le bouton
   mène à `/login`. L'admin peut forcer la fin sans photos, après confirmation. Dans ce cas,
   aucun mail photos n'est envoyé.
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
address, city, postcode, country_code storage_path ({booking_id}/{kind}.jpg)
latitude, longitude                   updated_at
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
rescheduled_at, reschedule_count,
reschedule_window_start
completed_at
completed_without_photos
photos_notified_at

availability_rules            availability_overrides        booking_settings (1 ligne)
------------------            ----------------------        --------------------------
weekday (0 à 6)               date                          depot_latitude, depot_longitude
max_bookings (0 à 50,         max_bookings (null = suit     service_area_radius_km
  0 = fermé)                    la règle, 0 = fermé, ≤ 50)  day_sector_radius_km
                              sector_latitude               min_lead_days, horizon_days
                              sector_longitude
                              sector_label
                              note (500 caractères au plus)
```

Fonctions réservées au serveur : `get_availability` (statut de chaque jour pour une adresse),
`create_booking` (contrôle, calcul du prix et blocage de la place en une transaction),
`confirm_booking_payment` (confirme un paiement reçu, sous le verrou du jour),
`expire_stale_bookings` (libère les réservations non payées), `claim_login_link` (plafond d'envoi
des liens de connexion client), `claim_admin_login_link` (idem pour les admins), `day_check`
(statut d'un jour pour une adresse, partagé par `day_status` et le déplacement admin),
`admin_day_overview` (capacité effective et réservations de chaque jour d'une plage) et
`admin_reschedule_booking` (déplace une réservation payée), `admin_set_intervention_photo`
(enregistre ou remplace une photo) et `admin_complete_booking` (termine une intervention).
`has_recent_sign_in()` et
`is_admin()` servent aux policies RLS.

## Règles

- **Créneau** : le client réserve un jour, jamais une heure. Le passage ce jour-là est garanti.
- **Capacité** : `availability_rules` fixe le nombre d'interventions par jour de semaine,
  `availability_overrides` gère les exceptions (congés, jours fériés, journée renforcée). Voir
  « Disponibilités » plus bas pour ce que règle l'admin.
- **Secteur du jour** : la première réservation d'un jour fixe son secteur. Le jour ne reste
  ouvert qu'aux adresses situées à moins de **15 km** de ce point. L'admin peut aussi
  imposer à l'avance le secteur d'un jour, par commune : ce secteur prend alors la place de la
  première réservation.
- **Adresse signée** : seule une adresse choisie dans la recherche est acceptée, son jeton
  valant 24 h. Si le serveur refuse le jeton (expiré, par exemple un brouillon restauré plus de
  24 h après, ou adresse modifiée), le client revient à l'étape des coordonnées : le champ
  adresse est vidé, marqué invalide, reçoit le focus et affiche le message. Il doit rechoisir
  son adresse. Le formulaire de devis fait de même.
- **Zone desservie** : **30 km** autour du dépôt (Uckange, 57270) pour commencer, au-delà la réservation est
  refusée. Les deux rayons sont des valeurs de configuration, modifiables sans redéploiement.
- **Jour de collecte** : règle souple. Le jour de collecte et le lendemain sont mis en avant
  comme recommandés, les autres jours restent réservables avec l'avertissement « vos bacs
  doivent être vides ». Le SMS de la veille le rappelle. Dans le calendrier, le point d'un jour
  recommandé est décoratif : le nom accessible de la case est « {date longue}, jour recommandé ».
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
- **Photos** : bucket privé `intervention-photos` (5 Mo, JPEG seulement), une photo `before` et une
  `after` par réservation, au chemin `{booking_id}/{kind}.jpg` : remplacer une photo écrase le
  fichier. Le client les voit par des URL signées temporaires (voir « Photos et reçu »).
- **Espace client (décision RGPD « option C »)** : la réservation crée la fiche client
  (`profiles`), nécessaire au contrat. L'espace ne s'ouvre que lorsque le client clique sur un lien
  de connexion qu'il a lui-même demandé. Pas de mot de passe, pas de mail de bienvenue, aucune
  mention « compte créé » dans l'interface ni dans les mails. La mention à la réservation et la
  section « Espace client » de la page de confidentialité l'expliquent.
- **Contenu de l'espace** (`/account`) : une carte par réservation `paid`, `completed` ou
  `cancelled`, les plus récentes d'abord. Le statut s'affiche en ligne colorée avec icône et texte
  (« À venir », « Réalisée », « Annulée et remboursée »), sans pastille ni numéro de référence. La
  carte donne le détail, le montant (« Montant payé », ou « Remboursé » si annulée) et un seul lien,
  « Voir la réservation » (la date fait partie de son nom accessible). Une réservation à venir
  porte le rappel « Videz vos bacs la veille ».
- **Page d'une réservation** (`/account/bookings/[id]`) : résumé, section photos (masquée si
  annulée), « Reçu de paiement » et, pour une annulée, « Réserver une autre date ». Un
  identifiant inconnu, invalide ou appartenant à un autre client donne le même écran
  « Réservation introuvable ».
- **Photos et reçu** : le client ne voit les photos que d'une réservation terminée (règle posée
  aussi en RLS, table et bucket). Avant la fin, la section annonce que les photos arriveront ;
  terminée sans photos, elle affiche « Aucune photo pour cette intervention ». Les liens des
  photos valent 10 minutes et se renouvellent sans recharger la page. Le reçu est celui de Stripe
  (« Reçu de paiement ») ; il reflète un remboursement. Ce n'est pas une facture : une facture
  française avec ses mentions légales reste à fixer avec le client (`TODO.md`).
- Le client ne modifie rien : aucun UPDATE client sur `profiles` (une modification des coordonnées
  passera plus tard par une route serveur).
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
- **Accès admin** : sur `/pro/login`, l'admin saisit son adresse. Il reçoit un lien valable 24 h, à
  usage unique, dont le jeton est dans le fragment de `/pro/confirm` (comme pour le client). Le
  rôle ne vient que de `app_metadata.role`. La session admin dure 7 jours depuis la connexion par
  lien (la plus ancienne entrée `otp` ou `magiclink` de l'`amr`), comme celle d'un client. Une
  session par mot de passe n'est jamais admin ni client. `is_admin()` exige le rôle ET cette
  connexion par lien de moins de 7 jours.
- **Plafond des liens admin** : 60 secondes entre deux liens et 5 sur 24 h glissantes, tenus en
  base (`claim_admin_login_link`, table `admin_login_links`). Les admins bannis sont ignorés. La
  réponse de `POST /api/pro/auth/login` est identique dans tous les cas (adresse inconnue, non
  admin, plafond atteint, champ piège).
- **Admin sur les pages client** : `/login` et `/account/**` renvoient un admin vers `/pro`. La
  navigation affiche « Espace admin » (icône `LayoutDashboard`) vers `/pro`. Le code client ne
  termine jamais une session admin, et `/account/confirm` ne redirige pas.
- **Planning du jour** (`/pro`) : choix du jour (précédent, suivant, sélecteur de date,
  « Aujourd'hui »). Il liste les réservations `paid` et `completed`, triées par code postal puis
  adresse jusqu'à l'étape 9. « Aujourd'hui » est calculé en Europe/Paris (`businessToday`, aussi
  utilisé par les rappels), même si le serveur tourne en UTC.
- **Itinéraire** : le bloc est toujours en haut du planning (squelette pendant le chargement,
  « Aucune intervention à réaliser ce jour. » sans intervention à faire ; masqué sans dépôt ou en
  cas d'erreur). Le trajet part du dépôt et y revient en passant par les seules interventions
  `paid`, dans l'ordre affiché. Au-delà de `GOOGLE_MAPS_MAX_WAYPOINTS` (9) étapes, il est coupé en
  « Tournée, partie X sur N ». Les coordonnées sont utilisées si elles sont valides, sinon
  l'adresse. L'itinéraire d'une seule intervention se choisit dans sa fiche (étape 1, voir
  « Fiche d'une intervention »).
- **Carte d'intervention** (planning et liste) : une pastille d'avancement (À faire, Photo avant
  faite, Photo après faite, Photos faites, Terminée, Terminée sans photos, Annulée), les détails de la
  réservation (date dans la liste, bacs, formule) et un seul lien principal : « Commencer » (paid,
  jour venu, sans photo), « Continuer » (paid, jour venu, au moins une photo) ou « Voir » (tout le
  reste : jour à venir, terminée, annulée). Le menu « … » (« Plus d'actions ») ne contient que
  « Changer la date », pour une intervention `paid`. Sur téléphone, l'intervention est une ligne
  compacte sombre : pastille, nom du client, adresse et détails sur deux lignes au plus, badge
  « À déplacer » si besoin, toute la ligne ouvre la fiche et le menu « … » reste cliquable à
  part. À partir de `sm`, c'est une carte avec le lien et le menu en bas.
- **Liste des interventions** (`/pro/interventions`) : filtre de statut (Tous, À réaliser,
  Réalisées, Annulées). « Du » vaut aujourd'hui par défaut ; « Du » vide = aucune borne basse ;
  un « Au » antérieur à « Du » est ignoré (les deux sélecteurs se bornent l'un l'autre). Les
  filtres s'appliquent aussitôt et remplacent l'entrée d'historique (`replace`). Pagination par 50,
  pages 1 à 1000, chaque page ajoute une entrée d'historique (`push`) ; une page au-delà de la
  dernière ramène à la dernière. Tri par date puis date de création. Les sélecteurs de date du
  planning et des filtres marquent d'un point les jours qui ont au moins une intervention
  (`paid` ou `completed`, jours passés compris), avec une légende ; le point ne suit pas le
  filtre de statut.
- **Disponibilités** (`/pro/availability`) : l'admin règle la capacité de chaque jour de semaine,
  de 0 à `PRO_DAY_CAPACITY_MAX` (50). 0 ferme le jour. Un jour sans règle est fermé. Il peut
  aussi créer l'exception d'une date : capacité (vide = suit la règle, 0 = fermé), secteur imposé
  par commune et note de 500 caractères au plus. Une exception sans aucune valeur est supprimée.
  Les jours passés ne se modifient pas et l'horizon est de 365 jours à partir d'aujourd'hui
  (Europe/Paris). Les nouveaux réglages s'appliquent aux réservations suivantes ; les
  réservations déjà payées ne bougent pas.
- **Secteur par commune** : l'admin cherche une commune, pas une adresse. France : IGN
  `type=municipality`, libellé `<nom> (<code postal>)`. Luxembourg : liste fixe des 27 communes
  proches du dépôt (`server/utils/luxembourgCommunes.ts`), libellé `<nom> (LU)`, code postal
  vide. Le jeton de la commune a le même format que celui d'une adresse (24 h) mais un contexte de
  signature distinct : un jeton d'adresse n'est pas accepté pour une commune, ni l'inverse. Une
  commune expirée ou modifiée est refusée (`invalidAddress`) et l'admin doit la rechercher de
  nouveau.
- **Statut d'un jour** (`/pro`) : quand des interventions `paid` sont à déplacer, le planning
  affiche une alerte urgente (rouge) « N intervention(s) à déplacer d'urgence ». Ce cas couvre
  un jour fermé qui garde des interventions payées (toutes sont à déplacer) et un jour qui
  contient plus de réservations que sa capacité après un déplacement forcé (au plus autant
  d'interventions que de réservations en trop). La consigne dit de passer par le menu « ⋯ » de
  chaque intervention puis « Changer la date » ; pour un jour fermé, elle renvoie au badge
  « À déplacer », pour un dépassement il n'y a pas de badge. Un dépassement sans intervention
  déplaçable affiche un avertissement ambre qui conseille d'augmenter la capacité ; un jour
  fermé sans réservation, un panneau d'information. Les liens « Rouvrir » et « Augmenter »
  mènent à `/pro/availability?date=…` tant que la date est modifiable. Le titre de l'alerte
  est aussi annoncé aux lecteurs d'écran au chargement du planning, sans prendre le focus.
- **« À déplacer »** : une intervention `paid` dont le jour est fermé (par la règle ou par une
  exception) porte le badge « À déplacer » dans le planning et la liste. Un jour en dépassement
  de capacité n'en marque aucune. Une intervention `completed` ou annulée n'est jamais marquée.
- **Déplacement par l'admin** (bouton « Changer la date », `ProRescheduleDialog`) : ne vaut que
  pour une réservation `paid`. L'admin choisit une date d'aujourd'hui à +365 jours.
  - Refus jamais forçables : date passée (`pastDate`), même date (`sameDate`), réservation non
    payée (`notPaid`), réservation inconnue (`notFound`), date invalide (`invalidDate`), date
    au-delà de 365 jours (`tooFar`), plus de 3 déplacements par heure pour une même réservation
    (`tooFrequent`, réponse 429).
  - Refus forçables avec « Forcer quand même » : adresse hors zone (`outOfArea`), jour fermé
    (`dayClosed`), jour complet (`dayFull`), secteur d'un autre jour (`outOfSector`). Les
    contrôles sont ceux d'une réservation client (zone, jour fermé, capacité, secteur), sans
    compter la réservation déplacée. Le délai minimum et l'horizon de réservation du client ne
    s'appliquent pas. Les contrôles forcés sont renvoyés (`overriddenCodes`) et annoncés.
  - Effets : `reminder_sent_at` et `day_of_sms_sent_at` sont remis à zéro, pour que les rappels
    repartent sur la nouvelle date. Le client reçoit un mail de changement de date, avec la clé
    d'idempotence `booking-reschedule-<uuid>-<id>` : un mail par déplacement, même si la
    réservation revient à sa date d'origine. La clé du rappel devient
    `booking-reminder-<date>-<id>` : une réservation déplacée dans la fenêtre de rappel reçoit un
    nouveau rappel pour sa nouvelle date.
- **Fiche d'une intervention** (`/pro/interventions/[id]`) : ouverte depuis la carte, elle suit
  l'état de la réservation.
  - Réservation `paid` dont le jour est venu (aujourd'hui ou passé) : quatre étapes, 1
    Itinéraire, 2 Photo avant, 3 Photo après (facultative, « Passer cette photo »), 4 Récapitulatif
    et « Terminer l'intervention ». L'étape de reprise vient de ce que le serveur a enregistré :
    itinéraire sans photo, photo manquante s'il n'en existe qu'une, récapitulatif si les deux
    existent. Le bouton retour du téléphone revient à l'étape précédente. L'en-tête se réduit au
    nom du client : l'adresse est dans l'étape 1. Une barre de quatre segments avec un compteur
    « Étape N sur 4 » montre l'avancement (étape faite, en cours, à faire, passée).
  - Étape 1 : la destination (adresse), le menu d'itinéraire, un bouton d'appel (icône) si le
    client a un téléphone, et « Je suis sur place ». Étapes photo : la ligne « À nettoyer »
    rappelle les bacs. « Passer cette photo » demande une confirmation sur place (sans les deux
    photos, aucun mail photos ne part) ; une photo prise remplace ce choix par « Continuer ».
  - « Plus d'infos », sous l'étape et fermé au départ : téléphone (numéro en groupes de chiffres,
    appelable), date, bacs, formule, jours de collecte et montant. Il n'y a pas de ligne de
    paiement.
  - Réservation `paid` dont le jour n'est pas venu, ou annulée : lecture seule, aucune photo ni
    fin possible.
  - Réservation `completed` : récapitulatif avec les deux photos. « Remplacer » reste possible et
    n'envoie aucun nouveau mail.
  - Itinéraire : un menu propose les applications du téléphone. iPhone et iPad : Plans, Google
    Maps, Waze. Android : Google Maps, Waze, « Autre application… » (lien `geo:`). Mac : Google
    Maps, Waze, Plans. Autre appareil : Google Maps, Waze. Le bouton d'appel, s'il y a un
    téléphone, est à côté du menu.
- **Photos prises par l'admin** : un seul champ fichier (`image/*`, sans `capture`), donc
  l'appareil photo ou la galerie au choix du téléphone. Le navigateur réduit la photo à 2 000 px
  au plus et l'envoie en JPEG ; le serveur la contrôle et efface ses métadonnées (EXIF dont le
  GPS). Refus : réservation non payée, jour pas encore venu (une réservation terminée accepte
  toujours un remplacement), image invalide, plus de 5 Mo. L'envoi continue quand l'admin change
  d'étape. Un envoi dont le résultat est inconnu (délai dépassé) recharge la fiche au lieu de
  proposer de réessayer.
- **Terminer l'intervention** : réservation `paid`, jour venu. Avec les deux photos, elle se
  termine et le client est prévenu une seule fois. Sans les deux photos, l'admin doit confirmer
  une fin « sans photos » : la réservation est marquée `completed_without_photos`, et aucun mail
  photos ne part, même si des photos sont ajoutées après. Une réservation déjà terminée, annulée
  ou non payée ne peut pas être terminée. Le bouton est inactif tant qu'un envoi de photo est en
  cours.
- **Lien du mail « photos disponibles »** : lien vers `/login` (option A, comme « Suivre ma
  réservation »), jamais un lien de connexion ni une URL signée.
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
- **Jour fermé avec interventions** : fermer un jour (règle ou exception) ne déplace rien. Les
  interventions payées restent sur ce jour, marquées « À déplacer », jusqu'à ce que l'admin les
  déplace une à une. Seul un jour fermé marque ; un jour en dépassement de capacité n'affiche
  qu'un statut.
- **Menu « … » de la carte** : il ne contient que « Changer la date ». L'itinéraire, les photos
  et la fin passent par la fiche de l'intervention.
- **Fin sans photos irréversible côté mail** : une réservation terminée sans photos ne notifie
  jamais le client, même si l'admin ajoute les photos plus tard (elles sont visibles dans
  l'espace client, sans mail).
- **Reçu Stripe** : si Stripe ne répond pas en 4 s (ou ne donne pas de reçu), la page affiche
  que le reçu est indisponible, sans nouvel essai ; le résultat est gardé en mémoire 5 minutes
  (30 secondes en cas d'échec), par instance du serveur.
- **Durée de conservation des photos** : non décidée (étapes 10 et 13).
- **Clé de rappel par date non vérifiée en intégration** : `booking-reminder-<date>-<id>` est
  attendue par `tests/integration/email/booking-reminder.test.ts`, mais ce test refuse de
  tourner tant que de vraies réservations payées sont dans la fenêtre J+1..J+2. Il n'a pas
  été rejoué pour le lot 2 (les tests tournent à la fin de l'étape 8).

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
