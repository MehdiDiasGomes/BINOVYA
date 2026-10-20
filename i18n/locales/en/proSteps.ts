export default {
  progress: {
    todo: 'To do',
    beforeDone: 'Before photo taken',
    afterDone: 'After photo taken',
    photosDone: 'Photos taken',
    completed: 'Finished',
    completedWithoutPhotos: 'Finished without photos',
    cancelled: 'Cancelled',
  },
  card: {
    actions: {
      start: 'Start',
      continue: 'Continue',
      view: 'View',
    },
    subject: 'the intervention for {name}',
    subjectDated: 'the intervention for {name} on {date}',
    moreName: 'More actions for {subject}',
  },
  steps: {
    seo: {
      title: 'Intervention - BINOVYA Pro',
    },
    eyebrow: 'Intervention',
    titleFallback: 'Intervention',
    backPlanning: 'Back to the planning',
    backList: 'Back to the interventions',
    loading: 'Loading the intervention…',
    loadError: 'The intervention could not be loaded.',
    notFound: {
      title: 'Intervention not found',
      text: 'This intervention does not exist or no longer appears in BINOVYA Pro.',
    },
    progressLabel: 'Intervention steps',
    counter: 'Step {current} of {total}',
    announce: 'Step {current} of {total}: {name}',
    headingPrefix: 'Step {current} of {total}:',
    names: {
      directions: 'Directions',
      before: 'Before photo',
      after: 'After photo',
      recap: 'Summary',
    },
    states: {
      done: 'done',
      skipped: 'skipped',
      current: 'current',
      todo: 'to do',
    },
    stepNumber: 'Step {number}:',
    next: {
      before: 'Go to the after photo',
      after: 'See the summary',
    },
    skip: 'Skip this photo',
    directions: {
      addressLabel: 'Address:',
      call: 'Call {name} on {phone}',
      arrived: "I'm on site",
    },
    photo: {
      text: {
        before: 'Take the photo of the bins before cleaning.',
        after: 'Take the photo of the bins after cleaning.',
      },
      toClean: 'To clean',
      skipWarning:
        'Without both photos, the intervention is finished without a photos email to the customer.',
      skipConfirm: 'Yes, skip',
      skipCancel: 'Cancel',
    },
    photoError: {
      link: 'Go to the step: {name}',
    },
    recap: {
      text: 'Check the photos, then finish the intervention.',
      missing: '{missing} is missing: the customer will not receive a photos email.',
      uploading: 'Wait until the photo is sent to finish.',
    },
    completed: {
      title: 'Intervention finished',
      withPhotos: 'The customer is told by email that their photos are available.',
      withoutPhotos: 'Finished without photos: no email is sent to the customer.',
      recapTitle: 'Summary',
      recapText: 'You can replace a photo at any time, without a new email to the customer.',
    },
    upcoming: {
      title: 'Upcoming intervention',
      text: 'The steps open on the day of the intervention, {date}.',
    },
    cancelled: {
      title: 'Intervention cancelled',
      text: 'This intervention was cancelled and refunded.',
    },
    details: {
      toggle: 'More info',
    },
  },
}
