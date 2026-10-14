import { Resend } from 'resend'

import { generateContactEmailHtml } from '@/templates/email/contactEmail'

type ContactFormData = {
  lastName: string
  firstName: string
  society?: string
  phone?: string
  email: string
  subject: string
  message: string
}

export default defineEventHandler(async event => {
  const config = useRuntimeConfig()
  const body = await readBody<ContactFormData>(event)

  if (!body.lastName || !body.firstName || !body.email || !body.subject || !body.message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields',
    })
  }

  const emailRegex = /^[\w%+.-]+@[\d.A-Za-z-]+\.[A-Za-z]{2,}$/
  if (!emailRegex.test(body.email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid email address',
    })
  }

  try {
    const resend = new Resend(config.resendApiKey)

    const subjectLabels: Record<string, string> = {
      quote: 'Demande de devis',
      meeting: 'Demande de rendez-vous',
      info: "Complément d'information",
      other: 'Autre',
    }

    const subjectLabel = subjectLabels[body.subject] ?? body.subject

    const emailHtml = generateContactEmailHtml({
      lastName: body.lastName,
      firstName: body.firstName,
      society: body.society,
      phone: body.phone,
      email: body.email,
      subjectLabel,
      message: body.message,
    })

    const { data, error } = await resend.emails.send({
      from: CONTACT_SENDER,
      to: [config.contactEmailTo],
      subject: `Nouveau contact: ${subjectLabel} - ${body.lastName} ${body.firstName}`,
      html: emailHtml,
      replyTo: body.email,
    })

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to send email',
        data: error,
      })
    }

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      cause: err,
    })
  }
})
