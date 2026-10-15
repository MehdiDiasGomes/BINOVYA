export default {
  seo: {
    title: 'Réserver une intervention - BINOVYA',
    description:
      'Réservez en ligne le nettoyage vapeur de vos bacs à déchets : choisissez vos bacs, votre formule, votre jour de passage et payez en toute sécurité.',
  },
  header: {
    eyebrow: 'Particuliers et professionnels',
    title: 'Réservez votre intervention',
    subtitle: 'Quatre étapes, environ deux minutes. Sans création de mot de passe.',
  },
  steps: {
    ariaLabel: 'Étapes de la réservation',
    progress: 'Étape {current} sur {total}',
    completed: 'étape terminée',
    contact: 'Coordonnées',
    bins: 'Bacs',
    schedule: 'Formule et date',
    payment: 'Paiement',
  },
  headings: {
    contact: {
      title: 'Vos coordonnées et votre adresse',
      description:
        'Votre espace client est créé automatiquement. Vous y retrouverez vos réservations et les photos avant/après.',
    },
    bins: {
      title: 'Quels bacs faut-il nettoyer ?',
      description: 'Indiquez le nombre de bacs de chaque format, puis vos jours de collecte.',
    },
    schedule: {
      title: 'Votre formule et votre jour de passage',
      description:
        'Vous choisissez un jour, sans créneau horaire : nous passons dans la journée. Vous recevez un rappel par email avant notre passage.',
    },
    payment: {
      title: 'Confirmation et paiement',
      description: 'Vérifiez votre réservation dans le récapitulatif, puis confirmez.',
    },
  },
  actions: {
    back: 'Retour',
    continue: 'Continuer',
    pay: 'Payer {amount}',
    submitting: 'Redirection vers le paiement…',
    submittingStatus: 'Réservation en cours d’enregistrement, redirection vers le paiement…',
  },
  errors: {
    paymentCancelled:
      'Paiement annulé, aucune somme n’a été débitée. Vérifiez votre réservation puis relancez le paiement.',
    contact: 'Vérifiez les champs signalés ci-dessus.',
    address: 'Sélectionnez une adresse dans la liste pour continuer.',
    outOfArea: "Cette adresse est hors de notre zone d'intervention.",
    addressCheck: 'La vérification de votre adresse est en cours ou a échoué.',
    bins: 'Ajoutez au moins un bac à nettoyer.',
    quoteRequired: 'Cette combinaison de bacs nécessite un devis.',
    collection:
      'Indiquez le jour de collecte de chacun des deux bacs, ou cochez « Je ne sais pas ».',
    price: "Le prix n'a pas pu être calculé. Rechargez la page.",
    date: 'Choisissez un jour de passage dans le calendrier.',
    binsReady: 'Vous devez confirmer que vos bacs seront vides et accessibles.',
    terms: 'Vous devez accepter les conditions pour continuer.',
    dayTaken: "Ce jour vient d'être réservé par quelqu'un d'autre. Choisissez-en un autre.",
    pendingPayment:
      'Un paiement est déjà en cours pour cette adresse email. Terminez-le ou réessayez dans quelques minutes.',
    submit: "La réservation n'a pas pu être enregistrée. Réessayez dans un instant.",
  },
  countries: {
    FR: 'France',
    LU: 'Luxembourg',
  },
  address: {
    label: 'Adresse des bacs à nettoyer',
    country: "Pays de l'adresse",
    placeholder: {
      FR: '12 rue de la Gare, Thionville',
      LU: '24 Grand-Rue, Rumelange',
    },
    hint: 'Saisissez au moins 3 caractères, puis choisissez une adresse dans la liste.',
    listLabel: 'Adresses proposées',
    loading: 'Recherche en cours…',
    noResult: 'Aucune adresse trouvée. Vérifiez la saisie.',
    error: 'La recherche est indisponible pour le moment. Réessayez dans un instant.',
    checking: 'Vérification de votre zone…',
    checkError: 'Impossible de vérifier votre adresse pour le moment.',
    retry: 'Réessayer',
    inArea: 'Bonne nouvelle, nous intervenons à {city}.',
    outOfArea:
      "Nous n'intervenons pas encore à {city}. Notre zone couvre {radius} km autour d'Uckange.",
    outOfAreaCta: 'Nous contacter pour une demande particulière',
  },
  bins: {
    small: {
      title: 'Petit bac',
      capacity: '120 à 240 L',
    },
    large: {
      title: 'Grand bac',
      capacity: '600 à 1 100 L',
    },
    decrease: 'Retirer un bac : {service}',
    increase: 'Ajouter un bac : {service}',
    quantityStatus: '{count} sélectionné(s)',
    quote: {
      title: 'Cette combinaison nécessite un devis',
      text: 'Pour 3 bacs ou plus, ou pour un petit et un grand bac ensemble, nous établissons un devis adapté.',
      cta: 'Demander un devis',
    },
  },
  collection: {
    hint: 'Vos jours de collecte figurent sur le calendrier de collecte de votre commune.',
    question: 'Quel jour est-il collecté ?',
    household: {
      legend: 'Bac des déchets non recyclables',
      lid: 'Couvercle souvent vert, gris ou noir selon la commune',
    },
    recycling: {
      legend: 'Bac de tri (emballages, cartons, papiers)',
      lid: 'Couvercle généralement jaune',
    },
    unknown: 'Je ne sais pas',
  },
  plans: {
    legend: 'Votre formule',
    description: 'Le prix affiché correspond à un passage, il change selon la formule.',
    perVisit: 'par passage',
    gridError: 'Les tarifs sont indisponibles pour le moment. Rechargez la page.',
    one_off: {
      title: 'Ponctuelle',
      description: 'Un seul passage',
    },
    quarterly: {
      title: 'Trimestrielle',
      description: 'Un passage tous les 3 mois',
    },
    annual: {
      title: 'Annuelle',
      description: 'Un passage chaque mois',
    },
  },
  date: {
    calendarLabel: 'Choix du jour de passage',
    previousMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    recommendedSuffix: ', jour recommandé',
    nextRecommended: 'Prochaine date recommandée',
    nextAvailable: 'Prochaine date disponible',
    pickSuggested: 'Choisir cette date',
    selected: 'Jour choisi : {date}',
    legend: {
      title: 'Légende',
      recommended: 'Recommandé : jour de collecte ou lendemain',
      available: 'Disponible',
      unavailable: 'Indisponible',
    },
    whyRecommended: {
      title: 'Pourquoi ces jours ?',
      text: "Le nettoyage vapeur se fait obligatoirement sur des bacs vides. Nous recommandons donc votre jour de collecte ou le lendemain, quand vos bacs viennent d'être vidés.",
    },
    notRecommended:
      "Ce jour n'est ni un jour de collecte ni le lendemain. Vos bacs devront être vides à notre passage.",
    empty: "Aucun jour n'est disponible pour votre secteur dans les prochaines semaines.",
    emptyCta: 'Nous contacter',
  },
  contact: {
    firstName: 'Prénom',
    firstNamePlaceholder: 'Jean',
    lastName: 'Nom',
    lastNamePlaceholder: 'Dupont',
    email: 'Adresse email',
    emailPlaceholder: "jean.dupont{'@'}exemple.fr",
    emailHint: 'Pour la confirmation et l’accès à votre espace client.',
    phone: 'Téléphone mobile',
    phoneCountry: 'Indicatif du pays',
    phonePlaceholder: {
      FR: '6 12 34 56 78',
      LU: '621 123 456',
    },
    phoneHint: 'Pour vous joindre le jour du passage si besoin.',
    errors: {
      firstName: 'Indiquez votre prénom (entre {min} et {max} caractères).',
      lastName: 'Indiquez votre nom (entre {min} et {max} caractères).',
      email: 'Indiquez une adresse email valide.',
      phone: 'Indiquez un numéro de téléphone français ou luxembourgeois valide.',
    },
  },
  payment: {
    binsReady: 'Je confirme que mes bacs seront vides et accessibles le jour du passage.',
    binsReadyHint: "Votre présence n'est pas nécessaire si l'accès aux bacs est possible.",
    terms: "J'accepte les conditions générales de vente et la politique de confidentialité.",
    termsLink: 'Lire la politique de confidentialité',
    securePayment:
      'Paiement sécurisé par Stripe. Aucune donnée bancaire ne transite par notre site.',
  },
  checkout: {
    productName: 'Nettoyage de bacs BINOVYA ({plan})',
  },
  summary: {
    title: 'Votre réservation',
    address: 'Adresse',
    bins: 'Bacs',
    plan: 'Formule',
    date: 'Jour de passage',
    total: 'Prix du passage',
    empty: 'À compléter',
    line: '{quantity} × {service}',
    quote: 'Sur devis',
    taxNote: 'Prix TTC, paiement en ligne.',
  },
  confirmation: {
    title: 'Paiement reçu, merci !',
    text: 'Vous allez recevoir à {email} l’email de confirmation de votre passage du {date}.',
    nextTitle: 'Et maintenant ?',
    nextSteps: {
      reminder: 'Vous recevez un rappel par email avant notre passage.',
      empty: 'Laissez vos bacs vides et accessibles le jour J.',
      photos:
        'Après l’intervention, vous recevez un email pour découvrir les photos avant/après de vos bacs.',
    },
    home: "Retour à l'accueil",
    newBooking: 'Nouvelle réservation',
  },
}
