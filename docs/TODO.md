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
- [x] 8. Chore : migrer les boutons natifs de la réservation, du devis, de la page contact
     (hors envoi, déjà fait) et de `AccountDeletionRequest.vue` vers `AppButton` (variante
     `destructiveSolid` ; restent natifs : date suggérée, « Réessayer » de l'adresse, pastille
     de retrait d'une photo du devis, faute de variante, voir `specs/technical.md`)
- [ ] 8. Chore : WebKit perd la session Supabase sur `http://localhost` (cookie `Secure` par
     défaut dans `@nuxtjs/supabase`, aucun `cookieOptions` dans `nuxt.config.ts`) : l'espace Pro
     est inutilisable dans Safari de bureau en local. Poser `cookieOptions.secure` seulement en
     production, puis rétablir le projet Playwright WebKit (étape 10)
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
      `LanguageSwitcherMobile`). Le typecheck doit aussi couvrir `tests/` (aucun tsconfig ne
      l'inclut aujourd'hui ; erreurs connues, par exemple `tests/support/pro-fixtures.ts:65`,
      `tests/unit/pro/pro-intervention.test.ts:19`,
      `tests/integration/booking/booking-create.test.ts:50` et
      `tests/integration/pro/pro-reschedule.test.ts`)
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
- [ ] Variables de production dans le `.env` du VPS : `NUXT_SITE_URL`, `NUXT_PUBLIC_SITE_URL` et
      `NUXT_PUBLIC_I18N_BASE_URL` à `https://binovya.com` (même origine, sinon le plugin
      `siteUrlCheck` journalise au démarrage), `NUXT_ADDRESS_TOKEN_SECRET`, clés Stripe LIVE et endpoint webhook du Dashboard
      (`checkout.session.completed`, `checkout.session.expired`), `NUXT_MAIL_FROM`,
      `NUXT_CONTACT_EMAIL_TO`, clés Supabase. `NUXT_MAIL_TRANSPORT` absent. Copie dans un
      gestionnaire de mots de passe
- [ ] Passage sur un vrai iPhone et avec un vrai lecteur d'écran
- [ ] Premier déploiement
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
