import about from './en/about'
import booking from './en/booking'
import faq from './en/faq'
import legal from './en/legal'
import privacy from './en/privacy'
import professionals from './en/professionals'
import quote from './en/quote'
import solutions from './en/solutions'

export default {
  nav: {
    home: 'Home',
    services: 'Our services',
    particuliers: 'Individuals',
    pro: 'Professionals & Authorities',
    contact: 'Contact',
    reserver: 'Book',
    reserverAriaLabel: 'Book an intervention',
    mainNavAriaLabel: 'Main navigation',
    mobileNavAriaLabel: 'Mobile navigation menu',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    menu: 'Menu',
  },
  hero: {
    tagline: 'Next-generation urban hygiene',
    eyebrow: 'Professional steam cleaning',
    titleMain: 'Urban hygiene',
    titleAccent: 'next generation',
    lead: 'We clean your waste bins, PAV, street furniture, signage and collection areas using a professional, eco-friendly method adapted to the needs of individuals, professionals and local authorities.',
    ctaReserver: 'Book an intervention',
    ctaReserverAriaLabel: 'Book an intervention online',
    ctaDevis: 'Request a quote',
    ctaDevisAriaLabel: 'Contact us for a professional quote',
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
    subtitle: 'Four steam cleaning interventions to restore urban spaces to their full cleanliness.',
    newBadge: 'NEW',
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
    features: {
      cleaning: 'High-pressure cleaning',
      disinfection: 'Complete disinfection',
      deodorization: 'Odor neutralization',
      eco: '100% natural products',
      hightemp: 'High-temperature steam',
    },
  },
  proForm: {
    eyebrow: 'Professionals & Authorities',
    title: 'Contact us',
    subtitle: 'Fill in the form to send us your request.',
    fields: {
      lastName: 'Last name',
      lastNamePlaceholder: 'Smith',
      firstName: 'First name',
      firstNamePlaceholder: 'John',
      society: 'Company / Authority',
      societyPlaceholder: 'City of ...',
      phone: 'Phone',
      phonePlaceholder: '+44 XX XX XX XX',
      email: 'Email',
      emailPlaceholder: "contact{'@'}company.com",
      subject: 'Subject',
      subjectPlaceholder: 'Select a subject',
      message: 'Message',
      messagePlaceholder: 'Describe your needs...',
    },
    subjects: {
      quote: 'Quote request',
      meeting: 'Meeting request',
      info: 'Additional information',
      other: 'Other',
    },
    submit: 'SEND MY REQUEST',
    submitting: 'Sending...',
    submitAriaLabel: 'Send my contact request',
    success: 'Your request has been sent! We will get back to you within 48 hours.',
    error: 'An error occurred. Please try again or contact us by phone.',
  },
  beforeAfter: {
    imageAlt: 'Before/after result of BINOVYA steam cleaning',
  },
  footer: {
    copyright: 'All rights reserved.',
    brand: {
      tagline: 'Next-generation urban hygiene.',
    },
    social: {
      facebook: 'Follow us on Facebook',
      instagram: 'Follow us on Instagram',
      linkedin: 'Follow us on LinkedIn',
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
      legal: 'Legal notice',
      cgv: 'Terms of sale',
      privacy: 'Privacy policy',
    },
  },
  privacy,
  legal,
  faq,
  contact: {
    title: "Let's Get In Touch",
    form: {
      subtitle: 'Or fill out the form below',
      lastName: {
        label: 'Last Name',
        placeholder: 'Smith',
      },
      firstName: {
        label: 'First Name',
        placeholder: 'John',
      },
      email: {
        label: 'Email Address',
        placeholder: "john.smith{'@'}example.com",
      },
      phone: {
        label: 'Phone',
        optional: '(optional)',
        placeholder: '+1 234 567 8900',
      },
      isBusiness: {
        label: 'I represent a business',
      },
      companyName: {
        label: 'Company Name',
        optional: '(optional)',
        placeholder: 'BINOVYA LLC',
      },
      requestType: {
        label: 'Request Type',
        placeholder: 'Select an option',
        options: {
          demo: 'Free demonstration request',
          callback: 'Request a callback for more information',
          quote: 'Request a quote',
        },
      },
      message: {
        label: 'Message',
        placeholder: 'Describe your needs...',
      },
      submit: 'Submit',
      submitting: 'Submitting...',
      success: 'Your message has been sent successfully!',
      error: 'An error occurred. Please try again.',
      validation: {
        lastNameRequired: 'Last name is required',
        lastNameMin: 'Last name must be at least 2 characters',
        firstNameRequired: 'First name is required',
        firstNameMin: 'First name must be at least 2 characters',
        emailRequired: 'Email address is required',
        emailInvalid: 'Email address is invalid',
        companyNameRequired: 'Company name is required',
        companyNameMin: 'Company name must be at least 2 characters',
        requestTypeRequired: 'Please select a request type',
        messageRequired: 'Message is required',
        messageMin: 'Message must be at least 10 characters',
      },
    },
    info: {
      title: 'Information',
      address: {
        title: 'Address',
        line1: "Les Portes de l'Orne, Rue André Marie Ampère",
        line2: '57360 Amnéville, France',
      },
      phone: {
        title: 'Phone',
        number: '0000000',
        display: '00 00 00 00 00',
      },
      email: {
        title: 'Email',
        address: "contact{'@'}binovya.fr",
      },
      hours: {
        title: 'Business Hours',
        weekdays: 'Mon - Fri: 9:00 AM - 6:00 PM',
        weekend: 'Sat - Sun: Closed',
      },
    },
  },
  about,
  booking,
  professionals,
  quote,
  ...solutions,
  common: {
    logoAlt: 'BINOVYA Logo',
    backToHome: 'Back to home page',
    language: 'Language',
    selectLanguage: 'Select language',
    french: 'Français',
    english: 'English',
    required: 'required',
    skipToContent: 'Skip to main content',
  },
  seo: {
    home: {
      title: 'BINOVYA - Waste Bin Cleaning and Disinfection',
      description:
        'BINOVYA, specialist in eco-friendly cleaning of wheeled bins, bio-waste shelters and containers. Professional, fast and 100% environmentally friendly service.',
    },
    about: {
      title: 'About Us - BINOVYA',
      description:
        'Discover BINOVYA, your partner for eco-friendly cleaning and disinfection of waste bins. Expertise, quality and environmental respect.',
    },
    contact: {
      title: 'Contact Us - BINOVYA',
      description:
        'Need a quote or information? Contact BINOVYA for professional cleaning of your waste bins. Fast response guaranteed.',
    },
    faq: {
      title: 'FAQ - BINOVYA',
      description:
        'Frequently asked questions about our waste bin cleaning services. Effectiveness, ecology, frequency, service duration.',
    },
    formulas: {
      title: 'Our Plans - BINOVYA',
      description:
        'Discover our cleaning plans tailored to all needs: one-time, monthly, quarterly, professional, municipal and custom.',
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
    solutions: {
      rollingBins: {
        title: 'Wheeled Bin Cleaning - BINOVYA',
        description:
          'Professional cleaning service for wheeled bins. Interior and exterior, high performance, 100% eco-friendly. Free quote.',
      },
      bioWasteShelters: {
        title: 'Bio-Waste Shelter Cleaning - BINOVYA',
        description:
          'Cleaning and disinfection of bio-waste shelters. Efficient and environmentally friendly process for perfect hygiene.',
      },
      columns: {
        title: 'Waste Column Cleaning - BINOVYA',
        description:
          'Professional cleaning service for columns and bulk containers. Hot water high pressure, eco-friendly and efficient.',
      },
    },
  },
}
