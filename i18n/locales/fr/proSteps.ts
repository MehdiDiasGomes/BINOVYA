export default {
  progress: {
    todo: 'À faire',
    beforeDone: 'Photo avant faite',
    afterDone: 'Photo après faite',
    photosDone: 'Photos faites',
    completed: 'Terminée',
    completedWithoutPhotos: 'Terminée sans photos',
    cancelled: 'Annulée',
  },
  card: {
    actions: {
      start: 'Commencer',
      continue: 'Continuer',
      view: 'Voir',
    },
    subject: 'l’intervention de {name}',
    subjectDated: 'l’intervention de {name} du {date}',
    moreName: 'Plus d’actions pour {subject}',
  },
  steps: {
    seo: {
      title: 'Intervention - BINOVYA Pro',
    },
    eyebrow: 'Intervention',
    titleFallback: 'Intervention',
    backPlanning: 'Retour au planning',
    backList: 'Retour aux interventions',
    loading: 'Chargement de l’intervention…',
    loadError: 'L’intervention n’a pas pu être chargée.',
    notFound: {
      title: 'Intervention introuvable',
      text: 'Cette intervention n’existe pas ou n’apparaît plus dans BINOVYA Pro.',
    },
    progressLabel: 'Étapes de l’intervention',
    counter: 'Étape {current} sur {total}',
    announce: 'Étape {current} sur {total} : {name}',
    headingPrefix: 'Étape {current} sur {total} :',
    names: {
      directions: 'Itinéraire',
      before: 'Photo avant',
      after: 'Photo après',
      recap: 'Récap',
    },
    states: {
      done: 'faite',
      skipped: 'passée',
      current: 'en cours',
      todo: 'à faire',
    },
    stepNumber: 'Étape {number} :',
    next: {
      before: 'Passer à la photo après',
      after: 'Voir le récap',
    },
    skip: 'Passer cette photo',
    directions: {
      addressLabel: 'Adresse :',
      call: 'Appeler {name} au {phone}',
      arrived: 'Je suis sur place',
    },
    photo: {
      text: {
        before: 'Prenez la photo des bacs avant le nettoyage.',
        after: 'Prenez la photo des bacs après le nettoyage.',
      },
      toClean: 'À nettoyer',
      skipWarning: 'Sans les deux photos, l’intervention se termine sans mail photos au client.',
      skipConfirm: 'Oui, passer',
      skipCancel: 'Annuler',
    },
    photoError: {
      link: 'Aller à l’étape : {name}',
    },
    recap: {
      text: 'Vérifiez les photos, puis terminez l’intervention.',
      missing: 'Il manque {missing} : le client ne recevra pas de mail photos.',
      uploading: 'Attendez la fin de l’envoi de la photo pour terminer.',
    },
    completed: {
      title: 'Intervention terminée',
      withPhotos: 'Le client est prévenu par mail que ses photos sont disponibles.',
      withoutPhotos: 'Terminée sans photos : aucun mail n’est envoyé au client.',
      recapTitle: 'Récapitulatif',
      recapText: 'Vous pouvez remplacer une photo à tout moment, sans nouveau mail au client.',
    },
    upcoming: {
      title: 'Intervention à venir',
      text: 'Les étapes s’ouvrent le jour de l’intervention, le {date}.',
    },
    cancelled: {
      title: 'Intervention annulée',
      text: 'Cette intervention a été annulée et remboursée.',
    },
    details: {
      toggle: 'Plus d’infos',
    },
  },
}
