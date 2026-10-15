# TODO — Système de réservation

Specs : [fonctionnelle](./specs/booking-system.md) · [technique](./specs/technical.md)

## 0. Specs

- [ ] Aligner la spec fonctionnelle sur le brief : rayon 20 km, grille tarifaire par formule,
      deux jours de collecte, confirmation « bacs vides et accessibles », devis, pros sur la
      même grille, Luxembourg

## 1. Base de données

- [x] Table de prix : formule × combinaison (1 petit, 2 petits, 1 grand, 2 grands)
- [x] Formule sur la réservation (ponctuelle, trimestrielle, annuelle)
- [x] Deux jours de collecte (ordures ménagères, emballages)
- [x] Confirmation « bacs vides et accessibles » enregistrée sur la réservation
- [x] Table des demandes de devis
- [x] Seed : rayon 20 km, capacité de départ à 3 par jour
- [x] `create_booking` : prix lu dans la grille, plus de tarif dégressif
- [x] Mettre à jour `database.types.ts`
- [x] Appliquer la migration sur le projet Supabase

## 2. Parcours de réservation

- [x] Ordre des étapes : coordonnées et adresse → bacs et collecte → formule et date → paiement
- [x] Visuels des bacs (120–240 L, 600–1 100 L)
- [x] Choix de la formule avec prix mis à jour immédiatement
- [x] Deux jours de collecte, option « Je ne sais pas »
- [x] Case obligatoire « bacs vides et accessibles »
- [x] Bascule vers le devis : 3 bacs ou plus, ou 1 petit + 1 grand
- [x] Validation FR + LU (code postal, téléphone)

## 3. Géocodage

- [x] Endpoint `/api/address/search` : Géoplateforme IGN (France) ou geoportail.lu (Luxembourg)
- [x] Brancher `useAddressSearch` sur cet endpoint
- [x] Sélecteur de pays sur l'adresse et sur le téléphone (indicatif automatique)

## 4. Devis

- [x] Formulaire `/quote` : coordonnées, adresse, types d'équipement (bacs, PAV, mobilier urbain,
      signalétique), bacs demandés seulement si « bacs » est coché, fréquence, commentaire, photos
      facultatives, page unique pour particuliers et professionnels
- [x] Enregistrement en base et mail à BINOVYA
- [x] Bandeau devis/contact à la place de `ProFormSection`
- [x] Page `/contact` refaite, API contact validée et protégée
- [ ] Renseigner `NUXT_RESEND_API_KEY` et `NUXT_CONTACT_EMAIL_TO` pour que les mails de devis et
      de contact partent (le devis est enregistré sans eux, mais `/contact` répond 503)

## 5. Paiement

- [x] Stripe Checkout à la création de la réservation
- [x] Webhook : `pending_payment` → `paid`
- [x] `pg_cron` : `expire_stale_bookings`
- [ ] Renseigner `NUXT_STRIPE_SECRET_KEY`, `NUXT_STRIPE_WEBHOOK_SECRET` et `NUXT_SITE_URL`. En
      local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`. En production :
      créer le endpoint webhook dans le Dashboard Stripe (`checkout.session.completed`,
      `checkout.session.expired`)

## 6. Mails

- [ ] Vérifier le domaine `binovya.com` sur Resend, corriger l'expéditeur du contact
- [ ] Mail de confirmation de réservation
- [ ] Mail de rappel avant le passage
- [ ] Mail « vos photos avant/après sont disponibles » une fois l'intervention terminée : bouton
      « Voir mes photos » en lien magique (connexion en un clic), tutoriel pas à pas en secours

## 7. Espace client

- [ ] Création automatique du compte à la réservation, mention d'information
- [ ] Connexion par lien magique
- [ ] Liste des réservations et photos (URL signées)
- [ ] Demande de suppression du compte

## 8. Espace BINOVYA Pro

- [ ] Accès admin (`app_metadata.role`)
- [ ] Planning du jour, mobile
- [ ] Liste des interventions : client, date, adresse, bacs, formule, paiement, statut
- [ ] Bouton « Itinéraire Google Maps »
- [ ] Bloquer une journée, changer une date, imposer le secteur d'un jour
- [ ] Modifier la capacité par jour de semaine
- [ ] Photos avant/après depuis le téléphone
- [ ] « Terminer l'intervention », disponible après l'ajout des photos

## 9. Tournées

- [ ] Extraits Geofabrik Lorraine + Luxembourg, fusion `osmium`, prétraitement OSRM (`car.lua`, MLD)
- [ ] Conteneurs OSRM et VROOM
- [ ] Endpoint d'optimisation de la tournée du jour (départ et retour au dépôt)
- [ ] Affichage de l'ordre optimisé dans le planning

## 10. Infrastructure

- [ ] Dockerfile Nuxt (preset `node-server`)
- [ ] `docker-compose.yml` : Caddy, Nuxt, OSRM, VROOM, réseaux public et interne
- [ ] Supervision : Prometheus, Loki, Alloy, Grafana, node-exporter, cAdvisor
- [ ] Logs JSON côté Nitro
- [ ] Contrôle de disponibilité externe
- [ ] Caddy : limite de débit par IP sur `/api/booking`, `/api/booking/release`, `/api/contact`
      et `/api/quote`

## 11. CI/CD

- [ ] CI : lint, formatage, typecheck, tests, build
- [ ] Dernier job : image vers GHCR, tags SHA + `latest` sur `main`
- [ ] CD : SSH, `IMAGE_TAG=<sha>`, `docker compose pull && up -d`
- [ ] GitHub Action mensuelle de mise à jour des cartes OSRM

## 12. VPS

- [ ] Commander le VPS
- [ ] Sécurité : SSH par clé, `ufw`, `fail2ban`, `unattended-upgrades`
- [ ] DNS `binovya.com` vers le VPS
- [ ] Premier déploiement

## 13. Légal

- [ ] Mentions légales (hébergeur VPS, Supabase)
- [ ] CGV : annulation, report, remboursement
- [ ] Politique de confidentialité : données client, photos, durées de conservation
- [ ] Décider du sort des réservations abandonnées et de leurs comptes (purge ou anonymisation)

## 14. Après le lancement

- [ ] SMS Brevo (veille et jour J)
- [ ] Abonnements récurrents (selon la décision du client)
- [ ] Sauvegardes (V2)
