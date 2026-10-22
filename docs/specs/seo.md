# SEO

> Statut : audit du 2026-10-17 (29 constats), recontrôlé le 2026-10-20. Chore `chore/seo` livré le
> 2026-10-22. Il reste les constats qui attendent le client (voir « Constats ouverts »).
> Fonctionnement du code : [technical.md](./technical.md), section « SEO ».

## Objectif

Rendre le site public indexable et lisible pour les moteurs (France et Luxembourg), garder les
pages privées hors index et poser les données structurées locales.

## État actuel

- Six pages publiques (`/`, `/contact`, `/booking`, `/quote`, `/legal`, `/privacy`), chacune avec
  `usePageSeo` (titre, description, Open Graph traduits) et un seul h1.
- `<html lang="fr|en">`, canonical sans query, `hreflang` fr / en / `x-default`, `og:url`,
  `og:locale` (`fr_FR`, `en_GB`), `og:site_name`, `twitter:card=summary`. Rien de cela sur les
  pages privées.
- Pages privées (`/login`, `/account/**`, `/pro/**`, `/payment-link`, variantes `/en`) : `noindex,
nofollow` dans la page et en en-tête `X-Robots-Tag` (`routeRules`). Les deux pages `confirm`
  ajoutent `referrer: 'no-referrer'` (le jeton du lien magique est dans l'URL).
- `server/routes/sitemap.xml.ts` (12 URL avec alternates) et `server/routes/robots.txt.ts`
  (`Disallow: /api/`, `Sitemap:`), en cache 1 h. Routes maison, pas de `@nuxtjs/sitemap` ni
  `@nuxtjs/robots`.
- Sélecteur de langue en liens crawlables dans la navbar et le menu mobile ; liens internes et
  footer localisés ; pages orphelines supprimées.
- Images en webp avec dimensions et `sizes` ; hero en `fetchpriority="high"`.
- Domaine tranché : `binovya.com` (site) ; l'e-mail reste `contact@binovya.fr`.
- Aucune donnée structurée (JSON-LD), aucune image Open Graph.

## Questions pour le client

Réponses reçues : domaine `binovya.com`, e-mail `contact@binovya.fr`.

En attente :

- Adresse officielle (#11) : Amnéville (57360), affichée sur `/contact` et `/legal`, ou Uckange
  (57270), le dépôt (texte de zone de `booking.ts`) ? Le site doit n'en afficher qu'une.
- Téléphone (#12) : le numéro factice est retiré de `/legal`, le vrai numéro est attendu.
- Villes à cibler (#16), pour réécrire titres, descriptions et h1.
- Image Open Graph 1200×630 (#17).
- Engagements affichés (#18) : « devis gratuit », « véhicule 100 % électrique », « fabriqué en
  France », entre autres, sont-ils réels ? Ils sont retirés des meta mais restent dans des textes
  visibles.
- Mentions légales (obligation LCEN) incomplètes : téléphone de l'éditeur, SIRET et RCS, nom et
  adresse de l'hébergeur (`legal.hosting.content` dit « sur demande »).
- À fournir aussi :
  - les formules et les prix réellement vendus, les horaires ;
  - les coordonnées GPS du dépôt (pour le `GeoCircle`) ;
  - les profils sociaux et la fiche Google Business Profile ;
  - l'existence de CGV.

## Constats ouverts

Numéros de l'audit. Tous attendent une réponse du client.

- #10 Aucun JSON-LD. Créer `useLocalBusinessSchema` : `LocalBusiness` et `Service`. Les anciens
  `FAQPage` et `BreadcrumbList` n'ont plus d'objet (pages supprimées). Données identiques au
  contenu visible, téléphone omis tant qu'il n'est pas réel.
- #11 NAP incohérent : Amnéville sur `/contact` et `/legal`, Uckange pour le dépôt. Source unique
  `contact.info.*` une fois le client répondu. Le téléphone factice est retiré (#12, partiel).
- #12 Vrai numéro de téléphone à afficher (et à reprendre dans le NAP et le JSON-LD).
- #16 Aucun terme local (Uckange, Moselle, Luxembourg, Thionville, Metz) dans titres,
  descriptions et h1 ; titres de 13 à 41 caractères au lieu de 50-60. À réécrire après les
  réponses du client.
- #17 Pas d'image OG 1200×630, `twitter:image` absent. Fournir l'image, l'ajouter dans
  `usePageSeo` et passer `twitter:card` à `summary_large_image`.
- #18 Promesses non confirmées : retirées des meta (« Réponse rapide garantie », « 100 %
  respectueux de l'environnement », « abris biodéchets »), mais d'autres restent dans les textes
  visibles (« véhicule 100 % électrique », « fabriqué en France »…). Retirer ou confirmer.

## Corrigé ou abandonné

- #1 corrigé : `/login` est en `noindex, nofollow`.
- #2 corrigé : `routeRules` avec `X-Robots-Tag` sur `PRIVATE_PAGE_ROUTE_PATTERNS`.
- #3 corrigé : `server/routes/robots.txt.ts` (`Disallow: /api/`, `Sitemap:`). Les pages privées ne
  sont pas en `Disallow` : le robot doit voir le `noindex`.
- #4 corrigé par des routes maison (`sitemap.xml`, `robots.txt`) et `NUXT_PUBLIC_SITE_URL`, pas par
  `@nuxtjs/sitemap`.
- #5 corrigé : `useLocaleHead` dans `app/app.vue` (`lang`, canonical, hreflang avec `x-default`,
  `og:url`, `og:locale`) et `usePageSeo`. `ogImage` reste ouvert, voir #17.
- #6 corrigé : `language: 'fr'` et `'en'`.
- #7 sans objet : `/formulas` supprimée.
- #8 corrigé : `LanguageSwitcher.vue` en liens `switchLocalePath`.
- #9 sans objet : `/about`, `/faq` et `/solutions/*` supprimées.
- #13 sans objet : les pages concernées sont supprimées.
- #14 corrigé en partie : les pages supprimées emportent la plupart des images absentes, les
  images absentes encore référencées ont été retirées.
- #15 corrigé : canonical sans query.
- #19 sans objet : `/faq` supprimée.
- #20 corrigé : `faq` et `about` supprimées ; `privacy` utilise `rt` après `tm`.
- #21 corrigé : webp, `width` / `height` / `sizes`, `alt=""` sur les images décoratives, hero en
  `fetchpriority="high"`.
- #22 sans objet : `SolutionHero` supprimé avec les pages solutions.
- #23 corrigé : logo, footer et liens des pages localisés.
- #24 corrigé, sauf le NAP (#11) : e-mail depuis `contact.info.email.address`, `h2` du footer,
  liens `binovya.com` et « CGV » retirés.
- #25 sans objet : `/formulas` supprimée.
- #26 abandonné : `display: 'swap'` des polices n'est pas un défaut, rien à faire.
- #27 intégré à #5 (`x-default`).
- #28 corrigé : `LEGAL_NOTICE_UPDATED_ON` et `PRIVACY_POLICY_UPDATED_ON` dans
  `app/constants/legal.ts`, à mettre à jour quand le texte change.
- #29 intégré à #9.

## Hors périmètre

À traiter ailleurs que dans `chore/seo` :

- Contraste du thème `.dark` (`--secondary #0b7fb8`, environ 4,4:1) et de
  `app/components/ui/button/index.ts:18` (`hover:text-secondary`, environ 2,2:1) : inactifs, le
  site n'active jamais `dark` (voir `technical.md`, points ouverts).
- `@unhead/vue` importé dans `app/app.vue` sans être déclaré dans `package.json`.
- Clés de `usePageSeo` typées `string`.
- Configuration : garder `NUXT_SITE_URL`, `NUXT_PUBLIC_SITE_URL` et `NUXT_PUBLIC_I18N_BASE_URL`
  sur la même origine (le plugin `server/plugins/productionConfigCheck.ts` refuse de démarrer sinon, hors dev).
  `/contact/` (slash final) répond 200 sans redirection, le canonical est sans slash (faible).
