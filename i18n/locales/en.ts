import account from './en/account'
import booking from './en/booking'
import contact from './en/contact'
import home from './en/home'
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
  footer: {
    heading: 'About BINOVYA',
    copyright: '© {year} BINOVYA — All rights reserved.',
    brand: {
      tagline: 'Next-generation urban hygiene.',
    },
    commitments: {
      title: 'Our commitments',
      eco: 'Environmental respect',
      steam: 'High-temperature steam',
      quality: 'Quality service',
    },
    services: {
      title: 'What we offer',
    },
    contact: {
      title: 'Contact',
    },
    legal: {
      title: 'Legal information',
    },
    links: {
      booking: 'Book an intervention',
      quote: 'Request a quote',
      pricing: 'Pricing',
      contactForm: 'Contact form',
      legal: 'Legal notice',
      privacy: 'Privacy policy',
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
    honeypot: 'Leave this field empty',
    brandLogoLabel: 'BINOVYA',
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
