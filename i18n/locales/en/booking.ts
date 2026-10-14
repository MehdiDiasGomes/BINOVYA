export default {
  seo: {
    title: 'Book a cleaning - BINOVYA',
    description:
      'Book the steam cleaning of your waste bins online: choose your bins, your plan, your visit day and pay securely.',
  },
  header: {
    eyebrow: 'Individuals and businesses',
    title: 'Book your cleaning',
    subtitle: 'Four steps, about two minutes. No password to create.',
  },
  demoNotice:
    'Online payment is not enabled yet: a booking holds its slot for 35 minutes, then expires without being confirmed.',
  steps: {
    ariaLabel: 'Booking steps',
    progress: 'Step {current} of {total}',
    completed: 'step completed',
    contact: 'Your details',
    bins: 'Bins',
    schedule: 'Plan and date',
    payment: 'Payment',
  },
  headings: {
    contact: {
      title: 'Your details and address',
      description:
        'Your customer area is created automatically. You will find your bookings and the before/after photos there.',
    },
    bins: {
      title: 'Which bins should we clean?',
      description: 'Enter the number of bins of each size, then your collection days.',
    },
    schedule: {
      title: 'Your plan and visit day',
      description:
        'You pick a day, not a time slot: we come during the day. You get an email reminder before our visit.',
    },
    payment: {
      title: 'Confirmation and payment',
      description: 'Check your booking in the summary, then confirm.',
    },
  },
  actions: {
    back: 'Back',
    continue: 'Continue',
    pay: 'Pay {amount}',
    submitting: 'Saving…',
  },
  errors: {
    contact: 'Check the fields highlighted above.',
    address: 'Select an address from the list to continue.',
    outOfArea: 'This address is outside our service area.',
    addressCheck: 'Your address is still being checked, or the check failed.',
    bins: 'Add at least one bin to clean.',
    quoteRequired: 'This combination of bins requires a quote.',
    collection: 'Enter the collection day of each of the two bins, or tick "I don\'t know".',
    price: 'The price could not be calculated. Reload the page.',
    date: 'Choose a visit day in the calendar.',
    binsReady: 'You must confirm that your bins will be empty and accessible.',
    terms: 'You must accept the terms to continue.',
    dayTaken: 'This day has just been booked by someone else. Please choose another one.',
    submit: 'The booking could not be saved. Try again in a moment.',
  },
  countries: {
    FR: 'France',
    LU: 'Luxembourg',
  },
  address: {
    label: 'Address of the bins to clean',
    country: 'Country of the address',
    placeholder: {
      FR: '12 rue de la Gare, Thionville',
      LU: '24 Grand-Rue, Rumelange',
    },
    hint: 'Type at least 3 characters, then choose an address from the list.',
    listLabel: 'Suggested addresses',
    loading: 'Searching…',
    noResult: 'No address found. Check what you typed.',
    error: 'The search is unavailable right now. Try again in a moment.',
    checking: 'Checking your area…',
    checkError: 'We cannot check your address right now.',
    retry: 'Try again',
    inArea: 'Good news, we operate in {city}.',
    outOfArea: 'We do not operate in {city} yet. Our area covers {radius} km around Uckange.',
    outOfAreaCta: 'Contact us for a specific request',
  },
  bins: {
    small: {
      title: 'Small bin',
      capacity: '120 to 240 L',
    },
    large: {
      title: 'Large bin',
      capacity: '600 to 1,100 L',
    },
    decrease: 'Remove one bin: {service}',
    increase: 'Add one bin: {service}',
    quantityStatus: '{count} selected',
    quote: {
      title: 'This combination requires a quote',
      text: 'For 3 bins or more, or for a small and a large bin together, we prepare a tailored quote.',
      cta: 'Request a quote',
    },
  },
  collection: {
    hint: "Your collection days are on your municipality's collection calendar.",
    question: 'Which day is it collected?',
    household: {
      legend: 'Non-recyclable waste bin',
      lid: 'Lid often green, grey or black depending on the municipality',
    },
    recycling: {
      legend: 'Recycling bin (packaging, cardboard, paper)',
      lid: 'Lid usually yellow',
    },
    unknown: "I don't know",
  },
  plans: {
    legend: 'Your plan',
    description: 'The price shown is for one visit and depends on the plan.',
    perVisit: 'per visit',
    gridError: 'Prices are unavailable right now. Reload the page.',
    one_off: {
      title: 'One-off',
      description: 'A single visit',
    },
    quarterly: {
      title: 'Quarterly',
      description: 'One visit every 3 months',
    },
    annual: {
      title: 'Annual',
      description: 'One visit every month',
    },
  },
  date: {
    calendarLabel: 'Visit day selection',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    recommendedSuffix: ', recommended day',
    nextRecommended: 'Next recommended date',
    nextAvailable: 'Next available date',
    pickSuggested: 'Choose this date',
    selected: 'Selected day: {date}',
    legend: {
      title: 'Legend',
      recommended: 'Recommended: collection day or the day after',
      available: 'Available',
      unavailable: 'Unavailable',
    },
    whyRecommended: {
      title: 'Why these days?',
      text: 'Steam cleaning can only be done on empty bins. That is why we recommend your collection day or the day after, when your bins have just been emptied.',
    },
    notRecommended:
      'This is neither a collection day nor the day after. Your bins must be empty when we come.',
    empty: 'No day is available for your area in the coming weeks.',
    emptyCta: 'Contact us',
  },
  contact: {
    firstName: 'First name',
    firstNamePlaceholder: 'John',
    lastName: 'Last name',
    lastNamePlaceholder: 'Smith',
    email: 'Email address',
    emailPlaceholder: "john.smith{'@'}example.com",
    emailHint: 'For the confirmation and access to your customer area.',
    phone: 'Mobile phone',
    phoneCountry: 'Country calling code',
    phonePlaceholder: {
      FR: '6 12 34 56 78',
      LU: '621 123 456',
    },
    phoneHint: 'To reach you on the day of the visit if needed.',
    errors: {
      firstName: 'Enter your first name (at least 2 characters).',
      lastName: 'Enter your last name (at least 2 characters).',
      email: 'Enter a valid email address.',
      phone: 'Enter a valid French or Luxembourgish phone number.',
    },
  },
  payment: {
    binsReady: 'I confirm that my bins will be empty and accessible on the day of the visit.',
    binsReadyHint: 'You do not need to be there if the bins can be reached.',
    terms: 'I accept the terms of sale and the privacy policy.',
    termsLink: 'Read the privacy policy',
    securePayment: 'Secure payment by Stripe. No card data goes through our website.',
  },
  summary: {
    title: 'Your booking',
    address: 'Address',
    bins: 'Bins',
    plan: 'Plan',
    date: 'Visit day',
    total: 'Price per visit',
    empty: 'To be completed',
    line: '{quantity} × {service}',
    quote: 'On quote',
    taxNote: 'Prices include VAT, online payment.',
  },
  confirmation: {
    title: 'Your booking is recorded',
    text: 'A confirmation email is sent to {email}. We will come on {date}.',
    demoText:
      'Online payment is not enabled yet: this booking is not confirmed and its slot will be released automatically.',
    nextTitle: 'What happens next?',
    nextSteps: {
      reminder: 'You get an email reminder before our visit.',
      empty: 'Leave your bins empty and accessible on the day.',
      photos:
        'After the cleaning, you receive an email to see the before/after photos of your bins.',
    },
    home: 'Back to home',
    newBooking: 'New booking',
  },
}
