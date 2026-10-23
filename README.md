# BINOVYA

Site de réservation en ligne d'un service de nettoyage de bacs à déchets, en France et au
Luxembourg. Le client saisit son adresse, choisit sa formule et un jour d'intervention, paie par
carte (Stripe Checkout), puis suit sa réservation et retrouve les photos avant/après dans son espace
client. L'équipe gère le planning et les interventions dans l'espace BINOVYA Pro.

- Site : `binovya.com`
- Contact : `contact@binovya.fr`
- Zone desservie : autour du dépôt d'Uckange (57270), une petite partie du Luxembourg incluse

## Stack

- Nuxt 4 (SSR, Nitro `node-server`), Vue 3, TypeScript strict
- Tailwind CSS v4 (`@tailwindcss/vite`), shadcn-nuxt (reka-ui), motion-v, lucide-vue-next
- `@nuxtjs/i18n` (français par défaut, anglais), `@nuxt/image`, `@nuxt/fonts`
- Supabase (Postgres, Auth par lien magique, Storage, `pg_cron`) via `@nuxtjs/supabase`
- Stripe (Checkout et webhook), Resend (mails), `juice` (CSS en ligne dans les mails)
- Formulaires : vee-validate et Zod
- Tests : Vitest (unitaires et intégration), Playwright (e2e)
- Qualité : ESLint (dont `vuejs-accessibility`), Prettier, `vue-tsc`
- Hébergement : Docker Compose (Caddy et Nuxt) sur un VPS européen, derrière Cloudflare

## Prérequis

