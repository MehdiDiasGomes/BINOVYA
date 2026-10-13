# Système de réservation en ligne

> Statut : brainstorming, rien n'est développé. Dernière mise à jour : 2026-10-10.

## Objectif

Permettre à un client de réserver une intervention, de la payer en ligne, puis de consulter
les photos avant/après depuis son compte.

## Parcours

1. Le client saisit son adresse, puis choisit une ou plusieurs prestations et leur quantité.
2. Il indique le ou les jours de collecte de ses bacs (ou « je ne sais pas »).
3. Il choisit un jour parmi ceux ouverts pour son secteur.
4. Il saisit ses coordonnées, son compte est créé automatiquement.
5. Il paie via Stripe Checkout.
6. Il reçoit un mail de confirmation, puis un SMS la veille et le jour J.
7. Après l'intervention, l'admin dépose une photo avant et une photo après.
8. Le client consulte ses réservations et ses photos dans son espace.

## Services retenus

| Besoin                          | Service  | État        |
| ------------------------------- | -------- | ----------- |
| Mail                            | Resend   | Déjà en place |
| SMS                             | Brevo    | À connecter |
| Paiement                        | Stripe   | À connecter |
| Comptes, base de données, photos | Supabase | À connecter |
| Géocodage des adresses          | Géoplateforme IGN (gratuit) | À connecter |

En production, tous les comptes sont au nom du client final, le développeur y est invité.
En développement : Stripe en mode test sur le compte du développeur, Supabase dans une
organisation dédiée au client (transférable).

- **Supabase** : plan gratuit au lancement, avec maintien en vie et sauvegarde programmés
  par action GitHub. Passage au plan Pro quand l'activité est réelle.
- **Hébergement** : Vercel aujourd'hui, à trancher (Vercel Pro, serveur loué ou Cloudflare).
  Le code reste indépendant de l'hébergeur.

## Schéma de données

Source de vérité : `supabase/migrations/`. Vue d'ensemble :

```
profiles                      services
--------                      --------
id (= auth.users.id)          id
email                         slug
first_name                    name
last_name                     first_unit_price_cents
phone                         additional_unit_price_cents
                              is_active

bookings                              booking_items
--------                              -------------
id                                    id
customer_id  -> profiles.id           booking_id -> bookings.id
scheduled_date                        service_id -> services.id
address, city, postcode               quantity
latitude, longitude                   line_total_cents
collection_weekdays
status (pending_payment | paid |      intervention_photos
        completed | cancelled |       -------------------
        expired)                      id
amount_total_cents                    booking_id -> bookings.id
stripe_checkout_session_id            kind (before | after)
stripe_payment_intent_id              storage_path
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
`expire_stale_bookings` (libère les réservations non payées).

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
  transaction, puis libérée (`expired`) si la session Stripe expire sans paiement.
- **Bornes** : délai minimum avant intervention et horizon maximum de réservation, à définir.
- **Paiement** : la réservation est créée en `pending_payment`, le webhook Stripe la passe en `paid`.
- **Public** : réservation en ligne pour les particuliers uniquement, les professionnels
  passent par le formulaire de contact pour un devis.
- **Prestations** : une réservation contient une ou plusieurs lignes (`booking_items`), une
  par prestation, avec sa quantité et son total figé.
- **Tarif dégressif** : premier bac au prix plein, suivants au prix réduit (petits bacs
  19,90 € puis 9,90 €, grands bacs 39,90 € puis 29,90 €), appliqué par prestation. Le total
  est calculé côté serveur.
- **Montant** : figé dans `amount_total_cents` au moment du paiement.
- **Photos** : bucket privé, accès par URL signées temporaires.
- **Accès** : RLS, un client ne lit que ses données, seul l'admin écrit photos et statuts.
- **Rôle admin** : stocké dans `app_metadata` (jamais `user_metadata`, modifiable par
  l'utilisateur), lu dans les policies via `auth.jwt() -> 'app_metadata' ->> 'role'`.
- **Connexion** : lien magique par mail, sans mot de passe.
- **SMS** : tâche quotidienne (`pg_cron`), les colonnes `*_sent_at` empêchent les doublons.
- **Confidentialité** : téléphone et photos des locaux à mentionner dans la page dédiée.

## Limites connues

- **Vol d'oiseau** : les distances sont calculées en ligne droite, pas par la route. Suffisant
  pour regrouper par secteur, la distance routière demanderait une API payante.
- **Le premier client décide** : une première réservation isolée bloque la journée pour son
  secteur. Parade : l'admin impose le secteur du jour à l'avance.
- **Zone desservie** : sans distance maximale autour du dépôt, n'importe quelle adresse en
  France pourrait réserver. D'où la limite de 30 km.

- **Collecte déclarée par le client** : pas de source nationale connue des jours de collecte.
  Jours fériés décalés et collectes une semaine sur deux ne sont pas gérés. Les réponses
  accumulées par commune permettront plus tard de préremplir la question.

## Coûts récurrents

- **Stripe** : commission par paiement, pas d'abonnement (tarif à vérifier sur stripe.com/fr/pricing).
- **Brevo** : environ 0,045 € par SMS, soit environ 0,09 € par réservation (à confirmer).

## Estimation

Environ 7 à 11 jours : réservation, calendrier, paiement, comptes, espace client, page admin et SMS.

## À remplir (à voir avec le client)

- Capacité d'une journée : en nombre d'interventions, ou en quantité de bacs ?
- Délai minimum avant intervention et horizon maximum de réservation ?
