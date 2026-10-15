import { Resend } from 'resend'

import type { ContactResponse, ContactSubject } from '@/types/contact'

import { generateContactEmailHtml } from '@/templates/email/contactEmail'
import { contactRequestSchema } from '@/utils/contactValidation'

const MAX_BODY_BYTES = 16 * 1024

const SUBJECT_LABELS: Record<ContactSubject, string> = {
  meeting: 'Demande de rendez-vous',
  info: "Complément d'information",
  other: 'Autre',
}

export default defineEventHandler(async (event): Promise<ContactResponse> => {
  assertBodySize(event, MAX_BODY_BYTES)
  const result = await readValidatedBody(event, body => contactRequestSchema.safeParse(body))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid contact request' })
  }

  const { website, subject, ...body } = result.data
  if (website) {
    return { success: true }
  }

  const config = useRuntimeConfig()
  if (!config.resendApiKey || !config.contactEmailTo) {
    console.warn('Contact email skipped: RESEND_API_KEY or CONTACT_EMAIL_TO is not set')
    throw createError({ statusCode: 503, statusMessage: 'Contact form unavailable' })
  }

  const subjectLabel: string = SUBJECT_LABELS[subject]
  const { error } = await new Resend(config.resendApiKey).emails.send({
    from: CONTACT_SENDER,
    to: [config.contactEmailTo],
    subject: `Nouveau contact : ${subjectLabel} - ${body.lastName} ${body.firstName}`,
    html: generateContactEmailHtml({ ...body, subjectLabel }, escapeHtml),
    replyTo: body.email,
  })
  if (error) {
    console.error('Contact email failed', error)
    throw createError({ statusCode: 502, statusMessage: 'Contact email failed' })
  }

  return { success: true }
})
