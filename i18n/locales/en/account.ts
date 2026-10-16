export default {
  nav: 'Customer area',
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
    title: 'Visit on {date}',
    date: 'Visit day',
    address: 'Address',
    services: 'Service',
    plan: 'Plan',
    amount: 'Amount paid',
    status: 'Status',
    statuses: {
      paid: 'Confirmed, visit upcoming',
      completed: 'Cleaning done',
      cancelled: 'Cancelled',
    },
  },
  photos: {
    title: 'Before/after photos',
    pending: 'Your before/after photos will be available soon.',
    kinds: {
      before: 'Before',
      after: 'After',
    },
    alt: {
      before: 'Your bins before the cleaning on {date}',
      after: 'Your bins after the cleaning on {date}',
    },
    enlarge: 'Enlarge the « {kind} » photo from {date}',
    dialogLabel: 'Enlarged photo: {kind}, {date}',
    loadError: 'The « {kind} » photo could not be displayed. Reload the page to try again.',
    close: 'Close the photo',
    expiryHint: 'Photos are shown through a temporary link: reload the page if it has expired.',
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
