import account from './en/account'
import booking from './en/booking'
import contact from './en/contact'
import legal from './en/legal'
import privacy from './en/privacy'
import pro from './en/pro'
import quote from './en/quote'

export default {
  nav: {
    services: 'Our services',
    quote: 'Quote',
    contact: 'Contact',
    reserver: 'Book',
    reserverAriaLabel: 'Book an intervention',
    mainNavAriaLabel: 'Main navigation',
    menu: 'Menu',
  },
  hero: {
    eyebrow: 'Professional steam cleaning',
    titleMain: 'Urban hygiene',
    titleAccent: 'next generation',
    lead: 'We clean your waste bins, PAV, street furniture, signage and collection areas using a professional, eco-friendly method adapted to the needs of individuals, professionals and local authorities.',
    ctaReserver: 'Book an intervention',
    ctaReserverAriaLabel: 'Book an intervention online',
    ctaDevis: 'Request a quote',
    platNote: '100% electric vehicle',
    imageAlt: 'BINOVYA professional steam cleaning',
    badges: {
      steam: 'HIGH-TEMPERATURE STEAM',
      eco: 'ECO-FRIENDLY',
      electric: '100% ELECTRIC UTILITY VEHICLE',
      natural: 'NATURAL PRODUCTS',
    },
  },
  trust: {
    fast: 'Fast intervention',
    flexible: 'Flexible time slots',
    payment: 'Secure payment',
  },
  services: {
    eyebrow: 'What we do',
    title: 'Our services',
    subtitle:
      'Four steam cleaning interventions to restore urban spaces to their full cleanliness.',
    items: {
      bins: {
        title: 'Wheeled bin cleaning',
        desc: 'Eliminates dirt, bacteria and bad odors from your wheeled bins.',
      },
      pav: {
        title: 'PAV cleaning',
        desc: 'Keeping your voluntary drop-off points clean and hygienic.',
      },
      urban: {
        title: 'Street furniture',
        desc: 'Benches, bus shelters, bollards... restored to their former glory.',
      },
      signage: {
        title: 'Signage',
        desc: 'Road signs, street name plates, vertical signage...',
      },
    },
  },
  offers: {
    eyebrow: 'Individuals',
    title: 'Book your intervention',
    subtitle: 'Simply book your intervention online in just a few clicks.',
    cta: 'Book an intervention',
    small: {
      title: 'Small bins',
      desc: '120 to 240 L bin — high-temperature steam cleaning.',
      price: 'From €19',
      priceNote: 'per visit, with the annual plan',
      ctaAriaLabel: 'Book an intervention for small bins',
    },
    large: {
      title: 'Large bins',
      badge: 'Large format',
      desc: '600 to 1,100 L bin — high-temperature steam cleaning.',
      price: 'From €29',
      priceNote: 'per visit, with the annual plan',
      ctaAriaLabel: 'Book an intervention for large bins',
    },
  },
  quoteCta: {
    eyebrow: 'Professionals & Local authorities',
    title: "Have a project? Let's talk",
    subtitle:
      'Bins, drop-off points, street furniture or signage: request a quote in a few minutes, or write to us.',
    quote: 'Request a quote',
    contact: 'Contact us',
  },
  beforeAfter: {
    imageAlt: 'Before/after result of BINOVYA steam cleaning',
  },
  footer: {
    heading: 'About BINOVYA',
    copyright: '© {year} BINOVYA — All rights reserved.',
    brand: {
      tagline: 'Next-generation urban hygiene.',
    },
    contact: {
      title: 'Contact us',
    },
    commitments: {
      title: 'Our commitments',
      eco: 'Environmental respect',
      steam: 'High-temperature steam',
      quality: 'Quality service',
    },
    info: {
      title: 'Information',
      booking: 'Book an intervention',
      quote: 'Request a quote',
      contact: 'Contact form',
      legal: 'Legal notice',
      privacy: 'Privacy policy',
    },
  },
  privacy,
  legal,
  contact,
  booking,
  account,
  pro,
  quote,
  common: {
    honeypot: 'Leave this field empty',
    logoAlt: 'BINOVYA Logo',
    backToHome: 'Back to home page',
    language: 'Language',
    lastUpdate: 'Last updated: {date}',
    skipToContent: 'Skip to main content',
    fieldValue: '{label}: {value}',
    datePicker: {
      calendar: 'Calendar',
      dialog: 'Choose the date: {label}',
      placeholder: 'Pick a date',
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      clear: 'Clear the “{label}” date',
      markedLegend: 'Dot: day with at least one intervention, to do or done',
      markedDay: '{date} | {date}, one intervention | {date}, {total} interventions',
    },
  },
  seo: {
    home: {
      title: 'BINOVYA - Waste Bin Cleaning and Disinfection',
      description:
        'BINOVYA, specialist in eco-friendly cleaning of wheeled bins and containers. Professional and fast service.',
    },
    contact: {
      title: 'Contact Us - BINOVYA',
      description:
        'Need a quote or information? Contact BINOVYA for professional cleaning of your waste bins.',
    },
    privacy: {
      title: 'Privacy Policy - BINOVYA',
      description:
        'BINOVYA privacy policy. Learn how we protect your personal data and respect your privacy.',
    },
    legal: {
      title: 'Legal Notice - BINOVYA',
      description: 'BINOVYA legal notice. Information about our company and terms of use.',
    },
  },
}