- [Bun](https://bun.sh/) (gestionnaire de paquets, version 1.2.14 dans le `Dockerfile`)
- Node.js 24.22.1 (version du `Dockerfile` et de la CI)
- Un projet Supabase, avec les migrations de `supabase/migrations/` appliquées dans l'ordre des
  horodatages
- [Stripe CLI](https://stripe.com/docs/stripe-cli) et un compte Stripe en mode test, pour le
  paiement en local et pour les tests d'intégration et e2e
- Un compte Resend pour l'envoi réel de mails (inutile en local : voir `NUXT_MAIL_TRANSPORT`)

## Installation

```bash
bun install
cp .env.example .env.local
```

Renseigner `.env.local` (jamais commité). Les variables par groupe, détail dans
[`docs/specs/technical.md`](docs/specs/technical.md) :

- Supabase : `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY`, `NUXT_SUPABASE_SECRET_KEY`
- Mail : `NUXT_RESEND_API_KEY`, `NUXT_CONTACT_EMAIL_TO`, `NUXT_MAIL_FROM`, `NUXT_MAIL_TRANSPORT`,
  `NUXT_MAIL_OUTBOX_DIR`, `NUXT_MAIL_REDIRECT_TO`
- Stripe : `NUXT_STRIPE_SECRET_KEY` (clé `sk_test_` en local), `NUXT_STRIPE_WEBHOOK_SECRET`
- URL du site : `NUXT_SITE_URL`, `NUXT_PUBLIC_SITE_URL`, `NUXT_PUBLIC_I18N_BASE_URL` (même origine)
- Signature des adresses : `NUXT_ADDRESS_TOKEN_SECRET` (32 caractères minimum)
- Déploiement (`deploy/.env` du serveur, pas utilisées en développement) : `IMAGE_TAG`,
  `SITE_DOMAIN`, `CADDY_HTTP_PORT`, `CADDY_HTTPS_PORT`, `HSTS_MAX_AGE`

Pour recevoir les webhooks Stripe en local :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Le secret `whsec_…` affiché va dans `NUXT_STRIPE_WEBHOOK_SECRET`.

## Commandes

```bash
bun run dev               # serveur de développement, http://localhost:3000 (lit .env.local)
bun run build             # build de production
bun run preview           # aperçu du build (exige des URL de site en https cohérentes)
bun run lint              # ESLint
bun run lint:fix          # ESLint avec corrections
bun run format            # Prettier, écrit
bun run format:check      # Prettier, vérifie seulement
bun run typecheck         # vue-tsc : app, serveur et tests
```

Tests (les niveaux intégration et e2e démarrent leur propre serveur de test sur le port 3001 et leur
propre `stripe listen` ; `bun run dev` peut rester lancé, tout autre `stripe listen` doit être
arrêté) :

```bash
bun run test:unit         # Vitest, logique pure, sans serveur
bun run test:integration  # Vitest, routes serveur, webhooks Stripe signés, un test par gabarit de mail
bun run test:e2e          # Playwright, vrai Chromium et WebKit, vrai Stripe Checkout en mode test
bun run test              # les trois, dans cet ordre
bun run test:server       # garde le serveur de test et son stripe listen chauds, les commandes ci-dessus le réutilisent
```

Les tests n'utilisent que des clés Stripe de test, n'envoient aucun vrai mail (les mails sont écrits
dans `.mail-outbox/test-run/`) et ne suppriment que leurs propres lignes (`e2e+…@binovya.test`).

## Structure

```
app/
├── pages/            # routes (kebab-case)
├── layouts/          # layouts, dont le layout `pro`
├── components/       # composants (PascalCase), `ui/` = shadcn-nuxt
├── composables/      # logique réutilisable (`useXxx.ts`)
├── utils/            # fonctions partagées, validation Zod
├── constants/        # constantes (motion, formulaires, SEO, compte…)
├── templates/email/  # gabarits des mails
├── types/            # types complexes réutilisables
└── assets/css/       # Tailwind v4 et jetons du thème
i18n/locales/         # traductions fr et en
server/               # api/, utils/, plugins/, routes/ (sitemap, robots), tasks/
supabase/migrations/  # schéma, RLS, fonctions SQL
tests/                # unit/, integration/, e2e/ puis par domaine, support/
scripts/              # lanceur de tests et serveur de test
deploy/               # docker-compose.yml et Caddyfile du VPS
docs/                 # specs, TODO, conventions, maquettes, changelogs
```

## Pages et espaces

| Zone                     | Routes                                                                          |
| ------------------------ | ------------------------------------------------------------------------------- |
| Pages publiques          | `/`, `/booking`, `/quote`, `/contact`, `/legal`, `/privacy` (aussi sous `/en`)  |
| Réservation              | `/booking` : adresse, formule, date, coordonnées, paiement Stripe Checkout      |
| Devis                    | `/quote` : bacs, PAV, mobilier urbain, signalétique, photos jointes             |
| Espace client            | `/login`, `/account/confirm`, `/account`, `/account/bookings/[id]`              |
| BINOVYA Pro (admin)      | `/pro/login`, `/pro/confirm`, `/pro`, `/pro/interventions`, `/pro/availability` |
| Lien de paiement (privé) | `/payment-link`                                                                 |

Les espaces client et Pro sont en `noindex`. Les connexions se font par lien magique envoyé par
notre serveur (Supabase n'envoie aucun mail d'authentification). Règles métier :
[`docs/specs/booking-system.md`](docs/specs/booking-system.md).

## Tests

Pyramide : beaucoup de tests unitaires, quelques tests d'intégration, peu de tests e2e. Unitaires
et intégration sont faits pour tourner en CI ; l'e2e passe par la vraie page Stripe et reste local,
avant chaque fusion dans `dev` et `main`. Détail et chiffres datés dans
[`docs/specs/technical.md`](docs/specs/technical.md) (section « Tests »).

## Docker et déploiement

- `Dockerfile` en trois étapes (build sur Node 24.22.1 avec Bun, image finale `.output` seule,
  utilisateur `node`). Aucune valeur `NUXT_*` n'est figée dans l'image : tout se règle à l'exécution.
- `deploy/docker-compose.yml` et `deploy/Caddyfile` : Caddy (HTTPS, seul service exposé) devant
  Nuxt. Le VPS ne construit jamais d'image : il tire `ghcr.io/mehdidiasgomes/binovya:${IMAGE_TAG}`.
- Le détail (Cloudflare, CSP, journaux, variables de production, rollback) est dans
  [`docs/specs/technical.md`](docs/specs/technical.md), sections « Hébergement » et « Image Docker
  et Compose ».

## CI/CD

Workflow `.github/workflows/ci.yml` :

- `check` : sur push vers `main` ou `dev` et sur pull request. Lint, formatage, typecheck, tests
  unitaires et build.
- `image` : sur push vers `main` ou `dev`, si `check` est vert. Image Docker `linux/amd64` poussée
  vers GHCR.
- `deploy` : sur `main` seulement, si `check` et `image` sont verts et si la variable de dépôt
  `DEPLOY_ENABLED` vaut `true`. Déploiement sur le VPS par SSH.

Les tests d'intégration et e2e restent en local avant chaque fusion.

## Contribuer

- Branches : `main` (production), `dev` (intégration), une branche par étape de `docs/TODO.md`
  (ex. `feat/booking-quote`) créée depuis `dev` et fusionnée dans `dev` avec `--no-ff`.
- Commits : [gitmoji](https://gitmoji.dev/), voir [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md).
- Code : fonctions fléchées, TypeScript explicite sans `any`, pas de commentaires, Tailwind
  seulement, textes via i18n, accessibilité obligatoire (WCAG AA). Les règles complètes sont dans
  `CLAUDE.md` et appliquées par ESLint et Prettier.
- Un hook de projet lance Prettier sur chaque fichier écrit.

## Documentation

- [`docs/TODO.md`](docs/TODO.md) : avancement, V1 et V2
- [`docs/specs/booking-system.md`](docs/specs/booking-system.md) : règles métier et parcours
- [`docs/specs/technical.md`](docs/specs/technical.md) : architecture, sécurité, Supabase, Stripe,
  mails, déploiement, tests
- [`docs/specs/seo.md`](docs/specs/seo.md) : audit et décisions SEO
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) : conventions de commit et de code
- `docs/changelogs/` : changelogs générés
