export default {
  nav: 'Espace client',
  login: {
    seo: {
      title: 'Espace client - BINOVYA',
      description:
        'Accédez à vos réservations BINOVYA et aux photos avant/après de vos bacs grâce à un lien de connexion envoyé par mail.',
    },
    eyebrow: 'Espace client',
    title: 'Accéder à mon espace',
    subtitle:
      'Sans mot de passe : saisissez l’adresse mail utilisée lors de votre réservation, nous vous envoyons un lien de connexion.',
    sessionExpired:
      'Votre session a expiré. Pour votre sécurité, reconnectez-vous avec un nouveau lien.',
    formLabel: 'Demande de lien de connexion',
    email: 'Adresse email',
    emailPlaceholder: "jean.dupont{'@'}exemple.fr",
    emailHint: 'L’adresse indiquée lors de votre réservation.',
    submit: 'Recevoir mon lien de connexion',
    submitting: 'Envoi en cours…',
    submittingStatus: 'Demande de lien de connexion en cours…',
    errors: {
      email: 'Indiquez une adresse email valide.',
      submit: 'La demande n’a pas pu être envoyée. Réessayez dans un instant.',
    },
    sent: {
      title: 'Vérifiez votre boîte mail',
      text: 'Si un espace existe pour cette adresse, un lien de connexion vient de vous être envoyé.',
      stepsTitle: 'Et maintenant ?',
      steps: {
        open: 'Ouvrez le mail « Votre lien de connexion à votre espace BINOVYA ».',
        spam: 'Vous ne le voyez pas ? Regardez dans vos courriers indésirables, il peut mettre quelques minutes à arriver.',
        validity:
          'Cliquez sur « Me connecter » : le lien est valable {hours} heures et ne sert qu’une fois.',
      },
      noBooking:
        'Pas encore de réservation ? Votre espace s’ouvre avec votre première réservation.',
      bookingCta: 'Réserver une intervention',
      retry: 'Utiliser une autre adresse',
    },
  },
  confirm: {
    seo: {
      title: 'Connexion - BINOVYA',
    },
    heading: 'Connexion à votre espace client',
    verifying: 'Connexion à votre espace en cours…',
    failedTitle: 'Ce lien de connexion ne fonctionne plus',
    failedText:
      'Il a peut-être expiré ({hours} heures) ou déjà été utilisé. Pas d’inquiétude, demandez-en un nouveau en quelques secondes :',
    steps: {
      open: 'Ouvrez la page « Espace client ».',
      email: 'Saisissez l’adresse mail utilisée lors de votre réservation.',
      click: 'Ouvrez le nouveau mail reçu et cliquez sur « Me connecter ».',
    },
    loginCta: 'Recevoir un nouveau lien',
  },
  dashboard: {
    seo: {
      title: 'Mon espace client - BINOVYA',
    },
    eyebrow: 'Espace client',
    greeting: 'Bonjour {name}',
    greetingFallback: 'Bonjour',
    subtitle: 'Retrouvez ici vos réservations et les photos avant/après de vos bacs.',
    loading: 'Chargement de vos réservations…',
    loadError: 'Vos réservations n’ont pas pu être chargées.',
    retry: 'Réessayer',
    signOut: 'Me déconnecter',
    signingOut: 'Déconnexion…',
    bookingsTitle: 'Mes réservations',
    empty: {
      title: 'Aucune réservation pour le moment',
      text: 'Vos réservations payées apparaîtront ici.',
      cta: 'Réserver une intervention',
    },
  },
  booking: {
    services: 'Prestation',
    plan: 'Formule',
    amount: 'Montant payé',
    refunded: 'Remboursé',
    statuses: {
      paid: 'À venir',
      completed: 'Réalisée',
      cancelled: 'Annulée et remboursée',
    },
    reminder: {
      title: 'Videz vos bacs la veille',
      text: 'Nous ne pouvons pas nettoyer un bac plein. Un rappel vous sera envoyé par mail.',
    },
    view: 'Voir la réservation',
    viewContext: 'du {date}',
  },
  detail: {
    seo: {
      title: 'Ma réservation - BINOVYA',
    },
    back: 'Retour à mes réservations',
    eyebrow: 'Espace client',
    titleFallback: 'Ma réservation',
    title: 'Ma réservation du {date}',
    loading: 'Chargement de votre réservation…',
    loadError: 'Votre réservation n’a pas pu être chargée.',
    retry: 'Réessayer',
    notFound: {
      title: 'Réservation introuvable',
      text: 'Cette réservation n’existe pas ou n’est pas rattachée à votre espace client.',
    },
    summaryTitle: 'Récapitulatif',
    date: 'Date',
    address: 'Adresse',
    photos: {
      title: 'Photos avant/après',
      text: 'BINOVYA ajoutera ici les photos de vos bacs après l’intervention.',
      kinds: {
        before: 'Photo avant',
        after: 'Photo après',
      },
      placeholder: 'Pas encore de photo',
    },
    invoice: {
      title: 'Facture',
      soon: 'Bientôt disponible',
    },
    rebook: 'Réserver une autre date',
  },
  deletion: {
    title: 'Supprimer mon espace client',
    text: 'Vous pouvez demander la suppression de votre espace et de vos données personnelles.',
    request: 'Demander la suppression',
    confirmTitle: 'Confirmer la demande de suppression',
    confirmText:
      'Votre demande est transmise à BINOVYA et traitée sous un mois. Les réservations payées sont conservées le temps imposé par nos obligations comptables.',
    confirm: 'Oui, demander la suppression',
    cancel: 'Annuler',
    submitting: 'Envoi de la demande…',
    error: 'La demande n’a pas pu être envoyée. Réessayez dans un instant.',
    doneTitle: 'Demande reçue',
    doneText:
      'Votre demande de suppression du {date} a bien été reçue. Elle sera traitée sous un mois.',
  },
}
