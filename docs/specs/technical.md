# Spec technique

> Statut : en cours de définition. Dernière mise à jour : 2026-10-14.
> Spec fonctionnelle associée : [booking-system.md](./booking-system.md).

## Vue d'ensemble

```
                         Internet
                            │
                     ┌──────▼──────┐
                     │    Caddy    │  HTTPS automatique, seul service exposé (80/443)
                     └──────┬──────┘
                            │ réseau Docker public
                     ┌──────▼──────┐
                     │ Nuxt (Nitro)│  front + API serveur
                     └──┬───────┬──┘
        réseau interne  │       │
                ┌───────▼──┐ ┌──▼───────┐
                │  VROOM   │─▶  OSRM    │  tournées / distances routières
                └──────────┘ └──────────┘

   Prometheus · Loki · Alloy · Grafana · node-exporter · cAdvisor   (réseau interne)

   Services externes : Supabase (UE) · Stripe · Resend · Brevo · Géoplateforme IGN · geoportail.lu
```

## Stack

| Couche | Choix |
| --- | --- |
| Front et API | Nuxt 4 (SSR, preset Nitro `node-server`), Tailwind CSS v4, shadcn-nuxt, i18n FR/EN |
| Gestionnaire de paquets | Bun |
| Base de données, auth, fichiers | Supabase hébergé, région UE (Postgres, Auth par lien magique, Storage, `pg_cron`) |
| Paiement | Stripe Checkout + webhook |
| Mail | Resend, domaine `binovya.com` vérifié |
| SMS | Brevo |
| Distances routières | OSRM |
| Optimisation des tournées | VROOM |
| Hébergement | VPS européen, Docker Compose |

## Cartographie et tournées

- **Zone couverte par les cartes** : Lorraine + Luxembourg. Extraits OpenStreetMap Geofabrik
  (`europe/france/lorraine`, `europe/luxembourg`) fusionnés avec `osmium merge`.
- **OSRM** : profil voiture (`car.lua`), algorithme MLD. Le prétraitement des cartes se fait dans un job
  CI ou en local, puis le résultat est envoyé sur le VPS. Mise à jour mensuelle des cartes.
- **VROOM** : interroge OSRM pour la matrice des temps de trajet et ordonne les interventions
  du jour, départ et retour au dépôt. Déclenché depuis l'espace admin.
- **Zone desservie** : distance à vol d'oiseau autour du dépôt, à la demande du client.
- **Secteurs du jour** : vol d'oiseau, calculé en SQL dans `get_availability`.
- OSRM et VROOM ne sont jamais exposés à Internet : seul le serveur Nitro les appelle.

## Géocodage

