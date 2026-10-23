# Système de réservation en ligne

> Statut : implémenté (étapes 1 à 8 et 10-11), mis à jour le 2026-10-23.
> Document fonctionnel : ce que fait le produit, en langage courant. Le détail technique (routes,
> tables, sécurité, tests) est dans [technical.md](./technical.md). Ce qui reste à faire est dans
> [TODO.md](../TODO.md).

## Objectif

Permettre à un client de réserver le nettoyage vapeur de ses bacs, de le payer en ligne, puis de
retrouver sa réservation et les photos avant/après dans son espace client. Permettre à l'équipe
BINOVYA de gérer ses journées dans un espace dédié, BINOVYA Pro.

## V1 et V2

| Sujet                                          | État                                           |
| ---------------------------------------------- | ---------------------------------------------- |
| Réservation et paiement en ligne (1 ou 2 bacs) | V1, en place                                   |
| Devis (autres cas) et page de contact          | V1, en place                                   |
| Espace client (lien de connexion par mail)     | V1, en place                                   |
| BINOVYA Pro (planning, photos, création)       | V1, en place                                   |
| Mise en production, textes légaux, CGV         | V1, à faire (étapes 12 et 13 du `TODO.md`)     |
| Rappel par mail la veille ou l'avant-veille    | V1, en place                                   |
| SMS (veille et jour J)                         | V2, rien n'est branché                         |
| Abonnements récurrents (trimestriel, annuel)   | V2, voir « Formules »                          |
| Tournée optimisée (OSRM, VROOM)                | V2, en V1 l'ordre de la liste suit Google Maps |
| Supervision, sauvegardes maison                | V2                                             |

## Public et zone desservie

- **Public** : particuliers et professionnels réservent en ligne sur la même grille de prix, pour
  1 ou 2 bacs. Les autres cas passent par un devis (voir « Devis et contact »). « BINOVYA Pro »
  désigne l'espace de l'équipe BINOVYA, pas un espace pour les clients professionnels.
- **Pays** : France et Luxembourg. Le client choisit le pays à côté du champ adresse. Téléphones
  français (+33) et luxembourgeois (+352), codes postaux à 5 chiffres (FR) ou 4 chiffres (LU).
- **Zone** : 20 km à vol d'oiseau autour du dépôt (Uckange, 57270). Au Luxembourg, seule une petite
  partie est couverte (Rumelange, sud de Dudelange). Une adresse hors zone est refusée et le site
  propose de contacter BINOVYA.
- **Adresse** : seule une adresse choisie dans la liste de suggestions est acceptée (Géoplateforme
  IGN en France, geoportail.lu au Luxembourg). Le choix vaut 24 h. Passé ce délai, ou si l'adresse
  est modifiée, le client la rechoisit : l'écran revient à l'étape des coordonnées, champ adresse
  vidé et signalé. Le formulaire de devis fait de même.
- **Langues** : site en français et en anglais. Les mails sont en français uniquement.

## Parcours du client

1. Il réserve sur `/booking` en quatre étapes (détail plus bas) et paie via Stripe Checkout.
2. Dès le paiement, il reçoit un mail de confirmation avec un lien « Suivre ma réservation »
   vers `/login`.
3. La veille ou l'avant-veille, il reçoit un rappel par mail.
4. Le jour de l'intervention, l'équipe passe, prend une photo avant et une photo après, puis
   termine l'intervention dans BINOVYA Pro.
5. Le client reçoit alors un mail « photos disponibles » avec un tutoriel pour se connecter.
6. Il demande un lien de connexion sur `/login`, puis consulte ses réservations, ses photos et
   son justificatif de paiement dans son espace client.

## La réservation en ligne (`/booking`)

Quatre étapes, sans mot de passe. Le brouillon est gardé dans le navigateur.

1. **Coordonnées** : prénom, nom, e-mail, téléphone mobile et adresse des bacs. Une mention explique
   que les données servent à exécuter la réservation et que l'espace client s'ouvre via un lien
   que le client demande lui-même.
