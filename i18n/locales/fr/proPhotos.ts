export default {
  photos: {
    kinds: {
      before: 'Photo avant',
      after: 'Photo après',
    },
    names: {
      before: 'photo avant',
      after: 'photo après',
    },
    kindContext: {
      before: 'la photo avant {context}',
      after: 'la photo après {context}',
    },
    added: 'Ajoutée',
    missing: 'Manquante',
    add: 'Ajouter',
    replace: 'Remplacer',
    preparing: 'Préparation…',
    uploading: 'Envoi…',
    previewAlt: '{kind} envoyée',
    fileLabel: 'Choisir une photo',
    preparingStatus: 'Préparation de la {name}…',
    uploadingStatus: 'Envoi de la {name}…',
    saved: '{kind} enregistrée.',
    replaced: '{kind} remplacée.',
    errors: {
      notFound: 'Cette intervention n’existe plus. Rechargez la page.',
      notPaid: 'Seule une intervention à réaliser ou réalisée peut recevoir des photos.',
      futureDate: 'Les photos s’ajoutent à partir du jour de l’intervention. Rechargez la page.',
      invalidKind: 'Cette photo n’a pas pu être enregistrée. Rechargez la page.',
      invalidImage: 'Le fichier envoyé n’est pas une image valide. Choisissez une autre photo.',
      tooLarge: 'Cette photo est trop lourde, même réduite. Choisissez une autre photo.',
      unreadable:
        'Cette image ne peut pas être lue par le navigateur. Prenez la photo avec l’appareil photo ou choisissez-en une autre.',
      generic: 'La {name} n’a pas pu être enregistrée. Réessayez dans un instant.',
      timeout:
        'La réponse tarde. La {name} a peut-être été enregistrée : la page est actualisée, vérifiez avant de la renvoyer.',
    },
  },
  complete: {
    action: 'Terminer l’intervention',
    title: 'Terminer l’intervention ?',
    forceTitle: 'Terminer sans photos ?',
    subject: '{name}, {address}.',
    withPhotos:
      'Le client recevra un mail l’informant que ses photos avant/après sont disponibles dans son espace client.',
    withoutPhotos:
      'Il manque {missing}. Le client recevra un mail l’informant que l’intervention est terminée, sans photos, même si vous les ajoutez plus tard.',
    missing: {
      before: 'la photo avant',
      after: 'la photo après',
      both: 'les photos avant et après',
      unknown: 'au moins une photo',
    },
    cancel: 'Annuler',
    submit: 'Terminer l’intervention',
    force: 'Terminer sans photos',
    submitting: 'Enregistrement…',
    submittingStatus: 'Fin de l’intervention en cours…',
    success:
      'Intervention de {name} terminée. Le client est prévenu par mail que ses photos sont disponibles.',
    successWithoutPhotos:
      'Intervention de {name} terminée sans photos. Le client est prévenu par mail.',
    completedWithoutPhotos:
      'Terminée sans photos : les photos ajoutées maintenant restent visibles dans l’espace client, sans mail.',
    errors: {
      notFound: 'Cette intervention n’existe plus. La page sera actualisée à la fermeture.',
      alreadyCompleted:
        'Cette intervention est déjà terminée. La page sera actualisée à la fermeture.',
      notPaid:
        'Seule une intervention à réaliser peut être terminée. La page sera actualisée à la fermeture.',
      futureDate: 'Une intervention ne peut pas être terminée avant son jour.',
      missingPhotos:
        'Une photo manque encore. Vous pouvez terminer sans photos, ou annuler et l’ajouter.',
      generic: 'L’intervention n’a pas pu être terminée. Réessayez dans un instant.',
      timeout:
        'La réponse tarde. L’intervention a peut-être été terminée : la page sera actualisée à la fermeture.',
    },
  },
}
