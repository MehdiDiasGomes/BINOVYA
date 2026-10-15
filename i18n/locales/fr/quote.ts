export default {
  seo: {
    title: 'Demander un devis - BINOVYA',
    description:
      'Demandez un devis pour le nettoyage vapeur de vos bacs, points d’apport volontaire, mobilier urbain ou signalisation. Réponse sous 48 h.',
  },
  header: {
    eyebrow: 'Devis',
    title: 'Demandez votre devis',
    subtitle:
      'Plusieurs bacs, des formats différents, des PAV, du mobilier urbain ou de la signalisation : décrivez votre besoin, nous préparons une offre adaptée.',
  },
  sections: {
    contact: 'Vos coordonnées',
    address: "Adresse d'intervention",
    bins: 'Vos bacs',
  },
  fields: {
    company: 'Société ou collectivité (facultatif)',
    companyPlaceholder: 'BINOVYA SAS',
  },
  equipment: {
    legend: 'Équipements à nettoyer',
    description: 'Cochez tout ce qui concerne votre demande.',
    items: {
      bins: 'Bacs roulants',
      pav: "Points d'apport volontaire",
      urban_furniture: 'Mobilier urbain',
      signage: 'Signalisation',
    },
  },
  plan: {
    legend: 'Fréquence souhaitée',
    description: 'Une indication suffit, nous en discuterons avec vous.',
    undecided: 'Pas encore décidée',
  },
  comment: {
    label: 'Commentaire (facultatif)',
    placeholder: 'Accès aux bacs, nombre de sites, contraintes particulières…',
  },
  photos: {
    legend: 'Photos (facultatif)',
    hint: "Jusqu'à {count} photos de {size} Mo maximum (JPEG, PNG ou WebP). Elles nous aident à préparer le devis.",
    add: 'Ajouter des photos',
    remove: 'Retirer la photo {name}',
    previewAlt: 'Aperçu de la photo {index} : {name}',
    issues: {
      tooMany: 'Vous pouvez ajouter {count} photos au maximum.',
      tooLarge: 'Une photo dépasse la taille maximale de {size} Mo.',
      wrongType: 'Seules les photos JPEG, PNG ou WebP sont acceptées.',
    },
  },
  aside: {
    label: 'Informations sur le devis',
    steps: {
      title: 'Un devis en trois étapes',
      items: {
        request: {
          title: 'Vous décrivez votre besoin',
          text: "Type d'équipements, quantité, adresse et fréquence souhaitée.",
        },
        quote: {
          title: 'Vous recevez un devis',
          text: 'Nous revenons vers vous sous 48 h avec une proposition chiffrée.',
        },
        intervention: {
          title: 'Nous intervenons sur place',
          text: 'À la date convenue, avec notre matériel vapeur et notre véhicule électrique.',
        },
      },
    },
    online: {
      title: 'Seulement 1 ou 2 bacs roulants ?',
      text: 'Particuliers comme professionnels, même grille tarifaire : réservez et payez directement en ligne.',
      cta: 'Réserver en ligne',
    },
    contact: {
      text: 'Une question avant de demander un devis ?',
      cta: 'Contactez-nous',
    },
  },
  errors: {
    contact: 'Vérifiez vos coordonnées : prénom, nom, email et téléphone.',
    address: 'Sélectionnez une adresse dans la liste.',
    bins: 'Indiquez au moins un bac.',
    equipment: 'Cochez au moins un type d’équipement.',
    company: 'Le nom de la société ne doit pas dépasser {max} caractères.',
    submit: "Votre demande n'a pas pu être envoyée. Réessayez dans un instant.",
  },
  actions: {
    submit: 'Envoyer ma demande',
    submitting: 'Envoi…',
  },
  sent: {
    title: 'Votre demande est envoyée',
    text: 'Merci, nous avons bien reçu votre demande de devis. Nous revenons vers vous rapidement, par email ou par téléphone.',
  },
}