2. **Bacs** : nombre de petits bacs (120 à 240 L) et de grands bacs (600 à 1 100 L), puis le jour de
   collecte du bac des déchets non recyclables et du bac de tri, ou « Je ne sais pas ».
   Trois bacs ou plus, ou un petit et un grand ensemble, n'ont pas de prix : le site propose alors
   de demander un devis.
3. **Formule et date** : le client choisit sa formule, puis un jour dans un calendrier. Il réserve
   un jour, jamais une heure : l'équipe passe dans la journée.
4. **Confirmation et paiement** : récapitulatif et prix TTC. Le client coche deux cases :
   « mes bacs seront vides et accessibles le jour du passage » (sa présence n'est pas nécessaire si
   l'accès est possible) et l'acceptation des conditions générales de vente et de la politique de
   confidentialité. Il est redirigé vers Stripe Checkout (carte uniquement).

Au retour de Stripe, l'écran affiche « Paiement reçu » tout de suite, avant la confirmation du
webhook. C'est voulu. Si le client annule ou revient en arrière, la place est libérée et le
brouillon est restauré à l'étape de paiement.

### Tarifs

La grille donne le prix TTC d'un passage, selon la formule et les bacs. Une combinaison absente de
la grille demande un devis.

| Bacs          | Ponctuelle | Trimestrielle | Annuelle |
| ------------- | ---------- | ------------- | -------- |
| 1 petit bac   | 29 €       | 24 €          | 19 €     |
| 2 petits bacs | 49 €       | 39 €          | 35 €     |
| 1 grand bac   | 59 €       | 39 €          | 29 €     |
| 2 grands bacs | 100 €      | 79 €          | 69 €     |

Le prix est calculé côté serveur et figé dans la réservation au moment du paiement.

### Formules

- **Ponctuelle** : un seul passage.
- **Trimestrielle** : « un passage tous les 3 mois » (libellé du site).
- **Annuelle** : « un passage chaque mois » (libellé du site).

En V1, le client ne paie qu'un passage et la réservation ne porte que cette date. Aucun passage
suivant n'est planifié ni facturé : les abonnements récurrents sont en V2. Le `TODO.md` (étape 13)
prévoit de masquer les formules trimestrielle et annuelle en V1, ce qui n'est pas encore fait.

## Jours, capacité et secteur

- **Capacité** : l'admin fixe un nombre d'interventions par jour de semaine (0 à 50, 0 ferme le
  jour, un jour sans règle est fermé) et peut poser des exceptions par date. Réglage initial :
  3 interventions du lundi au vendredi, week-end fermé.
- **Délai et horizon** : le client réserve au plus tôt dans 2 jours et au plus tard dans 60 jours.
  Ces valeurs sont provisoires et modifiables dans la configuration (`booking_settings`), sans
  écran d'administration.
- **Secteur du jour** : la première réservation d'un jour fixe son secteur. Le jour ne reste ouvert
  qu'aux adresses à moins de 15 km de ce point. L'admin peut imposer à l'avance le secteur d'un
  jour, par commune : il prend alors la place de la première réservation.
- **Jour de collecte** : règle souple. Le jour de collecte et le lendemain sont recommandés (point
  décoratif dans le calendrier, nom accessible « {date}, jour recommandé »). Les autres jours
  restent réservables avec l'avertissement « vos bacs devront être vides à notre passage ».
- **Aucun jour disponible** : le site propose de contacter BINOVYA.

## Paiement et place bloquée

- **Place bloquée** : dès la création de la réservation, pour 35 minutes (session Stripe de 31
  minutes). Elle est libérée si la session expire, si le client abandonne ou revient en arrière,
  ou par une tâche planifiée toutes les 5 minutes.
- **Une réservation en attente par client** : tant qu'un paiement est en attente, une nouvelle
  réservation est refusée avec un message qui renvoie au lien reçu par mail.
- **Statuts** : en attente de paiement, payée, terminée, annulée, expirée. Seules les
  réservations payées, terminées et annulées apparaissent dans l'espace client.
- **Paiement tardif** : un paiement reçu après la libération est accepté si le jour est encore
  disponible. Sinon la réservation est annulée et Stripe rembourse automatiquement. Un paiement sur
  une réservation déjà annulée est aussi remboursé. Dans les deux cas, le client reçoit un mail
  d'annulation et de remboursement (aucun mail si la charge était déjà remboursée).
- **Facture** : chaque paiement en ligne génère une facture Stripe, avec une note de crédit si le
  remboursement est automatique. Les mentions légales qu'elle porte sont des textes fictifs
  (`app/constants/invoice.ts`) : elles doivent être remplacées par les vraies avant la mise en
  production (voir « À décider avec le client »).
- **Pas d'annulation par le client** : en V1, le client ne modifie ni n'annule sa réservation
  lui-même. Les règles d'annulation, de report et de remboursement relèvent des CGV (étape 13).

## Devis et contact

- **Devis** (`/quote`) : page unique pour tous les publics (particuliers, entreprises,
  collectivités). Elle couvre bacs, points d'apport volontaire (PAV), mobilier urbain et
  signalétique, au moins un type à cocher. Le nombre de bacs n'est demandé que si « bacs » est
  coché. Champs : coordonnées, société (facultative), adresse, fréquence souhaitée (facultative),
  commentaire et jusqu'à 3 photos. La page annonce une réponse sous 48 h.
- **Suite d'une demande** : elle est enregistrée et un mail part à BINOVYA avec les photos en lien
  de 7 jours. Il n'y a pas d'écran de suivi des devis dans BINOVYA Pro : le traitement se fait par
  mail, avec le statut (`new`, `answered`, `closed`) tenu dans la base.
- **Du devis à l'intervention** : pour un client qui accepte un devis, l'admin crée l'intervention
  lui-même dans BINOVYA Pro, au prix du devis (voir « Nouvelle intervention »).
- **Contact** (`/contact`) : questions et demandes de rendez-vous (objet `meeting`, `info` ou
  `other`), pas les devis. Les liens « adresse hors zone » et « aucune date disponible » du parcours
  y mènent. Le message part par mail à BINOVYA, rien n'est stocké.

## Mails

Tous sont envoyés par Resend, en français. Le détail (déclencheurs, clés d'idempotence) est dans
[technical.md](./technical.md), section « Mails ».

| Mail                               | Destinataire | Quand                                                              |
| ---------------------------------- | ------------ | ------------------------------------------------------------------ |
| Confirmation                       | Client       | Paiement reçu ; lien « Suivre ma réservation » vers `/login`       |
| Alerte de réservation payée        | BINOVYA      | Paiement reçu                                                      |
| Annulation et remboursement        | Client       | Paiement tardif impossible à honorer                               |
| Rappel                             | Client       | La veille ou l'avant-veille de l'intervention                      |
| Changement de date                 | Client       | L'admin déplace l'intervention                                     |
| Photos disponibles                 | Client       | Fin d'une intervention avec les deux photos ; bouton vers `/login` |
| Lien de connexion                  | Client       | Demande sur `/login`, adresse connue                               |
| Lien de connexion admin            | Admin        | Demande sur `/pro/login`, admin connu                              |
| Lien de paiement                   | Client       | L'admin crée une intervention avec lien de paiement (ou renvoi)    |
| Confirmation (paiement hors site)  | Client       | L'admin crée une intervention déjà payée                           |
| Demande de suppression             | BINOVYA      | Le client demande la suppression de son espace                     |
| Devis, contact                     | BINOVYA      | Envoi des formulaires                                              |
| Note de crédit à émettre à la main | BINOVYA      | La note de crédit automatique a échoué                             |

Les mails ne contiennent jamais de lien de connexion ni d'URL signée de photo : ils renvoient vers
`/login`.

## Espace client

- **Décision RGPD « option C »** : la réservation crée la fiche client, nécessaire au contrat.
  L'espace ne s'ouvre que lorsque le client clique sur un lien de connexion qu'il a lui-même
  demandé. Pas de mot de passe, pas de mail de bienvenue, aucune mention « compte créé » dans
  l'interface ni dans les mails.
- **Connexion** (`/login`) : le client saisit son e-mail. La réponse est toujours la même, que
  l'adresse soit connue ou non, pour ne pas révéler quels clients existent. Aucun compte n'est créé
  par cette page. Le lien vaut 24 h et ne sert qu'une fois. Au plus un lien par minute et 5 liens
  sur 24 h.
- **Session de 7 jours** : comptée depuis le clic sur le lien, sans prolongation. Passé ce délai, le
  client redemande un lien (`/login?session=expired`).
- **Liste** (`/account`) : une carte par réservation payée, terminée ou annulée, les plus récentes
  d'abord. Statut en texte avec icône (« À venir », « Réalisée », « Annulée et remboursée »),
  montant (« Montant payé », ou « Remboursé »), lien « Voir la réservation ». Une réservation à
  venir porte le rappel « Videz vos bacs la veille ».
- **Détail** (`/account/bookings/[id]`) : résumé, photos avant/après (masquées si annulée), document
  de paiement et, pour une annulée, « Réserver une autre date ». Une réservation inconnue ou d'un
  autre client donne le même écran « Réservation introuvable ».
- **Photos** : visibles seulement pour une réservation terminée. Avant la fin, la page annonce
  qu'elles arriveront ; terminée sans photos, elle affiche « Aucune photo pour cette
  intervention ». Les liens valent 10 minutes et se renouvellent sans recharger la page.
- **Document de paiement** : une réservation payée en ligne affiche sa facture Stripe (PDF, ou page
  Stripe à défaut) ; une réservation plus ancienne, le reçu Stripe ; une réservation payée hors
  site, la mention « Paiement réglé directement auprès de BINOVYA » et l'invitation à répondre au
  mail de confirmation pour un justificatif. Si Stripe ne répond pas, la page l'indique sans
  nouvel essai.
- **Suppression** : bouton « Demander la suppression ». La demande est traitée à la main sous un
  mois (délai RGPD) et BINOVYA reçoit une alerte par mail ; si l'alerte échoue, le client voit une
  erreur et peut réessayer. Les réservations payées sont conservées pour la comptabilité.
- **Lecture seule** : le client ne modifie rien dans son espace, ni ses coordonnées ni ses
  réservations.
- **Admin** : un admin qui ouvre `/login` ou `/account` est renvoyé vers `/pro`.

## BINOVYA Pro (espace de l'équipe)

Réservé aux comptes admin, sans mot de passe : connexion par lien envoyé par mail sur
`/pro/login` (valable 24 h, à usage unique, au plus un par minute et 5 sur 24 h), session de
7 jours. La réponse de la page est identique pour toute adresse. Navigation : Planning,
Interventions, Nouvelle intervention, Disponibilités.

### Planning du jour (`/pro`)

- Choix du jour (précédent, suivant, sélecteur de date, « Aujourd'hui », calculé en heure de
  Paris). Il liste les interventions payées et terminées, triées par code postal puis adresse. Un
  point sur les sélecteurs de date marque les jours qui ont au moins une intervention.
- **Itinéraire de la journée** : un trajet Google Maps part du dépôt, passe par les interventions à
  réaliser dans l'ordre de la liste et revient au dépôt. Au-delà de 9 arrêts, il est coupé en
  plusieurs parties.
- **Carte d'intervention** : pastille d'avancement (À faire, Photo avant faite, Photo après faite,
  Photos faites, Terminée, Terminée sans photos, Annulée), détails et un lien principal
  (« Commencer », « Continuer » ou « Voir »). Le menu « … » ne contient que « Changer la date »,
  pour une intervention payée.
- **Jour fermé ou complet** : une alerte urgente « N interventions à déplacer d'urgence » apparaît
  quand des interventions payées sont sur un jour fermé, ou en trop après un déplacement forcé. Les
  interventions d'un jour fermé portent le badge « À déplacer ». Un dépassement de capacité sans
  intervention déplaçable donne un avertissement qui conseille d'augmenter la capacité. Fermer un
  jour ne déplace rien automatiquement.

### Liste des interventions (`/pro/interventions`)

- Filtres : statut (Tous les statuts, Paiement en attente, À réaliser, Réalisées, Annulées, Liens
  expirés), dates « Du » (aujourd'hui par défaut) et « Au ». Pagination par 50.
- « Paiement en attente » et « Liens expirés » ne concernent que les interventions créées par
  l'admin avec un lien de paiement. Une réservation en ligne abandonnée n'y figure pas.
- Une intervention dont le lien a expiré propose « Créer à nouveau » : le formulaire est prérempli
  et l'admin choisit une nouvelle date.

### Nouvelle intervention (`/pro/interventions/new`)

L'admin crée une intervention pour un client (téléphone, rendez-vous sur place, après un devis).

- **Client** : retrouvé par son e-mail, sinon créé. Si le client existe déjà, ses coordonnées ne
  sont pas modifiées.
- **Tarif** : « Grille tarifaire » (1 ou 2 bacs de chaque format, mêmes prix que le site) ou « Sur
  devis » : l'admin fixe le prix TTC par passage et peut saisir jusqu'à 50 bacs par format. Une note
  interne (500 caractères au plus) n'est jamais visible par le client.
- **Mode de paiement** :
  - « Envoyer un lien de paiement » : le client reçoit un lien Stripe par mail. La date lui est
    réservée environ 24 heures, jusqu'au paiement ; sans paiement, la date est libérée. L'admin peut
    renvoyer le lien (3 fois par heure au plus) depuis la fiche.
  - « Paiement réglé hors site » (espèces, virement) : l'intervention est créée payée tout de suite,
    sans Stripe ni facture, et le client reçoit la confirmation par mail.
- **Contrôles** : adresse dans la zone, jour ouvert, capacité, secteur du jour, comme pour un client.
  L'admin peut forcer ces quatre contrôles (« Forcer quand même »). Le délai minimum et l'horizon de
  réservation du client ne s'appliquent pas ; une date passée ou au-delà de 365 jours est refusée.
- **Un paiement en attente par client** s'applique aussi : un nouveau lien est refusé tant que le
  précédent n'est ni payé ni expiré.
- **Doublons** : un envoi répété (réponse tardive, double clic) ne crée pas deux interventions.

### Fiche d'une intervention (`/pro/interventions/[id]`)

- **Payée, jour venu** : quatre étapes, 1 Itinéraire, 2 Photo avant, 3 Photo après (facultative,
  « Passer cette photo »), 4 Récapitulatif et « Terminer l'intervention ». L'étape de reprise
  dépend des photos déjà enregistrées. L'étape 1 donne l'adresse, un menu pour ouvrir l'itinéraire
  dans l'application du téléphone (Plans, Google Maps, Waze), un bouton d'appel et « Je suis sur
  place ».
- **Photos** : un seul champ (appareil photo ou galerie, au choix du téléphone). La photo est
  réduite à 2 000 px, envoyée en JPEG (5 Mo au plus) et nettoyée de ses métadonnées (EXIF, GPS)
  côté serveur. Le jour doit être venu (une intervention terminée accepte toujours un remplacement).
- **Terminer** : avec les deux photos, l'intervention est terminée et le client reçoit une seule
  fois le mail « photos disponibles ». Sans les deux photos, l'admin confirme une fin « sans
  photos » : aucun mail photos ne part, même si des photos sont ajoutées ensuite.
- **Plus d'infos** : téléphone, date, bacs, formule, jours de collecte, montant, tarif (grille ou
  devis), mode de paiement et note interne.
- **Payée, jour à venir** ou **annulée** : lecture seule. **En attente de paiement** : la fiche
  affiche la date limite et « Renvoyer le lien de paiement ». **Terminée** : récapitulatif avec les
  deux photos ; « Remplacer » reste possible sans nouveau mail.

### Changer la date

Possible pour une intervention payée, de la date du jour à +365 jours.

- **Refus jamais forçables** : date passée, même date, réservation non payée, date invalide, date
  au-delà de 365 jours, plus de 3 déplacements par heure pour une même réservation.
- **Refus forçables** (« Forcer quand même ») : adresse hors zone, jour fermé, jour complet,
  secteur d'un autre jour. Les contrôles forcés sont annoncés.
- **Effets** : les rappels repartent sur la nouvelle date et le client reçoit un mail de changement
  de date.

### Disponibilités (`/pro/availability`)

L'admin règle la capacité de chaque jour de semaine (0 à 50) et crée des exceptions par date :
capacité (vide = suit la règle, 0 = fermé), secteur imposé par commune et note de 500 caractères au
plus. Les jours passés ne se modifient pas ; l'horizon est de 365 jours. Les réglages
s'appliquent aux réservations suivantes ; les réservations déjà payées ne bougent pas.

Le secteur se choisit par commune. France : recherche IGN, libellé `<nom> (<code postal>)`.
Luxembourg : liste fixe de 27 communes proches du dépôt, libellé `<nom> (LU)`.

## Services

| Besoin                 | Service                                                | État                |
| ---------------------- | ------------------------------------------------------ | ------------------- |
| Mail                   | Resend                                                 | En place            |
| Paiement               | Stripe (Checkout, webhook, factures)                   | En place, mode test |
| Comptes, base, photos  | Supabase (région UE)                                   | En place            |
| Géocodage des adresses | Géoplateforme IGN (France), geoportail.lu (Luxembourg) | En place            |
| Hébergement            | VPS européen, Docker, Caddy, Cloudflare                | Étape 12, à faire   |
| SMS                    | Brevo                                                  | V2                  |
| Distances routières    | OSRM et VROOM (auto-hébergés)                          | V2                  |

En production, tous les comptes sont au nom du client final, le développeur y est invité. En
développement : Stripe en mode test sur le compte du développeur, Supabase dans une organisation
dédiée au client (transférable). Coûts estimés : [technical.md](./technical.md), section « Coûts
estimés ». Stripe prend une commission par paiement, sans abonnement.

## Limites connues

- **Vol d'oiseau** : les distances sont calculées en ligne droite, pas par la route. Suffisant
  pour regrouper par secteur.
- **Le premier client décide** : une première réservation isolée fixe le secteur de la journée.
  Parade : l'admin impose le secteur du jour à l'avance.
- **Jours de collecte déclarés** : pas de source nationale. Jours fériés décalés et collectes une
  semaine sur deux ne sont pas gérés.
- **Fin sans photos** : une intervention terminée sans photos ne notifie jamais le client, même si
  des photos sont ajoutées plus tard (elles restent visibles dans l'espace client, sans mail).
- **Mail de confirmation** : si Resend échoue au moment du paiement, il n'est pas renvoyé. Le mail
  « photos disponibles » n'est jamais renvoyé non plus.
- **Lien de connexion et scanners de mail** : un antivirus qui exécute le JavaScript peut consommer
  le lien (usage unique) avant le client, qui redemande alors un lien.
- **Anti-abus** : champ piège et une réservation en attente par client. La limite de débit par IP
  (Cloudflare) arrive à l'étape 12.
- **Données conservées** : les réservations abandonnées, leurs fiches et les photos d'intervention
  ne sont pas purgées. Les durées de conservation sont à décider (étape 13).

Les limites techniques détaillées (sessions, reçus Stripe, risques acceptés) sont dans
[technical.md](./technical.md).

## À décider avec le client

- Capacité d'une journée : le code la compte en interventions (3 par jour ouvré au départ). Est-ce
  le bon critère, ou faut-il compter les bacs ?
- Délai minimum (2 jours) et horizon (60 jours) de réservation : valeurs provisoires.
- Formules trimestrielle et annuelle : les garder en réservation en ligne ou les réserver au devis
  en V1 ? Que vaut « Annuelle : un passage chaque mois » (prix et libellé) ?
- Facture : mentions légales réelles (raison sociale, forme juridique, SIRET, RCS, TVA, pied de
  page), aujourd'hui des textes fictifs sur chaque facture Stripe.
- CGV (annulation, report, remboursement), durées de conservation des données et des photos, mentions
  légales : étape 13 du `TODO.md`.
- Téléphone, adresse postale et SIRET de BINOVYA : en attente des réponses du client.