| Pays | Service |
| --- | --- |
| France | Géoplateforme IGN (Base Adresse Nationale), `data.geopf.fr/geocodage/search`, biaisé vers Uckange |
| Luxembourg | geoportail.lu, `apiv4.geoportail.lu/fulltextsearch`, couche `Adresse`, limité au sud du pays (conditions d'usage à vérifier) |

- Le client choisit le pays à côté du champ adresse. Un seul endpoint serveur
  (`/api/address/search?q=…&country=FR|LU`) interroge le service de ce pays. Le front ne
  connaît pas les fournisseurs.
- Le téléphone a aussi un sélecteur de pays (+33, +352) : le client saisit son numéro national,
  le serveur reçoit et enregistre le format international (`+33612345678`).
- Avec 20 km à vol d'oiseau autour d'Uckange, seule une petite partie du Luxembourg est
  desservie (Rumelange, sud de Dudelange).
- La validation accepte les deux formats : code postal (5 chiffres FR, 4 chiffres LU) et
  téléphone (+33, +352).

## Hébergement

**Critères du VPS** : datacenter dans l'UE, au moins 8 Go de RAM (OSRM + supervision), 4 vCPU,
80 Go de SSD, snapshots disponibles. Candidats à comparer : Hetzner, OVHcloud, Scaleway.

**Docker Compose** :

| Service | Rôle | Exposé |
| --- | --- | --- |
| `caddy` | Reverse proxy, certificats HTTPS | Oui (80/443) |
| `nuxt` | Application | Via Caddy |
| `osrm` | Distances routières | Non |
| `vroom` | Optimisation des tournées | Non |
| `prometheus` | Métriques | Non |
| `loki` | Logs | Non |
| `alloy` | Collecte des logs Docker vers Loki | Non |
| `grafana` | Tableaux de bord, alertes | Non, accès par tunnel SSH |
| `node-exporter` | Métriques du serveur | Non |
| `cadvisor` | Métriques des conteneurs | Non |

**Sécurité du serveur** : connexion SSH par clé uniquement, root désactivé, pare-feu `ufw`
(22, 80, 443), `fail2ban`, mises à jour de sécurité automatiques (`unattended-upgrades`).

## CI/CD

**CI** (GitHub Actions, à chaque push et pull request) :

1. Lint, formatage, typecheck
2. Tests
3. Build Nuxt
4. Dernier job, seulement si tout est vert : build de l'image Docker et push vers GHCR
   (`ghcr.io/mehdidiasgomes/binovya`, nom obligatoirement en minuscules).

**Tags de l'image** (générés par `docker/metadata-action`) :

| Tag | Quand | Usage |
| --- | --- | --- |
| SHA du commit (ex. `1241c7d`) | Chaque build | Immuable, seul tag utilisé pour déployer |
| `latest` | Sur `main` uniquement | Repère pour un humain, jamais utilisé pour déployer |

**CD** (après la CI sur `main`) : connexion SSH au VPS, écriture du SHA dans le `.env`
(`IMAGE_TAG=<sha>`), puis `docker compose pull` et `docker compose up -d`. Le
`docker-compose.yml` référence l'image par `ghcr.io/mehdidiasgomes/binovya:${IMAGE_TAG}`.

**Rollback** : remettre le SHA précédent dans `IMAGE_TAG` et relancer
`docker compose up -d`.

**Secrets** : stockés dans GitHub Actions et dans un fichier `.env` sur le VPS, jamais dans
l'image Docker.

## Supervision

- **Métriques** : Prometheus collecte node-exporter, cAdvisor et les métriques de Nitro.
- **Logs** : Nitro écrit des logs JSON, Alloy les envoie à Loki.
- **Alertes** : Grafana, envoyées par mail (serveur saturé, taux d'erreur, service arrêté).
- **Disponibilité** : contrôle externe gratuit, car une supervision hébergée sur le VPS ne peut
  pas signaler la panne du VPS.
- **Pas de Sentry** : les erreurs survenant dans le navigateur des clients ne sont pas
  collectées.

## Sauvegardes

Prévues en V2, rien n'est mis en place en V1 pour éviter de complexifier le lancement.

Pistes pour la V2 : `pg_dump` de la base et copie du bucket photos vers un stockage objet
compatible S3 en région UE, chez un fournisseur différent de celui du VPS.

En V1, le VPS se reconstruit à l'identique (code et `docker-compose.yml` dans Git, images
dans GHCR, cartes OSRM régénérables). Seul le fichier `.env` est à conserver à part, dans un
gestionnaire de mots de passe.

## Tâches planifiées

| Tâche | Outil |
| --- | --- |
| Libérer les réservations non payées (`expire_stale_bookings`) | `pg_cron` |
| SMS de la veille et du jour J | `pg_cron` |
| Mise à jour des cartes OSRM | GitHub Action mensuelle |

## Variables d'environnement

| Variable | Usage |
| --- | --- |
| `NUXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NUXT_PUBLIC_SUPABASE_KEY` | Clé publique Supabase |
| `NUXT_SUPABASE_SERVICE_KEY` | Clé secrète Supabase, serveur uniquement |
| `RESEND_API_KEY` | Envoi des mails |
| `CONTACT_EMAIL_TO` | Destinataire du formulaire de contact |
| `STRIPE_SECRET_KEY` | Paiement |
| `STRIPE_WEBHOOK_SECRET` | Vérification des webhooks Stripe |
| `BREVO_API_KEY` | Envoi des SMS |
| `OSRM_URL` | URL interne d'OSRM |
| `VROOM_URL` | URL interne de VROOM |

## Légal

- L'hébergeur du VPS et Supabase figurent dans les mentions légales.
- Toutes les données restent dans l'UE.
- Un accord de traitement des données (DPA) est signé avec chaque fournisseur.

## Points ouverts

- Choix du VPS et du fournisseur.
- Conditions d'usage de l'API geoportail.lu.
- Environnement de préproduction (branche `dev`) : oui ou non ?
- Adresse d'expédition du formulaire de contact : encore `contact@dg-zenith.com`, à passer
  sur `binovya.com`.

## Coûts estimés

> Prix relevés le 2026-10-14. Les hébergeurs ont augmenté leurs tarifs en 2026 (hausse du
> prix de la RAM), à revérifier sur le site officiel au moment de commander.

### Dimensionnement du VPS

Estimation de la consommation de chaque service en fonctionnement normal :

| Service | RAM | Disque |
| --- | --- | --- |
| Système + Docker | 500 Mo | 8 Go |
| Nuxt (Nitro) | 300 à 500 Mo | 1 Go (image) |
| OSRM (Lorraine + Luxembourg, MLD) | 1 Go | 3 Go |
| VROOM | 100 Mo | 200 Mo |
| Caddy | 50 Mo | 100 Mo |
| Prometheus (rétention 15 jours) | 300 à 600 Mo | 5 Go |
| Loki (rétention 30 jours) | 300 à 500 Mo | 5 Go |
| Grafana | 150 à 250 Mo | 500 Mo |
| Alloy | 150 à 300 Mo | 200 Mo |
| cAdvisor + node-exporter | 150 à 250 Mo | 100 Mo |
| **Total** | **3 à 4 Go** | **≈ 25 Go** |

**Besoin retenu** : 8 Go de RAM et au moins 75 Go de disque, soit une marge d'environ 2× sur
la RAM et 3× sur le disque. Le prétraitement des cartes OSRM, le plus gourmand, se fait dans
la CI et ne compte pas dans ce budget.

### Comparatif des VPS (8 Go de RAM)

| Offre | vCPU | RAM | Disque | Datacenter UE | Prix / mois | Remarques |
| --- | --- | --- | --- | --- | --- | --- |
| **OVHcloud VPS-1** | 4 | 8 Go | 75 Go | France | **7,79 €** HT | Société et datacenter français, support en français |
| Contabo Cloud VPS 4 | 4 | 8 Go | 100 Go SSD | Allemagne | 5,50 € (4,40 € sur 24 mois) | Le moins cher, performances et support moins réguliers |
| netcup VPS 1000 G12 | 4 | 8 Go DDR5 | 256 Go NVMe | Allemagne, Autriche | 10,37 € TTC | Le plus de disque, facturation à l'heure possible |
| Hetzner Cloud CPX32 | 4 | 8 Go | 160 Go | Allemagne, Finlande | — | Plus commandable (offres cloud indisponibles) |

**Recommandation** : OVHcloud VPS-1. Données hébergées en France, ce qui simplifie les
mentions légales et le RGPD, et prix proche du moins cher. Contabo reste l'option la plus
économique si le budget prime.

### Coûts mensuels fixes

| Poste | Lancement | Quand l'activité démarre |
| --- | --- | --- |
| VPS (OVHcloud VPS-1) | 7,79 € HT | 7,79 € HT |
| Supabase | 0 € (Free) | 25 $ ≈ 22 € (Pro, sauvegardes quotidiennes incluses) |
| Resend | 0 € (3 000 mails/mois, 100/jour) | 20 $ ≈ 18 € (Pro, 50 000 mails/mois) si besoin |
| GHCR (images Docker) | 0 € | 0 € |
| OSRM, VROOM, Prometheus, Grafana, Loki | 0 € (open source) | 0 € |
| Géoplateforme IGN | 0 € | 0 € |
| Contrôle de disponibilité externe | 0 € (offre gratuite) | 0 € |
| Domaine `binovya.com` | Déjà acquis | Renouvellement annuel |
| **Total** | **≈ 8 € / mois** | **≈ 30 € / mois** |

**Limites du plan Supabase Free** : 500 Mo de base, 1 Go de fichiers, projet mis en pause
après une semaine sans activité, aucune sauvegarde. Avec des photos compressées à environ
300 Ko, 1 Go représente environ 1 600 interventions (2 photos chacune).

### Coûts variables par réservation

| Poste | Coût |
| --- | --- |
| Stripe, carte européenne standard | 1,5 % + 0,25 € |
| Stripe, carte européenne premium | 2,8 % + 0,25 € |
| SMS Brevo (France) | ≈ 0,045 € par SMS, soit ≈ 0,09 € pour 2 SMS |

Exemples de frais Stripe (carte standard) : 0,69 € sur 29 €, 0,99 € sur 49 €, 1,75 € sur
100 €.

### Sources

- [OVHcloud, hausse des prix VPS 2026 (Digitiz)](https://digitiz.fr/hausse-prix-vps-2026/)
- [OVHcloud VPS-1, caractéristiques (VPSBenchmarks)](https://www.vpsbenchmarks.com/hosters/ovhcloud)
- [Contabo Cloud VPS](https://contabo.com/en/vps/)
- [netcup VPS G12 (Valebyte, juillet 2026)](https://valebyte.com/en/blog/netcup-review-2026-the-price-performance-king-and-its-fine-print/)
- [Hetzner, offres Regular Performance](https://www.hetzner.com/cloud/regular-performance/)
- [Hetzner, hausse de juin 2026 (WZ-IT)](https://wz-it.com/en/blog/hetzner-price-increase-june-2026-cpx-ccx-alternatives/)
- [Supabase, tarifs](https://supabase.com/pricing)
- [Stripe France, tarifs](https://stripe.com/fr/pricing)
- [Resend, tarifs](https://resend.com/pricing)
- [Brevo, prix des SMS (Digitiz)](https://digitiz.fr/blog/logiciels-envoyer-sms-en-masse/)
- [GitHub Packages, facturation](https://docs.github.com/en/billing/concepts/product-billing/github-packages)
