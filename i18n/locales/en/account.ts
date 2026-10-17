export default {
  nav: 'Customer area',
  navAdmin: 'Admin area',
  login: {
    seo: {
      title: 'Customer area - BINOVYA',
      description:
        'Access your BINOVYA bookings and the before/after photos of your bins with a login link sent by email.',
    },
    eyebrow: 'Customer area',
    title: 'Access my area',
    subtitle:
      'No password: enter the email address used for your booking and we will send you a login link.',
    sessionExpired: 'Your session has expired. For your security, log in again with a new link.',
    formLabel: 'Login link request',
    email: 'Email address',
    emailPlaceholder: "john.smith{'@'}example.com",
    emailHint: 'The address you gave when booking.',
    submit: 'Send me a login link',
    submitting: 'Sending…',
    submittingStatus: 'Requesting a login link…',
    errors: {
      email: 'Enter a valid email address.',
      submit: 'Your request could not be sent. Please try again in a moment.',
    },
    sent: {
      title: 'Check your inbox',
      text: 'If an area exists for this address, a login link has just been sent to it.',
      stepsTitle: 'What next?',
      steps: {
        open: 'Open the email (sent in French) titled « Votre lien de connexion à votre espace BINOVYA ».',
        spam: 'Cannot see it? Check your spam folder, it may take a few minutes to arrive.',
        validity:
          'Click the « Me connecter » (log in) button: the link is valid for {hours} hours and works only once.',
      },
      noBooking: 'No booking yet? Your area opens with your first booking.',
      bookingCta: 'Book a cleaning',
      retry: 'Use another address',
    },
  },
  confirm: {
    seo: {
      title: 'Logging in - BINOVYA',
    },
    heading: 'Logging in to your customer area',
    verifying: 'Logging in to your area…',
    failedTitle: 'This login link no longer works',
    failedText:
      'It may have expired ({hours} hours) or already been used. No worries, request a new one in a few seconds:',
    steps: {
      open: 'Open the « Customer area » page.',
      email: 'Enter the email address used for your booking.',
      click: 'Open the new email (sent in French) and click « Me connecter » (log in).',
    },
    loginCta: 'Get a new link',
  },
  dashboard: {
    seo: {
      title: 'My customer area - BINOVYA',
    },
    eyebrow: 'Customer area',
    greeting: 'Hello {name}',
    greetingFallback: 'Hello',
    subtitle: 'Find your bookings and the before/after photos of your bins here.',
    loading: 'Loading your bookings…',
    loadError: 'Your bookings could not be loaded.',
    retry: 'Try again',
    signOut: 'Log out',
    signingOut: 'Logging out…',
    bookingsTitle: 'My bookings',
    empty: {
      title: 'No bookings yet',
      text: 'Your paid bookings will appear here.',
      cta: 'Book a cleaning',
    },
  },
  booking: {
    services: 'Service',
    plan: 'Plan',
    amount: 'Amount paid',
    refunded: 'Refunded',
    statuses: {
      paid: 'Upcoming',
      completed: 'Done',
      cancelled: 'Cancelled and refunded',
    },
    reminder: {
      title: 'Empty your bins the day before',
      text: 'We cannot clean a full bin. A reminder will be sent to you by email.',
    },
    view: 'View booking',
    viewContext: 'on {date}',
  },
  detail: {
    seo: {
      title: 'My booking - BINOVYA',
    },
    back: 'Back to my bookings',
    eyebrow: 'Customer area',
    titleFallback: 'My booking',
    title: 'My booking on {date}',
    loading: 'Loading your booking…',
    loadError: 'Your booking could not be loaded.',
    retry: 'Try again',
    notFound: {
      title: 'Booking not found',
      text: 'This booking does not exist or is not linked to your customer area.',
    },
    summaryTitle: 'Summary',
    date: 'Date',
    address: 'Address',
    photos: {
      title: 'Before/after photos',
      text: 'BINOVYA will add the photos of your bins here after the cleaning.',
      kinds: {
        before: 'Before photo',
        after: 'After photo',
      },
      placeholder: 'No photo yet',
    },
    invoice: {
      title: 'Invoice',
      soon: 'Available soon',
    },
    rebook: 'Book another date',
  },
  deletion: {
    title: 'Delete my customer area',
    text: 'You can request the deletion of your area and of your personal data.',
    request: 'Request deletion',
    confirmTitle: 'Confirm the deletion request',
    confirmText:
      'Your request is sent to BINOVYA and handled within one month. Paid bookings are kept for as long as our accounting obligations require.',
    confirm: 'Yes, request deletion',
    cancel: 'Cancel',
    submitting: 'Sending the request…',
    error: 'Your request could not be sent. Please try again in a moment.',
    doneTitle: 'Request received',
    doneText:
      'Your deletion request of {date} has been received. It will be handled within one month.',
  },
}
