import proPhotos from './proPhotos'
import proSteps from './proSteps'

export default {
  nav: {
    brand: 'BINOVYA Pro',
    label: 'Navigation BINOVYA Pro',
    planning: 'Planning',
    interventions: 'Interventions',
    availability: 'Disponibilités',
    signOut: 'Me déconnecter',
    signingOut: 'Déconnexion…',
    signedInAs: 'Connecté en tant que',
    closeMenu: 'Fermer le menu',
  },
  footer: {
    navLabel: 'Liens du site BINOVYA',
    copyright: '© {year} BINOVYA',
    backToSite: 'Retour au site',
  },
  loadError: 'Les interventions n’ont pas pu être chargées.',
  retry: 'Réessayer',
  newTab: '(s’ouvre dans un nouvel onglet)',
  login: {
    seo: {
      title: 'Connexion - BINOVYA Pro',
    },
    eyebrow: 'BINOVYA Pro',
    title: 'Connexion à BINOVYA Pro',
    subtitle:
      'Réservé à l’équipe BINOVYA. Saisissez l’adresse mail de votre compte, nous vous envoyons un lien de connexion.',
    accessDenied:
      'Ce compte n’a pas accès à BINOVYA Pro. Connectez-vous avec l’adresse d’un compte de l’équipe.',
    sessionExpired:
      'Votre session BINOVYA Pro n’est plus valide. Demandez un nouveau lien de connexion. Une session dure {days} jours au plus.',
    formLabel: 'Demande de lien de connexion à BINOVYA Pro',
    email: 'Adresse email',
    emailPlaceholder: "prenom{'@'}binovya.com",
    submit: 'Recevoir mon lien de connexion',
    submitting: 'Envoi en cours…',
    submittingStatus: 'Demande de lien de connexion en cours…',
    submitError: 'La demande n’a pas pu être envoyée. Réessayez dans un instant.',
    sent: {
      title: 'Vérifiez votre boîte mail',
      text: 'Si cette adresse correspond à un compte BINOVYA Pro, un lien de connexion vient d’être envoyé. Il est valable {hours} heures et ne sert qu’une fois.',
      retry: 'Utiliser une autre adresse',
    },
  },
  confirm: {
    seo: {
      title: 'Vérification du lien - BINOVYA Pro',
    },
    heading: 'Vérification du lien de connexion à BINOVYA Pro',
    verifying: 'Connexion à BINOVYA Pro en cours…',
    failedTitle: 'Ce lien de connexion ne fonctionne plus',
    failedText:
      'Il a peut-être expiré ({hours} heures) ou déjà été utilisé. Demandez-en un nouveau depuis la page de connexion.',
    loginCta: 'Recevoir un nouveau lien',
  },
  planning: {
    seo: {
      title: 'Planning du jour - BINOVYA Pro',
    },
    eyebrow: 'Planning du jour',
    title: 'Planning du {date}',
    dateGroup: 'Choix du jour',
    dateLabel: 'Jour affiché',
    previousDay: 'Jour précédent',
    nextDay: 'Jour suivant',
    today: 'Aujourd’hui',
    listTitle: 'Interventions du jour',
    loading: 'Chargement du planning…',
    count:
      'Aucune intervention le {date} | Une intervention le {date} | {n} interventions le {date}',
    empty: 'Aucune intervention prévue ce jour-là.',
    loadedStatus: '{count}. {status}.',
    round: {
      title: 'Itinéraire de la journée',
      text: 'Départ et retour au dépôt, en passant par les interventions à réaliser dans l’ordre de la liste. Au-delà de {max} arrêts, la tournée est découpée en plusieurs parties.',
      link: 'Ouvrir la tournée dans Google Maps',
      part: 'Tournée, partie {part} sur {total}',
      empty: 'Aucune intervention à réaliser ce jour.',
    },
  },
  dayStatus: {
    title: {
      closedWithBookings:
        '{weekday} fermé : une intervention à déplacer | {weekday} fermé : {bookings} interventions à déplacer',
      closed: '{weekday} fermé',
      overCapacity:
        'Capacité dépassée : {bookings} réservations pour une place | Capacité dépassée : {bookings} réservations pour {capacity} places',
    },
    reason: {
      closedRule: 'La règle du {weekday} ferme ce jour : les clients ne peuvent pas le réserver.',
      closedOverride: 'Une exception ferme ce jour : les clients ne peuvent pas le réserver.',
      overCapacityRule:
        '{n} réservations sont prévues pour une capacité de {capacity} (règle du {weekday}) : les clients ne peuvent plus réserver ce jour.',
      overCapacityOverride:
        '{n} réservations sont prévues pour une capacité de {capacity} (exception) : les clients ne peuvent plus réserver ce jour.',
    },
    advice: {
      closedWithBookings:
        'L’intervention déjà payée reste prévue ce jour : changez sa date, le client est prévenu par mail. | Les {n} interventions déjà payées restent prévues ce jour : changez leur date, chaque client est prévenu par mail.',
      overCapacity:
        'Déplacez-en au moins une ou augmentez la capacité de ce jour. | Déplacez-en au moins {n} ou augmentez la capacité de ce jour.',
      overCapacityNoMove: 'Augmentez la capacité de ce jour.',
    },
    note: 'Note : {note}',
    urgent: {
      title:
        '{bookings} intervention à déplacer d’urgence | {bookings} interventions à déplacer d’urgence',
      instruction: {
        closedWithBookings:
          "Sur chaque intervention marquée « @:{'pro.intervention.toMove'} », ouvrez le menu ⋯ (Plus d’actions) puis choisissez « @:{'pro.intervention.reschedule'} ».",
        overCapacity:
          "Pour déplacer une intervention, ouvrez son menu ⋯ (Plus d’actions) puis choisissez « @:{'pro.intervention.reschedule'} ».",
      },
    },
    reopen: 'Rouvrir ce jour',
    increase: 'Augmenter la capacité de ce jour',
  },
  list: {
    seo: {
      title: 'Interventions - BINOVYA Pro',
    },
    eyebrow: 'BINOVYA Pro',
    title: 'Liste des interventions',
    resultsTitle: 'Résultats',
    loading: 'Chargement des interventions…',
    count: 'Aucune intervention | Une intervention | {n} interventions',
    countPage: '{n} interventions, page {page} sur {total}',
    toMoveCount: 'dont une à déplacer | dont {n} à déplacer',
    toMoveCountPage: 'dont une à déplacer sur cette page | dont {n} à déplacer sur cette page',
    empty: 'Aucune intervention ne correspond à ces filtres.',
    filters: {
      label: 'Filtres des interventions',
      status: 'Statut',
      statuses: {
        all: 'Tous les statuts',
        paid: 'À réaliser',
        completed: 'Réalisées',
        cancelled: 'Annulées',
      },
      from: 'Du',
      to: 'Au',
      rangeError: 'La date de fin ne peut pas précéder la date de début.',
      reset: 'Réinitialiser',
    },
    pagination: {
      label: 'Pagination des interventions',
      previous: 'Page précédente',
      next: 'Page suivante',
      page: 'Page {page} sur {total}',
    },
  },
  intervention: {
    unknownCustomer: 'Client inconnu',
    payments: {
      paid: 'Payé',
      refunded: 'Remboursé',
    },
    date: 'Date',
    phone: 'Téléphone',
    bins: 'Bacs',
    plan: 'Formule',
    household: 'Collecte ordures ménagères',
    recycling: 'Collecte tri',
    unknownDays: 'Non renseigné',
    amount: 'Montant',
    forName: 'pour {name}',
    reschedule: 'Changer la date',
    toMove: 'À déplacer',
    toMoveReason: '(jour fermé)',
  },
  directions: {
    action: 'Itinéraire',
    menuLabel: 'Ouvrir avec',
    apps: {
      appleMaps: 'Plans',
      googleMaps: 'Google Maps',
      waze: 'Waze',
      other: 'Autre application…',
    },
  },
  ...proPhotos,
  ...proSteps,
  reschedule: {
    title: 'Changer la date de l’intervention',
    description: '{name}, {address}. Date actuelle : {date}.',
    close: 'Fermer',
    dateLabel: 'Nouvelle date',
    cancel: 'Annuler',
    submit: 'Déplacer l’intervention',
    submitting: 'Déplacement…',
    submittingStatus: 'Déplacement de l’intervention en cours…',
    force: 'Forcer quand même',
    success: 'Intervention de {name} déplacée au {date}. Le client est prévenu par mail.',
    forced: 'Contrôles forcés : {reasons}.',
    overridden: {
      outOfArea: 'adresse hors zone',
      dayClosed: 'jour fermé',
      dayFull: 'jour complet',
      outOfSector: 'jour réservé à un autre secteur',
    },
    errors: {
      dateRequired: 'Choisissez la nouvelle date.',
      outOfArea:
        'Cette adresse est hors de la zone d’intervention. Vous pouvez forcer le déplacement.',
      dayClosed: 'Ce jour est fermé. Vous pouvez forcer le déplacement.',
      dayFull: 'Ce jour est complet. Vous pouvez forcer le déplacement.',
      outOfSector:
        'Ce jour est réservé à un autre secteur, trop loin de cette adresse. Vous pouvez forcer le déplacement.',
      notFound: 'Cette intervention n’existe plus. Rechargez la page.',
      notPaid: 'Seule une intervention à réaliser peut changer de date.',
      invalidDate: 'Cette date n’est pas valide.',
      sameDate: 'L’intervention est déjà prévue ce jour-là. Choisissez une autre date.',
      pastDate: 'Impossible de déplacer une intervention dans le passé.',
      tooFar: 'Choisissez une date au plus tard le {date}.',
      tooFrequent:
        'Cette intervention a déjà été déplacée plusieurs fois dans l’heure. Réessayez plus tard.',
      generic: 'Le déplacement n’a pas pu être enregistré. Réessayez dans un instant.',
      timeout:
        'La réponse tarde. Le déplacement a peut-être été enregistré : la liste sera actualisée à la fermeture, vérifiez la date avant de réessayer.',
    },
  },
  availability: {
    seo: {
      title: 'Disponibilités - BINOVYA Pro',
    },
    eyebrow: 'BINOVYA Pro',
    title: 'Disponibilités',
    intro:
      'Réglez le nombre d’interventions possibles chaque jour, fermez un jour ou imposez son secteur. Les réservations des clients suivent ces réglages.',
    loading: 'Chargement des disponibilités…',
    savingStatus: 'Enregistrement en cours…',
    loadError: 'Les disponibilités n’ont pas pu être chargées.',
    sectorValue: 'latitude {latitude}, longitude {longitude}',
    errors: {
      capacity: 'Indiquez un nombre entier entre 0 et {max}.',
      sector: 'Cette commune a expiré. Recherchez-la de nouveau puis choisissez-la dans la liste.',
    },
    capacityField: {
      closed: 'Jour fermé',
      increase: 'Augmenter la capacité {context}',
      decrease: 'Diminuer la capacité {context}',
      followRule: 'Suivre la règle',
      rulePlaceholder: '{count} (règle)',
    },
    rules: {
      title: 'Capacité par jour de semaine',
      legend: 'Nombre d’interventions par jour de semaine',
      hint: 'Nombre d’interventions possibles chaque jour, de 0 à {max}. 0 ferme le jour.',
      context: 'du {day}',
      save: 'Enregistrer les capacités',
      saving: 'Enregistrement…',
      saved: 'Capacités par jour de semaine enregistrées.',
      saveError: 'Les capacités n’ont pas pu être enregistrées. Réessayez dans un instant.',
      invalid: 'Certaines capacités ne sont pas valides. Corrigez les champs signalés.',
    },
    override: {
      title: 'Exceptions par date',
      intro:
        'Pour un jour précis : fermez-le (capacité 0), renforcez-le, imposez un secteur ou ajoutez une note. Les interventions déjà payées restent sur le jour : changez leur date depuis le planning.',
      date: 'Jour à modifier',
      rule: 'Règle du {weekday} : jour fermé. | Règle du {weekday} : une intervention. | Règle du {weekday} : {n} interventions.',
      capacity: 'Capacité de ce jour',
      capacityContext: 'de ce jour',
      capacityHint: 'Laissez vide pour suivre la règle. De 0 à {max}, 0 ferme le jour.',
      sector: 'Imposer un secteur (commune)',
      removeSector: 'Retirer le secteur imposé',
      note: 'Note (facultative)',
      noteHint: '{max} caractères au plus. Visible seulement dans BINOVYA Pro.',
      save: 'Enregistrer l’exception',
      saving: 'Enregistrement…',
      saved: 'Exception du {date} enregistrée.',
      saveError: 'L’exception n’a pas pu être enregistrée. Réessayez dans un instant.',
      saveErrorFor: 'L’exception du {date} n’a pas pu être enregistrée. Réessayez dans un instant.',
      invalid: 'L’exception n’est pas valide. Corrigez les champs signalés.',
      remove: 'Retirer l’exception',
      removed: 'Exception du {date} retirée : le jour suit de nouveau la règle du {weekday}.',
      removeError: 'L’exception n’a pas pu être retirée. Réessayez dans un instant.',
      removeErrorFor: 'L’exception du {date} n’a pas pu être retirée. Réessayez dans un instant.',
    },
    days: {
      title: 'Exceptions et jours à surveiller',
      empty: 'Aucune exception ni aucun jour à surveiller jusqu’au {date}.',
      capacity: 'Capacité',
      capacityOverride:
        'Jour fermé (exception) | Une intervention (exception) | {n} interventions (exception)',
      capacityRule:
        'Jour fermé (règle du {weekday}) | Une intervention (règle du {weekday}) | {n} interventions (règle du {weekday})',
      sector: 'Secteur imposé',
      note: 'Note',
      bookings: 'Réservations',
      bookingsValue:
        'Aucune réservation | Une réservation, {paid} à réaliser | {n} réservations, {paid} à réaliser',
      planning: 'Voir le planning',
      edit: 'Modifier',
      ofDay: 'du {date}',
      editOfDay: 'le {date}',
    },
  },
}
