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
- ✅ 10. Infrastructure : Dockerfile (`node-server`), `deploy/docker-compose.yml` (Caddy et Nuxt),
  `deploy/Caddyfile`, CSP testée en local derrière Caddy (14 pages publiques, réservation et
  retour Stripe Checkout, espace client, espace Pro), connexion par lien magique, connexion admin
  Pro et paiement confirmé par webhook derrière Caddy vérifiés à la main dans la pile locale
  (2026-10-22), garde de démarrage `productionConfigCheck`, projet Playwright WebKit,
  voir `specs/technical.md`
- ✅ 11. CI/CD : `.github/workflows/ci.yml` (`check` : lint, formatage, typecheck, tests
  unitaires, build, sans secret ; `image` : GHCR `linux/amd64`, `<sha>` + `latest` sur `main`,
  `dev-<sha>` sur `dev` ; `deploy` : SSH, digest, validation du `Caddyfile`, restauration en cas
  d'échec) et `.github/dependabot.yml`, image vérifiée sans secret (2026-10-23). Le CD n'a pas
  encore tourné : premier déploiement à l'étape 12, voir `specs/technical.md`

## V1

### Reste des étapes 0 à 8

- [ ] 0. Aligner `specs/booking-system.md` sur le brief (rayon 20 km, grille par formule, deux
     jours de collecte, « bacs vides et accessibles », devis, pros, Luxembourg)
- [ ] 7. Vérifier dans le dashboard Supabase : Auth Hook « Send Email » vers
     `public.suppress_auth_emails`, OTP e-mail à 86 400 s, inscriptions désactivées
- [x] 8. Chore : migrer les boutons natifs de la réservation, du devis, de la page contact
     (hors envoi, déjà fait) et de `AccountDeletionRequest.vue` vers `AppButton` (variante
     `destructiveSolid` ; restent natifs : date suggérée, « Réessayer » de l'adresse, pastille
     de retrait d'une photo du devis, faute de variante, voir `specs/technical.md`)
- [x] 8. Chore : WebKit perd la session Supabase sur `http://localhost` (cookie `Secure` par
     défaut dans `@nuxtjs/supabase`) : `cookieOptions.secure` posé seulement en production et
     projet Playwright WebKit rétabli (étape 10), voir `specs/technical.md`
- [x] 8. Chore e2e : test instable du détail de `customer-area-bookings` (suite e2e refaite,
     le test attend la réponse réseau, vert à chaque run complet)
- [ ] 8. Chore UI (ui-stylist) : le header sticky masque la case « bacs prêts » à l'étape de
     paiement de la réservation. L'aide e2e `acceptPaymentCheckboxes` la centre avant de la
     cocher, mais la page a besoin d'un `scroll-margin` ou `scroll-padding`
- [ ] 8. À vérifier à la main : lenteur possible de `POST /api/pro/bookings/[id]/payment-link`
     (renvoi parfois > 20 s sous charge, `tests/e2e/pro/pro-create.spec.ts:156` instable 1 fois
     sur 3), de la carte « lien déjà utilisé » du lien magique (7,4 s en run complet contre 3,4 s
     seule, `tests/e2e/customer-area.spec.ts:54`), et un résultat intermittent à 0 mail dans
     `tests/integration/pro/pro-complete.test.ts:89` (vert 4 fois sur 4 seul)
- [ ] 8. À vérifier à la main (plus couvert par l'e2e) : mise en page à 375 px, survol, anneau de
     focus et squelettes de l'espace client, accordéon des détails Pro (`aria-expanded`), feuille
     mobile du dialogue de déplacement, `href` des liens du pied de page Pro, branche 401 de
     `AccountDeletionRequest.vue`, retour à la dernière page de `/pro/interventions` quand
     `?page=` dépasse la fin, alerte de délai du dialogue de déplacement et rechargement de la
     liste à la fermeture
- [ ] 8. Hors code : facture française réelle avec les mentions légales, à décider avec le
     client (le reçu Stripe n'en tient pas lieu)

### SEO (branche `chore/seo`, après la fusion de l'étape 8 dans `dev`)

Audit du 2026-10-17 (29 constats), code livré le 2026-10-22 : voir `specs/seo.md`. Restent les
constats qui attendent le client (#10, #11, #12, #16, #17, #18).

- [ ] Répondre aux questions client de `specs/seo.md` (adresse, téléphone, villes ciblées, image
      OG, engagements restants, mentions légales LCEN : téléphone, SIRET/RCS, hébergeur).
      Domaine et e-mail tranchés : `binovya.com`, `contact@binovya.fr`
- [x] `<html lang>`, `canonical`, `hreflang` avec `x-default`, langue `en` au lieu de `en-US` :
      `useLocaleHead` dans `app.vue` (#5, #6, #15)
- [x] Pages privées : en-têtes `X-Robots-Tag` via `routeRules` (#2)
- [x] Sitemap, robots, URL publique `NUXT_PUBLIC_SITE_URL` (#3, #4)
- [ ] Données structurées : `LocalBusiness`, `Service` (#10), après les réponses du client
- [x] Page `/formulas`, clés `alt` et `aria-label` absentes, images manquantes : pages supprimées
      (`/formulas`, `/about`, `/faq`, `/solutions/*`) (#7, #13, #14)
- [x] Maillage interne, sélecteur de langue, liens localisés, footer (#8, #9, #23, #24)
- [ ] Adresse et téléphone cohérents, après réponse du client (#11, #12 ; téléphone factice déjà
      retiré de `/legal`)
- [ ] Titres, descriptions, promesses restantes, image OG (#16, #17, #18) ; fait : dimensions,
      `sizes`, `alt` (#21, #22)
- [x] FAQ et `$tm` / `$rt` (#19, #20) : `/faq` supprimée, `privacy` corrigée
- [x] Dates « Dernière mise à jour » pilotées par `app/constants/legal.ts` (#28) ; la révélation
      au scroll de `/formulas` (#25) est sans objet

### 11. CI/CD (terminée, voir « Étapes terminées »)

- [x] `vue-tsc` en devDependency et script `typecheck` qui couvre aussi `tests/` (branche
      `chore/typecheck`, fusionnée dans `dev`)
- [x] CI : lint, formatage, typecheck, tests unitaires, build
- [x] CI : image vers GHCR (tags `<sha>` + `latest` sur `main`, `dev-<sha>` sur `dev`),
      construite en `linux/amd64`
- [x] CI : le job de build ne reçoit aucun secret applicatif (toute variable `NUXT_*` présente
      au `nuxt build` est cuite dans `.output`)
- [x] CI : images de base épinglées par tag (`oven/bun`, `node`, `caddy`), Dependabot mensuel
      sur `dev` (actions, `Dockerfile`, `deploy/`)
- [x] Revoir le garde de démarrage (`productionConfigCheck`) si un prérendu est ajouté : aucun
      prérendu n'existe, rien à faire
- [x] CD écrit dans le code : SSH, copie de `deploy/`, `pull`, validation du `Caddyfile`, `up`
      par digest, `IMAGE_TAG` écrit après succès, restauration en cas d'échec. Non prouvé :
      premier déploiement à l'étape 12
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
- [ ] Caddy : masquer aussi `Cf-Connecting-Ipv6` et `True-Client-Ip` dans les journaux, vérifier
      `ip_mask` sur un `X-Forwarded-For` à plusieurs IP
- [ ] Docker publie les ports par ses propres règles iptables, avant `ufw` (seul `caddy` publie
      80 et 443 aujourd'hui) : restreindre à Cloudflare par `DOCKER-USER`, ou par `remote_ip` /
      Authenticated Origin Pulls dans Caddy
- [ ] Cloudflare : désactiver Rocket Loader et l'injection Web Analytics (bloqués par la CSP) ;
      pas de HSTS preload en V1 ; créer l'enregistrement DNS `www`
- [ ] Resend : vérifier le domaine `binovya.com`, puis renseigner `NUXT_MAIL_FROM`
- [ ] Supabase de production dans l'organisation du client : check-list de `technical.md`,
      migrations par `supabase db push`
- [ ] Compte admin de production SANS mot de passe, `app_metadata.role = 'admin'`, adresse
      dédiée non publiée (la requête de contrôle de `technical.md` ne doit rien renvoyer)
- [ ] RLS automatique (event trigger `ensure_rls`) en production : décider (option ou migration)
- [ ] Plan Supabase Pro (25 $/mois) pour les sauvegardes automatiques : à convenir avec le
      client (remplace les scripts de sauvegarde maison)
- [ ] Variables de production dans le `.env` du VPS : `NUXT_SITE_URL`, `NUXT_PUBLIC_SITE_URL` et
      `NUXT_PUBLIC_I18N_BASE_URL` à `https://binovya.com` (même origine, sinon le plugin
      `productionConfigCheck` refuse de démarrer), `NUXT_ADDRESS_TOKEN_SECRET`, clés Stripe LIVE
      et endpoint webhook du Dashboard
      (`checkout.session.completed`, `checkout.session.expired`), `NUXT_MAIL_FROM`,
      `NUXT_CONTACT_EMAIL_TO`, clés Supabase. `NUXT_MAIL_TRANSPORT` absent. Copie dans un
      gestionnaire de mots de passe
- [ ] Passage sur un vrai iPhone et avec un vrai lecteur d'écran
- [ ] Réglages GitHub manuels (détail dans `specs/technical.md`, « CI/CD ») : environnement
      `production` limité à `main` avec les 5 secrets (`SSH_HOST`, `SSH_USER`, `DEPLOY_PATH`,
      `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`, aucun au niveau du dépôt) ; paquet GHCR `binovya`
      privé, accès Actions limité au dépôt ; rulesets sur `main` et `dev` (pas de force-push ni
      de suppression, contrôle `check` requis) ; Actions en « Read repository contents », création
      et approbation de PR par Actions décochées, approbation pour les contributeurs extérieurs ;
      alertes et mises à jour de sécurité Dependabot, secret scanning avec push protection, 2FA
- [ ] VPS : utilisateur de déploiement dédié, clé restreinte dans `authorized_keys` (`restrict`,
      éventuellement `command=`) ; `docker login ghcr.io` avec un jeton `read:packages` en
      lecture seule, stocké pour cet utilisateur seul ; Docker Compose 2.17 ou plus
      (`--wait-timeout`) ; purge des anciennes images (environ 300 Mo chacune)
- [ ] Premier déploiement : vérifier que `caddy validate` journalise « Valid configuration » et
      que `.incoming/` et `.previous/` apparaissent dans `$DEPLOY_PATH`
- [ ] Poser la variable de dépôt `DEPLOY_ENABLED=true` en dernier, quand le VPS est prêt
- [ ] Contrôle de disponibilité externe gratuit

### 13. Légal

- [ ] Mentions légales (hébergeur VPS, Supabase ; LCEN : téléphone de l'éditeur, SIRET/RCS, nom
      et adresse de l'hébergeur à la place de « sur demande »)
- [ ] CGV : annulation, report, remboursement
- [ ] Politique de confidentialité : données client, photos, durées de conservation (la date de
      mise à jour est dans `app/constants/legal.ts`, la durée de conservation des réservations
      manque)
- [ ] Politique de confidentialité : Cloudflare comme sous-traitant (société américaine,
      déchiffre le trafic), avec son DPA
- [ ] Politique de confidentialité : journaux d'accès Caddy (IP tronquée, User-Agent, URL),
      rotation 10 Mo × 5 fichiers par service : durée de conservation à indiquer (bornée par la
      taille, pas par le temps)
- [ ] Décider du sort des réservations abandonnées et de leurs comptes (purge ou anonymisation)
- [ ] Décider de la durée de conservation des photos avant/après (RGPD), à citer dans la
      politique de confidentialité et à appliquer au bucket `intervention-photos`
- [ ] Masquer les formules trimestrielle et annuelle en V1 (devis uniquement)

## V2 (après le lancement)

- CSP avec nonce par requête et `'strict-dynamic'` (retire `script-src 'unsafe-inline'`, la CSP
  passe de Caddy à Nitro) ; contrôle de présence au démarrage de `NUXT_SUPABASE_SECRET_KEY`,
  `NUXT_STRIPE_WEBHOOK_SECRET` et `NUXT_ADDRESS_TOKEN_SECRET`

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
