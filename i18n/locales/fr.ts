import about from './fr/about'
import booking from './fr/booking'
import faq from './fr/faq'
import legal from './fr/legal'
import privacy from './fr/privacy'
import professionals from './fr/professionals'
import solutions from './fr/solutions'

export default {
  nav: {
    home: 'Accueil',
    services: 'Nos services',
    particuliers: 'Particuliers',
    pro: 'Professionnels & Collectivités',
    contact: 'Contact',
    reserver: 'Réserver',
    reserverAriaLabel: 'Réserver une intervention',
    mainNavAriaLabel: 'Navigation principale',
    mobileNavAriaLabel: 'Menu de navigation mobile',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    menu: 'Menu',
  },
  hero: {
    tagline: "L'hygiène urbaine nouvelle génération",
    eyebrow: 'Nettoyage vapeur professionnel',
    titleMain: "L'hygiène urbaine",
    titleAccent: 'nouvelle génération',
    lead: "Nous nettoyons vos bacs à déchets, PAV, mobilier urbain, signalisation et zones de regroupement grâce à une méthode professionnelle, éco-responsable et adaptée aux besoins des particuliers, professionnels et collectivités.",
    ctaReserver: 'Réserver une intervention',
    ctaReserverAriaLabel: 'Réserver une intervention en ligne',
    ctaDevis: 'Demander un devis',
    ctaDevisAriaLabel: 'Contacter pour un devis professionnel',
    platNote: 'Véhicule 100% électrique',
    imageAlt: 'Nettoyage vapeur professionnel BINOVYA',
    badges: {
      steam: 'VAPEUR HAUTE TEMPÉRATURE',
      eco: 'ÉCO-RESPONSABLE',
      electric: 'UTILITAIRE 100% ÉLECTRIQUE',
      natural: 'PRODUITS NATURELS',
    },
  },
  trust: {
    fast: 'Intervention rapide',
    flexible: 'Créneaux flexibles',
    payment: 'Paiement sécurisé',
  },
  services: {
    eyebrow: 'Ce que nous faisons',
    title: 'Nos services',
    subtitle: "Quatre interventions de nettoyage vapeur pour redonner à l'espace urbain toute sa propreté.",
    newBadge: 'NOUVEAU',
    items: {
      bins: {
        title: 'Nettoyage des bacs roulants',
        desc: 'Élimine saletés, bactéries et mauvaises odeurs de vos bacs roulants.',
      },
      pav: {
        title: 'Nettoyage des PAV',
        desc: "Hygiène et propreté de vos points d'apport volontaire.",
      },
      urban: {
        title: 'Mobilier urbain',
        desc: 'Bancs, abribus, potelets... retrouvent tout leur éclat.',
      },
      signage: {
        title: 'Signalisation',
        desc: 'Panneaux, plaques de rue, signalisation verticale...',
      },
    },
  },
  offers: {
    eyebrow: 'Particuliers',
    title: 'Réservez votre intervention',
    subtitle: 'Réservez simplement votre intervention en ligne en quelques clics.',
    cta: 'Réserver une intervention',
    small: {
      title: 'Petits bacs',
      desc: 'Bac de 120 à 240 L — nettoyage vapeur haute température.',
      price: 'Dès 19 €',
      priceNote: 'par passage, en formule annuelle',
      ctaAriaLabel: 'Réserver une intervention pour petits bacs',
    },
    large: {
      title: 'Grands bacs',
      badge: 'Grand format',
      desc: 'Bac de 600 à 1 100 L — nettoyage vapeur haute température.',
      price: 'Dès 29 €',
      priceNote: 'par passage, en formule annuelle',
      ctaAriaLabel: 'Réserver une intervention pour grands bacs',
    },
    features: {
      cleaning: 'Nettoyage haute pression',
      disinfection: 'Désinfection complète',
      deodorization: 'Neutralisation des odeurs',
      eco: 'Produits 100% naturels',
      hightemp: 'Vapeur haute température',
    },
  },
  proForm: {
    eyebrow: 'Professionnels & Collectivités',
    title: 'Nous contacter',
    subtitle: 'Remplissez le formulaire pour nous faire parvenir votre demande.',
    fields: {
      lastName: 'Nom',
      lastNamePlaceholder: 'Dupont',
      firstName: 'Prénom',
      firstNamePlaceholder: 'Jean',
      society: 'Société / Collectivité',
      societyPlaceholder: 'Mairie de ...',
      phone: 'Téléphone',
      phonePlaceholder: '06 XX XX XX XX',
      email: 'Email',
      emailPlaceholder: "contact{'@'}societe.fr",
      subject: 'Objet',
      subjectPlaceholder: 'Sélectionnez un objet',
      message: 'Message',
      messagePlaceholder: 'Décrivez votre besoin...',
    },
    subjects: {
      quote: 'Demande de devis',
      meeting: 'Demande de rendez-vous',
      info: "Complément d'information",
      other: 'Autre',
    },
    submit: 'ENVOYER MA DEMANDE',
    submitting: 'Envoi en cours...',
    submitAriaLabel: 'Envoyer ma demande de contact',
    success: 'Votre demande a bien été envoyée ! Nous reviendrons vers vous sous 48h.',
    error: 'Une erreur est survenue. Veuillez réessayer ou nous contacter par téléphone.',
  },
  beforeAfter: {
    imageAlt: 'Résultat avant/après nettoyage vapeur BINOVYA',
  },
  footer: {
    copyright: 'Tous droits réservés.',
    brand: {
      tagline: "L'hygiène urbaine nouvelle génération.",
    },
    social: {
      facebook: 'Suivez-nous sur Facebook',
      instagram: 'Suivez-nous sur Instagram',
      linkedin: 'Suivez-nous sur LinkedIn',
    },
    contact: {
      title: 'Nous contacter',
    },
    commitments: {
      title: 'Nos engagements',
      eco: "Respect de l'environnement",
      steam: 'Vapeur haute température',
      quality: 'Service de qualité',
    },
    info: {
      title: 'Informations',
      legal: 'Mentions légales',
      cgv: 'CGV',
      privacy: 'Politique de confidentialité',
    },
  },
  privacy,
  legal,
  faq,
  contact: {
    title: 'Contactez-nous',
    form: {
      subtitle: 'Ou remplissez le formulaire ci-dessous',
      lastName: {
        label: 'Nom',
        placeholder: 'Dupont',
      },
      firstName: {
        label: 'Prénom',
        placeholder: 'Jean',
      },
      email: {
        label: 'Adresse email',
        placeholder: "jean.dupont{'@'}exemple.fr",
      },
      phone: {
        label: 'Téléphone',
        optional: '(optionnel)',
        placeholder: '+33 6 12 34 56 78',
      },
      isBusiness: {
        label: 'Je représente une entreprise',
      },
      companyName: {
        label: "Nom de l'entreprise",
        optional: '(optionnel)',
        placeholder: 'BINOVYA SARL',
      },
      requestType: {
        label: 'Type de demande',
        placeholder: 'Sélectionnez une option',
        options: {
          demo: 'Demande de démonstration gratuite',
          callback: "Être rappelé pour plus d'informations",
          quote: 'Demande de devis',
        },
      },
      message: {
        label: 'Message',
        placeholder: 'Décrivez votre besoin...',
      },
      submit: 'Envoyer',
      submitting: 'Envoi en cours...',
      success: 'Votre message a été envoyé avec succès !',
      error: 'Une erreur est survenue. Veuillez réessayer.',
      validation: {
        lastNameRequired: 'Le nom est obligatoire',
        lastNameMin: 'Le nom doit contenir au moins 2 caractères',
        firstNameRequired: 'Le prénom est obligatoire',
        firstNameMin: 'Le prénom doit contenir au moins 2 caractères',
        emailRequired: "L'adresse email est obligatoire",
        emailInvalid: "L'adresse email n'est pas valide",
        companyNameRequired: "Le nom de l'entreprise est obligatoire",
        companyNameMin: "Le nom de l'entreprise doit contenir au moins 2 caractères",
        requestTypeRequired: 'Veuillez sélectionner un type de demande',
        messageRequired: 'Le message est obligatoire',
        messageMin: 'Le message doit contenir au moins 10 caractères',
      },
    },
    info: {
      title: 'Informations',
      address: {
        title: 'Adresse',
        line1: "Les Portes de l'Orne, Rue André Marie Ampère",
        line2: '57360 Amnéville',
      },
      phone: {
        title: 'Téléphone',
        number: '0000000',
        display: '00 00 00 00 00',
      },
      email: {
        title: 'Email',
        address: "contact{'@'}binovya.fr",
      },
      hours: {
        title: 'Horaires',
        weekdays: 'Lun - Ven : 9h00 - 18h00',
        weekend: 'Sam - Dim : Fermé',
      },
    },
  },
  about,
  booking,
  professionals,
  ...solutions,
  common: {
    logoAlt: 'Logo BINOVYA',
    backToHome: "Retour à la page d'accueil",
    language: 'Langue',
    selectLanguage: 'Sélectionner la langue',
    french: 'Français',
    english: 'English',
    required: 'obligatoire',
    skipToContent: 'Aller au contenu principal',
  },
  seo: {
    home: {
      title: 'BINOVYA - Nettoyage et désinfection de bacs à déchets',
      description:
        "BINOVYA, spécialiste du nettoyage écologique de bacs roulants, abris biodéchets et conteneurs. Service professionnel, rapide et 100% respectueux de l'environnement.",
    },
    about: {
      title: 'Qui sommes-nous ? - BINOVYA',
      description:
        "Découvrez BINOVYA, votre partenaire pour le nettoyage et la désinfection écologique de bacs à déchets. Expertise, qualité et respect de l'environnement.",
    },
    contact: {
      title: 'Contactez-nous - BINOVYA',
      description:
        "Besoin d'un devis ou d'informations ? Contactez BINOVYA pour le nettoyage professionnel de vos bacs à déchets. Réponse rapide garantie.",
    },
    faq: {
      title: 'FAQ - BINOVYA',
      description:
        'Questions fréquentes sur nos services de nettoyage de bacs à déchets. Efficacité, écologie, fréquence, durée des interventions.',
    },
    formulas: {
      title: 'Nos formules - BINOVYA',
      description:
        'Découvrez nos formules de nettoyage adaptées à tous les besoins : ponctuelle, mensuelle, trimestrielle, professionnels, collectivités et sur mesure.',
    },
    privacy: {
      title: 'Politique de confidentialité - BINOVYA',
      description:
        'Politique de confidentialité de BINOVYA. Découvrez comment nous protégeons vos données personnelles et respectons votre vie privée.',
    },
    legal: {
      title: 'Mentions légales - BINOVYA',
      description:
        "Mentions légales de BINOVYA. Informations sur notre entreprise et nos conditions d'utilisation.",
    },
    solutions: {
      rollingBins: {
        title: 'Nettoyage de bacs roulants - BINOVYA',
        description:
          'Service de nettoyage professionnel pour bacs roulants. Intérieur et extérieur, haute performance, 100% écologique. Devis gratuit.',
      },
      bioWasteShelters: {
        title: "Nettoyage d'abris biodéchets - BINOVYA",
        description:
          "Nettoyage et désinfection d'abris à biodéchets. Procédé efficace et respectueux de l'environnement pour une hygiène parfaite.",
      },
      columns: {
        title: 'Nettoyage de colonnes à déchets - BINOVYA',
        description:
          'Service de nettoyage professionnel pour colonnes et conteneurs collectifs. Eau chaude haute pression, écologique et efficace.',
      },
    },
  },
}
