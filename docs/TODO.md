# TODO — Système de réservation

Specs : [fonctionnelle](./specs/booking-system.md) · [technique](./specs/technical.md) ·
[SEO](./specs/seo.md)

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

- [ ] Vérifier le domaine `binovya.com` sur Resend (à faire par l'utilisateur, après les
      enregistrements DNS Cloudflare, étape 12)
- [x] Expéditeur corrigé : `NUXT_MAIL_FROM`, repli sur `contact@dg-zenith.com`
- [ ] Renseigner `NUXT_MAIL_FROM` en production (`BINOVYA <…@binovya.com>` une fois le domaine
      vérifié, étape 12)
- [x] Mail de confirmation de réservation
- [x] Mail d'annulation et de remboursement (paiement tardif)
- [x] Alerte admin à chaque réservation payée
- [x] Mail de rappel avant le passage (tâche `booking:reminders`, J-1 à J-2)
- [x] Habillage BINOVYA de tous les mails (mise en page commune, CSS inliné à l'envoi)
- [ ] Mail « vos photos avant/après sont disponibles » une fois l'intervention terminée, tutoriel
      pas à pas en secours. Envoyé seulement si l'intervention a des photos : une fin forcée sans
      photos n'envoie pas ce mail. Gabarit prêt (`sendPhotosAvailableEmail`), envoi pas encore branché,
      déclenchement à l'étape 8. Le lien du bouton « Voir mes photos » est à décider au lot 3 de l'étape 8 :
      lien simple vers `/login` (option A, cohérent avec « Suivre ma réservation » du mail de
      confirmation et avec l'option C), ou `createLoginLink` hors du plafond de `claim_login_link`
      (option B). Dans les deux cas `isAllowedLoginUrl` (hôte Supabase autorisé) devient obsolète

## 7. Espace client

- [x] Fiche client créée à la réservation, espace ouvert uniquement par le lien demandé par le
      client (option C), mention à la réservation et section confidentialité
- [x] Connexion par lien magique (`/login`, `POST /api/auth/login`, `/account/confirm`)
- [x] Cartes de réservation et page `/account/bookings/[id]`
- [x] Demande de suppression du compte
- [ ] Appliquer dans l'ordre les 4 migrations du 2026-10-16 (`20261016000000` à `20261016030000`)
      et régler Supabase : Auth Hook « Send Email » vers `public.suppress_auth_emails`, Email OTP
      Expiration à 86 400 s, inscriptions désactivées (voir `docs/specs/technical.md`)
- [x] Rejouer les tests qui envoyaient de vrais mails : réglé autrement, plus aucun test
      n'envoie de vrai mail (transport `outbox`). Suite complète au vert, 648 tests sur 648, le
      2026-10-16

- [x] Jeton d'adresse signé sur la recherche d'adresse, vérifié par réservation, devis et
      disponibilités (voir `technical.md`)

## 8. Espace BINOVYA Pro

Lots 1 et 2 faits (accès, planning, liste, itinéraire ; disponibilités et déplacement d'une
intervention). Le lot 3 couvre les photos et la fin d'intervention.

- [x] Accès admin (`app_metadata.role`)
- [x] Planning du jour, mobile
- [x] Liste des interventions : client, date, adresse, bacs, formule, paiement, statut
- [x] Bouton « Itinéraire Google Maps »
- [ ] Appliquer dans l'ordre les migrations `20261017000000_admin_login_link` et
      `20261017010000_admin_session_rule` (SQL Editor)
- [x] Appliquer les migrations du lot 2 `20261017020000_pro_availability_admin` et
      `20261017030000_pro_availability_hardening` (SQL Editor, vérifiées en base : `day_check`,
      `admin_reschedule_booking`, `admin_day_overview` et `is_admin` existent)
- [x] Lot 2 : migration qui écrit les appels `is_admin()` des policies en `(select
public.is_admin())` (fonction plpgsql, évaluée par ligne) et ajoute `is_admin` à `Functions`
      de `app/types/database.types.ts`
- [x] Lot 2 : revérifier l'admin par `auth.getUser()` avant toute écriture (`requireAdminForWrite`,
      un rôle retiré ne coupe l'accès qu'après 1 h au plus avec `getClaims`)
- [ ] Lot 3 : même revérification (`requireAdminForWrite`) sur les routes d'écriture des photos et
      de la fin d'intervention
- [ ] Chore : déplacer les constantes de classes de formulaire et de calendrier de
      `app/constants/booking.ts` vers `app/constants/form.ts`
- [x] Bloquer une journée, changer une date, imposer le secteur d'un jour (`/pro/availability`,
      secteur par commune)
