import account from './fr/account'
import booking from './fr/booking'
import contact from './fr/contact'
import home from './fr/home'
import legal from './fr/legal'
import privacy from './fr/privacy'
import pro from './fr/pro'
import quote from './fr/quote'

export default {
  nav: {
    services: 'Nos services',
    quote: 'Devis',
    contact: 'Contact',
    reserver: 'Réserver',
    reserverAriaLabel: 'Réserver une intervention',
    mainNavAriaLabel: 'Navigation principale',
    menu: 'Menu',
  },
  footer: {
    heading: 'Informations sur BINOVYA',
    copyright: '© {year} BINOVYA — Tous droits réservés.',
    brand: {
      tagline: "L'hygiène urbaine nouvelle génération.",
    },
    commitments: {
      title: 'Nos engagements',
      eco: "Respect de l'environnement",
      steam: 'Vapeur haute température',
      quality: 'Service de qualité',
    },
    services: {
      title: 'Nos prestations',
    },
    contact: {
      title: 'Contact',
    },
    legal: {
      title: 'Informations légales',
    },
    links: {
      booking: 'Réserver une intervention',
      quote: 'Demander un devis',
      pricing: 'Tarifs',
      contactForm: 'Formulaire de contact',
      legal: 'Mentions légales',
      privacy: 'Politique de confidentialité',
    },
  },
  home,
  privacy,
  legal,
  contact,
  booking,
  account,
  pro,
  quote,
  common: {
    honeypot: 'Ne pas remplir ce champ',
    brandLogoLabel: 'BINOVYA',
    backToHome: "Retour à la page d'accueil",
    language: 'Langue',
    lastUpdate: 'Dernière mise à jour : {date}',
    skipToContent: 'Aller au contenu principal',
    fieldValue: '{label} : {value}',
    datePicker: {
      calendar: 'Calendrier',
      dialog: 'Choisir la date : {label}',
      placeholder: 'Choisir une date',
      previousMonth: 'Mois précédent',
      nextMonth: 'Mois suivant',
      clear: 'Effacer la date « {label} »',
      markedLegend: 'Point : jour avec au moins une intervention, à faire ou terminée',
      markedDay: '{date} | {date}, une intervention | {date}, {total} interventions',
    },
  },
  seo: {
    home: {
      title: 'BINOVYA - Nettoyage et désinfection de bacs à déchets',
      description:
        'BINOVYA, spécialiste du nettoyage écologique de bacs roulants et de conteneurs. Service professionnel et rapide.',
    },
    contact: {
      title: 'Contactez-nous - BINOVYA',
      description:
        "Besoin d'un devis ou d'informations ? Contactez BINOVYA pour le nettoyage professionnel de vos bacs à déchets.",
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
  },
}
