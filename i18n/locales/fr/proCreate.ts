export default {
  create: {
    seo: {
      title: 'Nouvelle intervention - BINOVYA Pro',
    },
    eyebrow: 'BINOVYA Pro',
    title: 'Nouvelle intervention',
    intro:
      'Créez une intervention pour un client. Il reçoit un lien de paiement par mail, ou directement la confirmation si le paiement est déjà réglé.',
    sections: {
      customer: 'Client',
      address: 'Adresse d’intervention',
      bins: 'Bacs et formule',
      date: 'Date',
      payment: 'Paiement',
    },
    customer: {
      emailHint:
        'Si un compte client existe déjà avec cette adresse, l’intervention lui est rattachée et ses coordonnées ne sont pas modifiées.',
    },
    bins: {
      legend: 'Bacs à nettoyer',
      hint: 'Jusqu’à {max} bacs de chaque format. Au-delà, ou pour un petit et un grand bac ensemble, choisissez « Sur devis ».',
      quoteHint: 'Jusqu’à {max} bacs de chaque format, au prix du devis.',
      clampedHint:
        'Les quantités saisies sur devis ont été ramenées à {max} par format. Revenez sur « Sur devis » pour les retrouver.',
    },
    priceSource: {
      legend: 'Tarif',
      grid: {
        label: 'Grille tarifaire',
        hint: 'Le prix dépend des bacs et de la formule.',
      },
      quote: {
        label: 'Sur devis',
        hint: 'Vous fixez le prix convenu avec le client.',
      },
    },
    quoteAmount: {
      label: 'Prix du devis par passage, en euros',
      hint: 'Montant TTC, par exemple 120,50.',
    },
    note: {
      label: 'Note interne (facultatif)',
      hint: 'Visible seulement dans BINOVYA Pro, jamais par le client. {maxLength} caractères au plus.',
    },
    recreate: {
      loading: 'Chargement de l’intervention à créer à nouveau…',
      loaded:
        'Formulaire rempli avec l’intervention de {name} dont le lien a expiré. Choisissez une nouvelle date.',
      loadError:
        'L’intervention à créer à nouveau n’a pas pu être chargée : le formulaire est vide.',
    },
    date: {
      label: 'Date de l’intervention',
    },
    mode: {
      legend: 'Mode de paiement',
      payment_link: {
        label: 'Envoyer un lien de paiement',
        hint: 'Le client reçoit un lien de paiement Stripe par mail. La date lui est réservée environ {hours} heures, jusqu’au paiement.',
      },
      offline: {
        label: 'Paiement réglé hors site',
        hint: 'Espèces, virement… L’intervention est confirmée tout de suite et le client reçoit la confirmation par mail.',
      },
    },
    price: {
      label: 'Prix par passage',
      quoteLabel: 'Prix sur devis, par passage',
      unknown: 'À définir',
    },
    cancel: 'Annuler',
    submit: {
      payment_link: 'Créer et envoyer le lien de paiement',
      offline: 'Créer l’intervention payée',
    },
    submitting: 'Création…',
    submittingStatus: 'Création de l’intervention en cours…',
    force: 'Forcer quand même',
    success: {
      payment_link:
        'Intervention de {name} créée pour le {date}. Le lien de paiement est envoyé par mail au client.',
      offline:
        'Intervention de {name} créée pour le {date}, payée hors site. Le client reçoit la confirmation par mail.',
    },
    replayed:
      'Intervention de {name} déjà créée pour le {date} : elle n’a pas été créée une seconde fois.',
    emailFailed: {
      payment_link:
        'Le mail n’a pas pu être envoyé : renvoyez le lien de paiement depuis cette page.',
      offline: 'Le mail de confirmation n’a pas pu être envoyé au client.',
    },
    errors: {
      address: 'Recherchez l’adresse puis choisissez-la dans la liste.',
      bins: 'Ajoutez au moins un bac.',
      quoteRequired: 'Cette combinaison de bacs n’a pas de tarif : choisissez « Sur devis ».',
      quoteAmount: 'Indiquez le prix du devis en euros, au plus {maxAmount}.',
      note: 'La note interne ne peut pas dépasser {maxLength} caractères.',
      date: 'Choisissez la date de l’intervention.',
      outOfArea:
        'Cette adresse est hors de la zone d’intervention. Vous pouvez forcer la création.',
      dayClosed: 'Ce jour est fermé. Vous pouvez forcer la création.',
      dayFull: 'Ce jour est complet. Vous pouvez forcer la création.',
      outOfSector:
        'Ce jour est réservé à un autre secteur, trop loin de cette adresse. Vous pouvez forcer la création.',
      invalidInput: 'Certaines informations ne sont pas valides. Vérifiez le formulaire.',
      invalidAddress:
        'Cette adresse a expiré. Recherchez-la de nouveau puis choisissez-la dans la liste.',
      invalidQuantities: 'Choisissez au plus {max} bacs de chaque format.',
      invalidQuoteAmount:
        'Le prix du devis n’est pas valide : indiquez un montant d’au plus {maxAmount}.',
      customerNotFound: 'Le compte du client n’a pas pu être retrouvé. Réessayez dans un instant.',
      customerPending:
        'Ce client a déjà un paiement en attente. Attendez qu’il paie ou que le délai expire avant d’envoyer un nouveau lien.',
      pastDate: 'Impossible de créer une intervention dans le passé.',
      tooFar: 'Choisissez une date au plus tard le {date}.',
      paymentLinkFailed:
        'Le lien de paiement n’a pas pu être créé : l’intervention n’est pas enregistrée. Réessayez dans un instant.',
      requestInProgress:
        'Création en cours : l’intervention est en train d’être enregistrée. Rechargez la liste des interventions dans un instant.',
      generic: 'L’intervention n’a pas pu être créée. Réessayez dans un instant.',
      timeout:
        'La réponse tarde. L’intervention a peut-être été créée : vérifiez la liste des interventions avant de réessayer.',
    },
  },
  paymentLink: {
    text: 'Le client a reçu un lien de paiement par mail. Sans paiement avant le {deadline}, la date est libérée.',
    textNoDeadline: 'Le client a reçu un lien de paiement par mail.',
    resend: 'Renvoyer le lien de paiement',
    resending: 'Envoi…',
    sent: 'Lien de paiement renvoyé par mail au client.',
    errors: {
      notFound: 'Cette intervention n’existe plus.',
      notPending: 'Cette intervention n’attend plus de paiement.',
      linkExpired: 'Le délai de paiement est dépassé : la date a été libérée.',
      noLink: 'Aucun lien de paiement n’existe pour cette intervention.',
      tooFrequent: 'Le lien a déjà été renvoyé {max} fois dans l’heure. Réessayez plus tard.',
      linkUnavailable:
        'Ce lien de paiement n’est plus valable. Créez une nouvelle intervention pour ce client.',
      emailFailed: 'Le mail n’a pas pu être envoyé. Réessayez dans un instant.',
      generic: 'Le lien n’a pas pu être renvoyé. Réessayez dans un instant.',
      timeout:
        'La réponse tarde : le lien a peut-être été renvoyé. Vérifiez auprès du client avant de réessayer.',
    },
  },
}