- [x] Modifier la capacité par jour de semaine
- [x] Déplacer une intervention depuis l'espace Pro (`ProRescheduleDialog`), avec « Forcer quand
      même » pour les refus qui le permettent, et mail au client
- [x] Navigation latérale Pro (`ProNavPanel`), bouton commun `AppButton`, panneau d'état du jour
      et badge « À déplacer »
- [ ] Chore : migrer la croix de fermeture de `ProRescheduleDialog` (bouton natif) vers
      `AppButton` en icône seule, avec la migration des boutons de la réservation, du devis et
      du contact vers `AppButton`
- [ ] Chore (facultatif) : déplacer « Suivre la règle » de `ProCapacityField` sur la ligne du
      libellé
- [ ] Chore e2e : une session admin partagée (`storageState` Playwright) à la place de la
      connexion par lien magique de chaque test (43 connexions, `signInNewAdmin` instable, parfois
      bloqué sur `/pro/confirm`)
- [ ] Lancer `bun run test` une fois, à la fin de l'étape (après le lot 3), avant la fusion dans
      `dev` : les tests des lots 1 et 2 sont écrits mais pas rejoués lot par lot
- [ ] Photos avant/après depuis le téléphone
- [ ] « Terminer l'intervention », disponible après l'ajout des photos ; l'admin peut forcer la
      fin sans photos, après confirmation
- [ ] Photos avant/après et facture dans l'espace client (retirées de `/account` à l'étape 7,
      emplacements « Bientôt disponible » sur `/account/bookings/[id]`, mentions légales françaises
      de la facture à fixer avec le client)

## 9. Tournées

- [ ] Extraits Geofabrik Lorraine + Luxembourg, fusion `osmium`, prétraitement OSRM (`car.lua`, MLD)
- [ ] Conteneurs OSRM et VROOM
- [ ] Endpoint d'optimisation de la tournée du jour (départ et retour au dépôt)
- [ ] Affichage de l'ordre optimisé dans le planning

## 10. Infrastructure

Tout se prépare et se teste en local, sans serveur. La mise en place sur le VPS est à l'étape 12.

- [ ] Dockerfile Nuxt (preset `node-server`)
- [ ] `docker-compose.yml` : Caddy, Nuxt, OSRM, VROOM, supervision, réseaux public et interne
- [ ] `Caddyfile` : redirection `www`, en-têtes de sécurité, logs JSON (cible dans
      `technical.md`, « Hébergement »)
