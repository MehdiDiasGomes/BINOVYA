export default {
  create: {
    seo: {
      title: 'New intervention - BINOVYA Pro',
    },
    eyebrow: 'BINOVYA Pro',
    title: 'New intervention',
    intro:
      'Create an intervention for a customer. They receive a payment link by email, or the confirmation straight away when the payment is already settled.',
    sections: {
      customer: 'Customer',
      address: 'Intervention address',
      bins: 'Bins and plan',
      date: 'Date',
      payment: 'Payment',
    },
    customer: {
      emailHint:
        'If a customer account already uses this address, the intervention is linked to it and its details are not changed.',
    },
    bins: {
      legend: 'Bins to clean',
      hint: 'Up to {max} bins of each size. Beyond that, or for a small and a large bin together, choose « Quote ».',
      quoteHint: 'Up to {max} bins of each size, at the quote price.',
      clampedHint:
        'The quantities entered for the quote were reduced to {max} per size. Switch back to « Quote » to get them back.',
      typedClamped: '{service}: quantity set to {max}, the maximum per size.',
    },
    priceSource: {
      legend: 'Pricing',
      grid: {
        label: 'Price grid',
        hint: 'The price depends on the bins and the plan.',
      },
      quote: {
        label: 'Quote',
        hint: 'You set the price agreed with the customer.',
      },
    },
    quoteAmount: {
      label: 'Quote price per visit, in euros',
      hint: 'Amount including VAT, for example 120.50.',
    },
    note: {
      label: 'Internal note (optional)',
      hint: 'Only visible in BINOVYA Pro, never to the customer. {maxLength} characters at most.',
    },
    recreate: {
      loading: 'Loading the intervention to create again…',
      loaded: 'Form filled with the intervention of {name} whose link expired. Choose a new date.',
      loadError: 'The intervention to create again could not be loaded: the form is empty.',
    },
    date: {
      label: 'Intervention date',
    },
    mode: {
      legend: 'Payment method',
      payment_link: {
        label: 'Send a payment link',
        hint: 'The customer receives a Stripe payment link by email. The date is held for them for about {hours} hours, until they pay.',
      },
      offline: {
        label: 'Paid outside the site',
        hint: 'Cash, bank transfer… The intervention is confirmed right away and the customer receives the confirmation by email.',
      },
    },
    price: {
      label: 'Price per visit',
      quoteLabel: 'Quote price, per visit',
      unknown: 'To be set',
    },
    cancel: 'Cancel',
    submit: {
      payment_link: 'Create and send the payment link',
      offline: 'Create the paid intervention',
    },
    submitting: 'Creating…',
    submittingStatus: 'Creating the intervention…',
    force: 'Force anyway',
    success: {
      payment_link:
        'Intervention for {name} created, scheduled on {date}. The payment link is emailed to the customer.',
      offline:
        'Intervention for {name} created, scheduled on {date} and paid outside the site. The customer receives the confirmation by email.',
    },
    replayed:
      'Intervention for {name} already created, scheduled on {date}: it was not created a second time.',
    emailFailed: {
      payment_link: 'The email could not be sent: resend the payment link from this page.',
      offline: 'The confirmation email could not be sent to the customer.',
    },
    errors: {
      address: 'Search for the address, then choose it in the list.',
      bins: 'Add at least one bin.',
      quoteRequired: 'This combination of bins has no price: choose « Quote ».',
      quoteAmount: 'Enter the quote price in euros, {maxAmount} at most.',
      note: 'The internal note cannot exceed {maxLength} characters.',
      date: 'Choose the date of the intervention.',
      outOfArea: 'This address is outside the service area. You can force the creation.',
      dayClosed: 'This day is closed. You can force the creation.',
      dayFull: 'This day is full. You can force the creation.',
      outOfSector:
        'This day is reserved for another sector, too far from this address. You can force the creation.',
      invalidInput: 'Some details are not valid. Check the form.',
      invalidAddress: 'This address has expired. Search for it again, then choose it in the list.',
      invalidQuantities: 'Choose at most {max} bins of each size.',
      invalidQuoteAmount: 'The quote price is not valid: enter an amount of {maxAmount} at most.',
      customerNotFound: 'The customer account could not be found. Try again in a moment.',
      customerPending:
        'This customer already has a pending payment. Wait until they pay or the delay expires before sending a new link.',
      pastDate: 'An intervention cannot be created in the past.',
      tooFar: 'Choose a date no later than {date}.',
      paymentLinkFailed:
        'The payment link could not be created: the intervention was not saved. Try again in a moment.',
      requestInProgress:
        'Creation in progress: the intervention is being saved. Reload the list of interventions in a moment.',
      generic: 'The intervention could not be created. Try again in a moment.',
      timeout:
        'The answer is taking long. The intervention may have been created: check the list of interventions before trying again.',
    },
  },
  paymentLink: {
    text: 'The customer received a payment link by email. Without payment before {deadline}, the date is released.',
    textNoDeadline: 'The customer received a payment link by email.',
    resend: 'Resend the payment link',
    resending: 'Sending…',
    sent: 'Payment link emailed to the customer again.',
    errors: {
      notFound: 'This intervention no longer exists.',
      notPending: 'This intervention is no longer awaiting payment.',
      linkExpired: 'The payment delay is over: the date was released.',
      noLink: 'No payment link exists for this intervention.',
      tooFrequent: 'The link was already resent {max} times within the hour. Try again later.',
      linkUnavailable:
        'This payment link is no longer valid. Create a new intervention for this customer.',
      emailFailed: 'The email could not be sent. Try again in a moment.',
      generic: 'The link could not be resent. Try again in a moment.',
      timeout:
        'The answer is taking long: the link may have been resent. Check with the customer before trying again.',
    },
  },
}
