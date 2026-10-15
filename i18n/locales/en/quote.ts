export default {
  seo: {
    title: 'Request a quote - BINOVYA',
    description:
      'Request a quote for steam cleaning your bins, drop-off points, street furniture or signage. Answer within 48 hours.',
  },
  header: {
    eyebrow: 'Quote',
    title: 'Request your quote',
    subtitle:
      'Several bins, mixed sizes, drop-off points, street furniture or signage: describe your needs, we prepare a tailored offer.',
  },
  sections: {
    contact: 'Your details',
    address: 'Service address',
    bins: 'Your bins',
  },
  fields: {
    company: 'Company or local authority (optional)',
    companyPlaceholder: 'BINOVYA SAS',
  },
  equipment: {
    legend: 'Equipment to clean',
    description: 'Tick everything your request covers.',
    items: {
      bins: 'Wheelie bins',
      pav: 'Drop-off points',
      urban_furniture: 'Street furniture',
      signage: 'Signage',
    },
  },
  plan: {
    legend: 'Preferred frequency',
    description: 'A rough idea is enough, we will discuss it with you.',
    undecided: 'Not decided yet',
  },
  comment: {
    label: 'Comment (optional)',
    placeholder: 'Access to the bins, number of sites, special constraints…',
  },
  photos: {
    legend: 'Photos (optional)',
    hint: 'Up to {count} photos of {size} MB maximum (JPEG, PNG or WebP). They help us prepare the quote.',
    add: 'Add photos',
    remove: 'Remove photo {name}',
    previewAlt: 'Preview of photo {index}: {name}',
    issues: {
      tooMany: 'You can add {count} photos at most.',
      tooLarge: 'A photo exceeds the maximum size of {size} MB.',
      wrongType: 'Only JPEG, PNG or WebP photos are accepted.',
    },
  },
  errors: {
    contact: 'Check your details: first name, last name, email and phone.',
    address: 'Select an address from the list.',
    bins: 'Enter at least one bin.',
    equipment: 'Tick at least one type of equipment.',
    company: 'The company name must not exceed {max} characters.',
    submit: 'Your request could not be sent. Try again in a moment.',
  },
  actions: {
    submit: 'Send my request',
    submitting: 'Sending…',
  },
  sent: {
    title: 'Your request has been sent',
    text: 'Thank you, we have received your quote request. We will get back to you quickly, by email or phone.',
  },
}