- [ ] `Caddyfile` : `Content-Security-Policy-Report-Only` rédigée et testée en local contre Nuxt
      et Supabase (le passage en application est à l'étape 12). Le cookie de session est lisible
      par le JavaScript, une XSS est donc le principal risque de vol de session
- [ ] Tests : projet Playwright WebKit (Safari)
- [ ] Logs JSON côté Nitro
- [ ] Supervision : configuration de Prometheus, Loki, Alloy, Grafana, node-exporter, cAdvisor
- [ ] Sauvegarde : script shell `pg_dump` de la base Supabase (planifié par cron à l'étape 12)
- [ ] Sauvegarde : script de copie du bucket Storage `intervention-photos` (le dump ne contient
      que les chemins, pas les fichiers)
- [ ] Sauvegarde : chiffrement des dumps avant qu'ils quittent la machine (`age` ou `gpg`), ils
      contiennent des données personnelles (RGPD)
- [ ] Sauvegarde : envoi hors site vers un stockage objet compatible S3 en UE, chez un fournisseur
      différent de celui du VPS (Backblaze B2, Scaleway, OVH). Jamais de sauvegarde uniquement sur
      le VPS
- [ ] Sauvegarde : politique de rétention (ex. 7 quotidiennes + 4 hebdomadaires + 12 mensuelles)
      et alerte en cas d'échec
- [ ] Sauvegarde : test de restauration mensuel automatisé, dans un conteneur Postgres jetable
      (voir « Sauvegardes » dans `technical.md`), avec alerte si les comptages diffèrent

## 11. CI/CD

- [ ] Typecheck : `bunx nuxi typecheck` échoue sur cette machine (`npx` récupère vue-tsc 3.3.13
      avec TypeScript 7) et le projet n'a ni script `typecheck` ni `vue-tsc` en devDependency.
      Ajouter `vue-tsc` en devDependency et un script `typecheck`, puis corriger les 5 erreurs
      existantes (`HeroSection.vue`, `ServicesSection.vue`, `TrustStripSection.vue`,
      `LanguageSwitcherDesktop.vue`, `LanguageSwitcherMobile.vue`)
- [ ] CI : lint, formatage, typecheck, tests, build
- [ ] CI : lancer `bun scripts/test-run.ts unit integration` (autonome, sans e2e ni clé Resend)
      sur une VM neuve : installer Bun et la CLI Stripe, avec le cache du fournisseur (clés
      basées sur `bun.lock`)
- [ ] CI : secrets `sk_test_` Stripe (`NUXT_STRIPE_SECRET_KEY` ou `STRIPE_API_KEY`) et clés
      Supabase d'un projet de test DÉDIÉ, jamais celles de la production
- [ ] Tests : refuser de tourner si l'URL Supabase n'est pas celle du projet de test (comme
      `assertTestStripeKey` pour Stripe)
- [ ] CI : réglage `concurrency` de GitHub Actions, pour qu'une seule exécution tourne à la fois
      (base de test et compte Stripe de test partagés)
- [ ] Supabase reproductible avec la CLI, sans Terraform : `supabase migration repair` sur le
      projet de dev (plus de 10 migrations appliquées à la main), réglages Auth (hook Send Email
      vers `public.suppress_auth_emails`, expiration de l'OTP e-mail à 86 400 s, inscriptions
      désactivées) déplacés dans `supabase/config.toml` puis `supabase config push`, event
      trigger `rls_auto_enable` transformé en migration (il n'existe que sur le projet de dev)
- [ ] Script `bun run supabase:provision` (création du projet, `link`, `db push`, `config push`),
      réutilisé pour la production et pour le projet de test dédié à la CI. Les clés restent
      copiées à la main
- [ ] Dernier job : image vers GHCR, tags SHA + `latest` sur `main`
- [ ] CD : SSH, `IMAGE_TAG=<sha>`, `docker compose pull && up -d`
- [ ] GitHub Action mensuelle de mise à jour des cartes OSRM

## 12. Mise en production

Applique sur le vrai serveur et les vrais comptes ce que l'étape 10 a préparé en local.

- [ ] Commander le VPS
- [ ] Sécurité du serveur : SSH par clé uniquement, root désactivé, `unattended-upgrades`
- [ ] Horloge synchronisée par NTP (`timedatectl` doit afficher `System clock synchronized: yes`),
      sinon toutes les signatures de webhook Stripe (tolérance de 5 min) sont rejetées
- [ ] `ufw` : 22 ouvert, 80 et 443 limités aux plages d'IP publiées par Cloudflare
- [ ] `fail2ban` pour SSH uniquement : derrière Cloudflare il ne voit que des IP Cloudflare sur 80
      et 443, il ne doit pas surveiller ces ports sous peine de bannir Cloudflare
- [ ] Cloudflare : compte (plan gratuit) et DNS de `binovya.com` hébergé chez Cloudflare
- [ ] Cloudflare : enregistrements proxifiés (`A`, `AAAA` s'il y a une IPv6, `CNAME` `www`), et
      Resend (SPF, DKIM, `MX send`) et `_dmarc` en « DNS only ». `CAA` facultatif
- [ ] Cloudflare : règles de limite de débit par IP sur `/api/auth/login`, `/api/pro/auth/login`, `/api/booking`,
      `/api/booking/release`, `/api/contact` et `/api/quote` (vérifier le nombre de règles du plan
      gratuit)
- [ ] Cloudflare : limite de débit sur `/api/address/search` et `/api/booking/availability`
- [ ] Définir `NUXT_ADDRESS_TOKEN_SECRET` (production et secrets CI, étape 11)
- [ ] Cloudflare : évaluer Turnstile sur `/login`, `/booking`, `/contact` et `/quote`
- [ ] Cloudflare : mode SSL « Full (strict) », certificat d'origine sur Caddy (Let's Encrypt ou
      Origin CA ; défi HTTP-01 ou défi DNS avec le plugin Cloudflare, à trancher)
- [ ] Caddy : `trusted_proxies` sur les plages Cloudflare, IP réelle lue dans `CF-Connecting-IP`
- [ ] Caddy : volume `/data` persisté (certificats, limite Let's Encrypt de 5 certificats
      identiques par semaine)
- [ ] Resend : vérifier le domaine `binovya.com` une fois les enregistrements DNS posés, puis
      renseigner `NUXT_MAIL_FROM` (deux items de l'étape 6)
- [ ] Projet Supabase de production, dans l'organisation du client : suivre la check-list « Mise
      en place du projet Supabase de production » de `technical.md`
- [ ] Créer le compte admin de production SANS mot de passe (invitation, ou
      `auth.admin.createUser` sans `password`), `app_metadata.role = 'admin'`, sur une adresse
      dédiée non publiée ; la requête de contrôle de `technical.md` doit ne rien renvoyer
- [ ] RLS automatique en production : activer l'option qui crée l'event trigger `ensure_rls` (absent
      des migrations), ou l'ajouter par une migration dédiée (décision à prendre)
- [ ] Discuter avec le client du plan Supabase Pro (25 $/mois), seule voie de sauvegardes
      automatiques téléchargeables côté Supabase (et de « Time-box user sessions »)
- [ ] Variables d'environnement de production dans le `.env` du VPS : `NUXT_SITE_URL` en https,
      clés Stripe LIVE et endpoint webhook du Dashboard (voir l'étape 5), `NUXT_MAIL_FROM` (après
      vérification du domaine), `NUXT_CONTACT_EMAIL_TO`, clés Supabase de production.
      `NUXT_MAIL_TRANSPORT` doit rester absent : le serveur refuse `outbox` hors développement et
      journalise une erreur au démarrage. Copie du `.env` dans un gestionnaire de mots de passe
- [ ] Passage sur un vrai iPhone et avec un vrai lecteur d'écran avant le lancement
- [ ] Premier déploiement
- [ ] Sauvegardes : cron nocturne activé sur le VPS, puis premier test de restauration
- [ ] `Content-Security-Policy` passée de Report-Only à l'application, après vérification des
      rapports sur le site réel
- [ ] Contrôle de disponibilité externe (gratuit, hors du VPS)

## 13. Légal

- [ ] Mentions légales (hébergeur VPS, Supabase)
- [ ] CGV : annulation, report, remboursement
- [ ] Politique de confidentialité : données client, photos, durées de conservation. La section
      « Espace client » existe, mais la date de dernière mise à jour est écrite en dur dans la page
      et la durée de conservation des données de réservation manque
- [ ] Politique de confidentialité : lister Cloudflare comme sous-traitant (société américaine,
      déchiffre le trafic) avec son DPA
- [ ] Durée de conservation des logs dans Loki (étape 12) : ils contiennent les IP des visiteurs,
      donnée personnelle au sens du RGPD. À fixer et à citer dans la politique de confidentialité
- [ ] Décider du sort des réservations abandonnées et de leurs comptes (purge ou anonymisation)
- [ ] Avant le lancement, décider du sort des formules trimestrielle et annuelle : aujourd'hui
      elles sont payées en une fois pour un seul passage, sans engagement enregistré. Les masquer
      (devis uniquement) ou livrer l'étape 14 (abonnements) avant

## SEO (branche `chore/seo`, après la fusion de l'étape 8 dans `dev`)

Audit du 2026-10-17, 29 constats : voir `specs/seo.md`. Sans numéro, pour ne pas renuméroter.

- [ ] Répondre aux questions client de `specs/seo.md` (adresse, téléphone, domaine, engagements)
- [ ] Pages privées hors index (`/login` en `noindex`, en-têtes `X-Robots-Tag`)
- [ ] Sitemap, robots, URL publique, canonical et hreflang
- [ ] Données structurées (`LocalBusiness`, `Service`, `FAQPage`, `BreadcrumbList`)
- [ ] Page `/formulas` (clés i18n brutes) et images manquantes
- [ ] Maillage interne et sélecteur de langue
- [ ] Titres, descriptions et images (OG, dimensions, `alt`)

## 14. Après le lancement

- [ ] SMS Brevo (veille et jour J)
- [ ] Abonnements récurrents (selon la décision du client, voir l'item des formules trimestrielle
      et annuelle à l'étape 13)
