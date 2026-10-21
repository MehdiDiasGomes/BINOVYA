export default {
  photos: {
    kinds: {
      before: 'Before photo',
      after: 'After photo',
    },
    names: {
      before: 'before photo',
      after: 'after photo',
    },
    kindContext: {
      before: 'the before photo {context}',
      after: 'the after photo {context}',
    },
    added: 'Added',
    missing: 'Missing',
    add: 'Add',
    replace: 'Replace',
    preparing: 'Preparing…',
    uploading: 'Sending…',
    previewAlt: '{kind} sent',
    fileLabel: 'Choose a photo',
    preparingStatus: 'Preparing the {name}…',
    uploadingStatus: 'Sending the {name}…',
    saved: '{kind} saved.',
    replaced: '{kind} replaced.',
    errors: {
      notFound: 'This intervention no longer exists. Reload the page.',
      notPaid: 'Only an intervention to do or done can get photos.',
      futureDate: 'Photos can be added from the day of the intervention. Reload the page.',
      invalidKind: 'This photo could not be saved. Reload the page.',
      invalidImage: 'The file sent is not a valid image. Choose another photo.',
      tooLarge: 'This photo is too heavy, even reduced. Choose another photo.',
      unreadable:
        'The browser cannot read this image. Take the photo with the camera or choose another one.',
      generic: 'The {name} could not be saved. Try again in a moment.',
      timeout:
        'The answer is slow. The {name} may have been saved: the page is refreshed, check it before sending it again.',
    },
  },
  complete: {
    action: 'Finish the intervention',
    title: 'Finish the intervention?',
    forceTitle: 'Finish without photos?',
    subject: '{name}, {address}.',
    withPhotos:
      'The customer will get an email saying that their before/after photos are available in their customer area.',
    withoutPhotos:
      '{missing} is missing. The customer will get an email saying the intervention is finished, without photos, even if you add them later.',
    missing: {
      before: 'The before photo',
      after: 'The after photo',
      both: 'Each photo',
      unknown: 'At least one photo',
    },
    cancel: 'Cancel',
    submit: 'Finish the intervention',
    force: 'Finish without photos',
    submitting: 'Saving…',
    submittingStatus: 'Finishing the intervention…',
    success:
      'Intervention for {name} finished. The customer is told by email that their photos are available.',
    successWithoutPhotos:
      'Intervention for {name} finished without photos. The customer is told by email.',
    completedWithoutPhotos:
      'Finished without photos: photos added now stay visible in the customer area, with no email.',
    errors: {
      notFound: 'This intervention no longer exists. The page will be refreshed when you close.',
      alreadyCompleted:
        'This intervention is already finished. The page will be refreshed when you close.',
      notPaid:
        'Only an intervention to do can be finished. The page will be refreshed when you close.',
      futureDate: 'An intervention cannot be finished before its day.',
      missingPhotos:
        'A photo is still missing. You can finish without photos, or cancel and add it.',
      generic: 'The intervention could not be finished. Try again in a moment.',
      timeout:
        'The answer is slow. The intervention may have been finished: the page will be refreshed when you close.',
    },
  },
}
