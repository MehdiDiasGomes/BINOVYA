# SEO

> Statut : audit du 2026-10-17 (29 constats), recontrôlé dans le code le 2026-10-20. Corrections à
> faire dans `chore/seo`, après la fusion de l'étape 8 (« Espace BINOVYA Pro ») dans `dev`.

## Objectif

Rendre le site public indexable et lisible pour les moteurs (France et Luxembourg), garder les
pages privées hors index et poser les données structurées locales.

## État actuel

- Chaque page publique a `useSeoMeta` (titre, description, bases Open Graph traduits) et un seul
  h1. Les clés `seo.*` sont identiques en FR et EN.
- Pages privées en `robots: 'noindex, nofollow'` dans `useSeoMeta` : `/login`, `/pro/**`,
  `/account/**`. Les deux pages `confirm` ajoutent `referrer: 'no-referrer'` (le jeton du lien
  magique est dans l'URL). Rien côté HTTP (ni `routeRules`, ni `X-Robots-Tag`).
- `public/robots.txt` : `User-Agent: *` et `Disallow:` vides. `nuxt.config.ts` n'a ni sitemap, ni
  module SEO, ni `siteUrl` public.

## Questions pour le client (à régler avant les corrections)

- Adresse officielle : Amnéville (57360), affichée sur `/contact` et `/legal`, ou Uckange
  (57270), le dépôt (texte de zone de `booking.ts`) ? Le site doit n'en afficher qu'une (#11).
- Téléphone : `/legal` affiche « 00 00 00 00 00 » (#12).
- Domaine : `binovya.fr` (l'adresse e-mail du footer) ou `binovya.com` (un lien du footer) ?
- Les engagements affichés sont-ils réels : « devis gratuit », « réponse rapide garantie »,
  « véhicule 100 % électrique », « fabriqué en France » ?
- À fournir aussi :
  - les formules et les prix réellement vendus, les horaires, les villes à cibler ;
  - les coordonnées GPS du dépôt (pour le `GeoCircle`) ;
  - une image Open Graph 1200×630 ;
  - les profils sociaux et la fiche Google Business Profile ;
  - l'existence de CGV.

## Constats ouverts

Numéros de l'audit. Gravité : haute, moyenne, basse.

### Haute

- #2 `nuxt.config.ts` : pas de filet HTTP pour les pages privées. Ajouter `routeRules` avec
  `X-Robots-Tag: noindex, nofollow` sur `/login`, `/account/**`, `/pro/**` et leurs variantes
  `/en/`.
- #3 `public/robots.txt` : statique, sans `Sitemap:`, `/api/` non interdit. Passer à
  `@nuxtjs/robots` (`disallow: ['/api/']`, sitemap) ou à `server/routes/robots.txt.ts`. Ne jamais
  mettre en `Disallow` une page qui repose sur `noindex` : le robot ne verrait pas la balise.
- #4 Pas de sitemap, et `runtimeConfig.siteUrl` est serveur seulement. Ajouter
  `runtimeConfig.public.siteUrl` (`NUXT_PUBLIC_SITE_URL`, même valeur que `NUXT_SITE_URL`, garder
  les deux), `site.url`, `i18n.baseUrl`, `@nuxtjs/sitemap` sans les routes privées.
- #5 `app/app.vue` : ni `canonical`, ni `hreflang` (avec `x-default` vers `/`), ni `lang` sur
  `html` (WCAG 3.1.1), ni `ogUrl`, `ogLocale`, `ogImage`. `useLocaleHead({ seo: true })` dans
  `app.vue` et un composable partagé `usePageSeo`. `redirectOn: 'root'` reste tel quel.
- #6 `nuxt.config.ts` : `language: 'en-US'` pour l'anglais. Passer à `en` ou `en-GB` (cible :
  Luxembourg et Moselle).
- #7 `/formulas` : les clés `formulas.*` n'existent pas dans `i18n/locales/`, la page affiche
  « formulas.sectionTitle » en h1, et la description `seo.formulas` promet des offres que la
  V1 masque (trimestrielle, annuelle). Créer les clés FR et EN sur les offres réelles, ou mettre
  la page en `noindex`. Le lien « CGV » du footer pointe dessus (#24).
- #8 Aucun `LanguageSwitcher` n'est rendu (ni navbar, ni footer), et il utilise `setLocale`, que
  les robots ne suivent pas. Le placer dans la navbar avec `NuxtLink :to="switchLocalePath(code)"`.
- #9 Pages orphelines : `/about` et `/faq` ne sont liées de nulle part, `/solutions/*` seulement
  depuis `/about`. Les ajouter à la navbar ou au footer et à l'accueil (couvre l'ancre `/#services`
  seule).
- #10 Aucun JSON-LD. Créer `useLocalBusinessSchema` : `LocalBusiness`, `Service`, `FAQPage`
  (`/faq`, depuis `tm('faq.questions')`), `BreadcrumbList` (`/solutions/*`). Données identiques au
  contenu visible, téléphone omis tant qu'il n'est pas réel.
- #11 NAP incohérent : Amnéville sur `/contact` et `/legal`, Uckange pour le dépôt, rien dans le
  footer. Source unique `contact.info.*` une fois le client répondu.
- #12 `/legal` affiche le téléphone factice `contact.info.phone.display`. Le retirer tant qu'il
  n'est pas fourni.
- #13 Clés i18n absentes rendues brutes en `alt` et `aria-label` : `*.hero.backgroundImageAlt`
  (3 pages solutions), `about.hero.imageAlt`, `about.expertise.services.*.ariaLabel`. Ajouter les
  clés FR et EN.
- #14 Images référencées mais absentes de `public/images/` (404) : `about/hero-bg.webp`,
  `rolling_bins/hero-bg.webp`, `columns/hero-bg.webp`, `bio_waste_shelters/hero-bg.webp`,
  `illustrations/faq.svg`, `rolling_bins/icons/*.webp`, `clients/task_0{1,2,3}.webp`. Ajouter les
  fichiers ou changer les références.

### Moyenne

- #15 `/booking?service=…` crée des doublons : `canonical` sans paramètre (avec #5).
- #16 Aucun terme local (Uckange, Moselle, Luxembourg, Thionville, Metz) dans titres,
  descriptions et h1 ; titres de 13 à 41 caractères au lieu de 50-60 ; titre de la FAQ identique
  en FR et EN. À réécrire après les réponses du client.
- #17 Pas d'image OG 1200×630, `twitter:image` absent. Fournir l'image, l'ajouter dans
  `usePageSeo`.
- #18 Promesses non confirmées dans les meta (« Devis gratuit » dans `seo.solutions.rollingBins`,
  « Réponse rapide garantie » dans `seo.contact`). Retirer ou confirmer avec le client.
- #19 `/faq` : `AccordionContent` n'est pas forcé dans le DOM, les réponses sont probablement
  absentes du HTML serveur. `force-mount` ou `<details>`.
- #20 `faq`, `about`, `privacy` : `$tm` sans `$rt`. Vérifier le HTML du build de production.
- #21 Images : `NuxtImg` sans `height`, `sizes`, `format` ; hero sans `preload` ;
  `alt="FAQ illustration"` (`faq.vue:55`) non traduit ; `alt` redondant dans `ServicesSection` ;
  noms de fichiers peu descriptifs.
- #22 `SolutionHero` : l'image de fond a `alt` et `aria-hidden` à la fois, sans `sizes`. La
  déclarer décorative (`alt=""`, donc retirer la clé `backgroundImageAlt` de #13) ou
  informative.
- #23 Liens internes non localisés : logo de la navbar (`to="/"`), `cta-link="/contact"` des 3
  pages solutions, `CtaFreeDemo`, bouton de `faq.vue`. `localePath` ou `NuxtLinkLocale`.
- #24 `app/layouts/footer.vue` : `mailto:contact@binovya.fr` et lien `https://binovya.com` en
  dur, « CGV » pointe vers `/formulas`, `h3` sans `h2`, pas de NAP. Valeurs depuis la config et
  `contact.info.*`, vrai lien CGV (ou retrait) selon le client.

### Basse

- #25 Révélation au scroll (`opacity: 0`) sur le h1 et le premier bloc de `/formulas` : ne pas
  masquer le contenu au-dessus de la ligne de flottaison.
- #28 `/legal` et `/privacy` : « Dernière mise à jour » écrite en dur (`04/01/2025`). Piloter par
  une donnée.

## Corrigé ou abandonné

- #1 corrigé : `/login` est en `noindex, nofollow` (`app/pages/login.vue`).
- #26 abandonné : `display: 'swap'` des polices n'est pas un défaut, rien à faire.
- #27 intégré à #5 (`x-default`).
- #29 intégré à #9.

## Hors périmètre

À traiter ailleurs que dans `chore/seo` :

- Accessibilité : `aria-label` qui masque le texte visible (`about.vue:110`, `services.ts`),
  libellés de `ButtonCta` qui ne reprennent pas le nom visible, `h3` du footer sans `h2`,
  navbar mobile en `<a href>` avec `click.prevent`.
- Qualité du code : `footer.vue` non conforme à Prettier et ESLint (commentaires HTML, textes en
  dur), code commenté dans `app/constants/formulas.ts`.
- Contenu et clés i18n : clés inutilisées (`footer.social.*`, `nav.particuliers`,
  `services.newBadge`), `solutions.offerings.*` référencées mais absentes,
  `rollingBins.hero.stats` (« tout le territoire français ») en contradiction avec la zone de
  20 km.
- `CtaFreeDemo` : le paramètre `?type=demo` n'est jamais lu.
- Configuration : garder `NUXT_SITE_URL` et `NUXT_PUBLIC_SITE_URL` synchronisés (voir #4).
