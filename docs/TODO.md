# TODO — Système de réservation

Specs : [fonctionnelle](./specs/booking-system.md) · [technique](./specs/technical.md) ·
[SEO](./specs/seo.md)

V1 = ce qu'il faut pour lancer. Le reste est en V2, en fin de fichier (décision du 2026-10-20).

## Étapes terminées

- ✅ 1. Base de données : grille de prix, formules, jours de collecte, devis, `create_booking`,
  voir `specs/technical.md`
- ✅ 2. Parcours de réservation : 4 étapes, bascule vers le devis, validation FR + LU, voir
  `specs/booking-system.md`
- ✅ 3. Géocodage : `/api/address/search` (IGN, geoportail.lu) et sélecteur de pays, voir
  `specs/technical.md`
- ✅ 4. Devis : formulaire `/quote`, enregistrement, mail à BINOVYA et page `/contact`, voir
  `specs/booking-system.md`
- ✅ 5. Paiement : Stripe Checkout, webhook et expiration `pg_cron`, voir `specs/technical.md`
- ✅ 6. Mails : confirmation, annulation, alerte admin, rappel, photos disponibles, habillage
  commun, voir `specs/technical.md`
- ✅ 7. Espace client : lien magique, cartes de réservation, suppression du compte, jeton
  d'adresse signé, voir `specs/booking-system.md`
- ✅ 8. Espace BINOVYA Pro : accès admin, planning, liste, disponibilités, déplacement, photos,
  fin d'intervention, photos côté client, voir `specs/technical.md` et `specs/booking-system.md`

## V1

### Reste des étapes 0 à 8

- [ ] 0. Aligner `specs/booking-system.md` sur le brief (rayon 20 km, grille par formule, deux
     jours de collecte, « bacs vides et accessibles », devis, pros, Luxembourg)
- [ ] 7. Vérifier dans le dashboard Supabase : Auth Hook « Send Email » vers
     `public.suppress_auth_emails`, OTP e-mail à 86 400 s, inscriptions désactivées
- [ ] 8. Chore : migrer les boutons natifs de la réservation, du devis, de la page contact
     (hors envoi, déjà fait) et de `AccountDeletionRequest.vue` vers `AppButton`
- [ ] 8. Chore : WebKit perd la session Supabase sur `http://localhost` (cookie `Secure` par
     défaut dans `@nuxtjs/supabase`, aucun `cookieOptions` dans `nuxt.config.ts`) : l'espace Pro
     est inutilisable dans Safari de bureau en local. Poser `cookieOptions.secure` seulement en
     production, puis rétablir le projet Playwright WebKit (étape 10)
- [ ] 8. Chore e2e : test instable du détail de `customer-area-bookings` (squelette encore
     affiché après 5 s sur un serveur de dev lent)
- [ ] 8. Hors code : facture française réelle avec les mentions légales, à décider avec le
     client (le reçu Stripe n'en tient pas lieu)

### SEO (branche `chore/seo`, après la fusion de l'étape 8 dans `dev`)

Audit du 2026-10-17, 29 constats : voir `specs/seo.md`.

- [ ] Répondre aux questions client de `specs/seo.md` (adresse, téléphone, domaine, engagements)
- [ ] `<html lang>` absent sur tout le site (WCAG 3.1.1) : `useLocaleHead` dans `app.vue`
- [ ] Autres pages privées hors index (en-têtes `X-Robots-Tag`)
- [ ] Sitemap, robots, URL publique, canonical et hreflang
- [ ] Données structurées (`LocalBusiness`, `Service`, `FAQPage`, `BreadcrumbList`)
- [ ] Page `/formulas` (clés i18n brutes) et images manquantes
- [ ] Maillage interne et sélecteur de langue
- [ ] Titres, descriptions et images (OG, dimensions, `alt`)

### 10. Infrastructure

Tout se prépare et se teste en local. La mise en place sur le VPS est à l'étape 12.

- [ ] Dockerfile Nuxt (preset `node-server`)
- [ ] `docker-compose.yml` : Caddy et Nuxt seulement
- [ ] `Caddyfile` : redirection `www`, en-têtes de sécurité, logs JSON
- [ ] CSP simple, écrite une fois, testée en local sur la réservation et Stripe Checkout,
      l'espace client et l'espace Pro (avec `blob:` dans `img-src` pour les aperçus de photos),
      appliquée dès le lancement (pas de phase Report-Only)
- [ ] Projet Playwright WebKit (voir le chore de l'étape 8)

### 11. CI/CD

- [ ] Ajouter `vue-tsc` en devDependency et un script `typecheck`, puis corriger les 5 erreurs
      (`HeroSection`, `ServicesSection`, `TrustStripSection`, `LanguageSwitcherDesktop`,
      `LanguageSwitcherMobile`)
- [ ] CI : lint, formatage, typecheck, tests unitaires, build
- [ ] CI : image vers GHCR (tags SHA + `latest` sur `main`)
- [ ] CD : SSH, `docker compose pull && up -d`
- Les tests d'intégration et e2e restent en local avant chaque fusion.

### 12. Mise en production

- [ ] Commander le VPS ; SSH par clé seulement, root désactivé, `unattended-upgrades`
- [ ] Horloge NTP (`timedatectl` : `System clock synchronized: yes`), sinon les webhooks Stripe
      sont rejetés (tolérance de 5 min)
- [ ] `ufw` : 22 ouvert, 80 et 443 limités aux plages Cloudflare ; `fail2ban` pour SSH
      seulement (il ne doit pas surveiller 80 et 443 : il bannirait Cloudflare)
- [ ] Cloudflare plan gratuit : DNS de `binovya.com`, enregistrements proxifiés, SPF/DKIM/DMARC
      Resend en « DNS only », SSL « Full (strict) »
- [ ] Cloudflare : UNE règle de limite de débit pour les routes sensibles (`/api/auth/login`,
      `/api/pro/auth/login`, `/api/booking*`, `/api/contact`, `/api/quote`,
      `/api/address/search`), proposition 30 req / 10 s par IP, blocage 60 s ; vérifier le
      nombre de règles du plan gratuit
- [ ] Caddy : `trusted_proxies` sur les plages Cloudflare, IP réelle dans `CF-Connecting-IP`,
      volume `/data` persisté (certificats, limite Let's Encrypt)
- [ ] Resend : vérifier le domaine `binovya.com`, puis renseigner `NUXT_MAIL_FROM`
- [ ] Supabase de production dans l'organisation du client : check-list de `technical.md`,
      migrations par `supabase db push`
- [ ] Compte admin de production SANS mot de passe, `app_metadata.role = 'admin'`, adresse
      dédiée non publiée (la requête de contrôle de `technical.md` ne doit rien renvoyer)
- [ ] RLS automatique (event trigger `ensure_rls`) en production : décider (option ou migration)
- [ ] Plan Supabase Pro (25 $/mois) pour les sauvegardes automatiques : à convenir avec le
      client (remplace les scripts de sauvegarde maison)
- [ ] Variables de production dans le `.env` du VPS : `NUXT_SITE_URL` en https,
      `NUXT_ADDRESS_TOKEN_SECRET`, clés Stripe LIVE et endpoint webhook du Dashboard
      (`checkout.session.completed`, `checkout.session.expired`), `NUXT_MAIL_FROM`,
      `NUXT_CONTACT_EMAIL_TO`, clés Supabase. `NUXT_MAIL_TRANSPORT` absent. Copie dans un
      gestionnaire de mots de passe
- [ ] Passage sur un vrai iPhone et avec un vrai lecteur d'écran
- [ ] Premier déploiement
- [ ] Contrôle de disponibilité externe gratuit

### 13. Légal

- [ ] Mentions légales (hébergeur VPS, Supabase)
- [ ] CGV : annulation, report, remboursement
- [ ] Politique de confidentialité : données client, photos, durées de conservation (la date de
      mise à jour est écrite en dur, la durée de conservation des réservations manque)
- [ ] Politique de confidentialité : Cloudflare comme sous-traitant (société américaine,
      déchiffre le trafic), avec son DPA
- [ ] Décider du sort des réservations abandonnées et de leurs comptes (purge ou anonymisation)
- [ ] Décider de la durée de conservation des photos avant/après (RGPD), à citer dans la
      politique de confidentialité et à appliquer au bucket `intervention-photos`
- [ ] Masquer les formules trimestrielle et annuelle en V1 (devis uniquement)

## V2 (après le lancement)

- 9. Tournées : extraits Geofabrik Lorraine + Luxembourg, fusion `osmium`, prétraitement OSRM,
     conteneurs OSRM et VROOM, endpoint d'optimisation, ordre optimisé dans le planning, GitHub
     Action mensuelle des cartes OSRM. En V1 la tournée suit l'ordre de la liste via le lien
     Google Maps existant
- Supervision : Prometheus, Loki, Alloy, Grafana, node-exporter, cAdvisor ; logs JSON côté
  Nitro ; durée de conservation des logs Loki (IP = donnée personnelle, à citer dans la
  politique de confidentialité)
- Sauvegardes maison (seulement si le client refuse Supabase Pro) : `pg_dump`, copie du bucket
  `intervention-photos`, chiffrement `age`/`gpg`, envoi hors site S3 en UE, rétention et
  alerte, test de restauration mensuel, cron nocturne sur le VPS
- Supabase reproductible : script `supabase:provision`, `config.toml` + `config push`,
  `migration repair`, `rls_auto_enable` en migration
- Projet Supabase de test dédié à la CI : intégration et e2e en CI (secrets Stripe `sk_test_`),
  refus de tourner hors de l'URL de test, `concurrency` GitHub Actions
- Cloudflare Turnstile (`/login`, `/booking`, `/contact`, `/quote`) ; limites de débit par
  route (`/api/account/*`, `/api/pro/bookings/*/photos/*`, `/api/booking/availability`…)
- Durcissement des droits par défaut : `anon` sur les autres tables de `public`
  (`revoke all … from anon`, `alter default privileges …`), `references` et `trigger` sur
  `price_grid`, `booking_settings`, `quote_requests`
- SMS Brevo (veille et jour J)
- Abonnements récurrents (formules trimestrielle et annuelle)
