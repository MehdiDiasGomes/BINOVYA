import { Resend } from 'resend'

import type { BookingPlan } from '@/types/booking'
import type { Database } from '@/types/database.types'
import type { QuoteEquipment } from '@/types/quote'
import type { SupabaseClient } from '@supabase/supabase-js'

import { QUOTE_PHOTOS_BUCKET } from '@/constants/quote'
import { generateQuoteEmailHtml } from '@/templates/email/quoteEmail'

type QuoteNotification = {
  firstName: string
  lastName: string
  company: string
  email: string
  phone: string
  address: string
  equipment: QuoteEquipment[]
  smallBinCount: number
  largeBinCount: number
  plan: BookingPlan | null
  comment: string
  photoPaths: string[]
}

const PLAN_LABELS: Record<BookingPlan, string> = {
  one_off: 'Ponctuelle',
  quarterly: 'Trimestrielle (un passage tous les 3 mois)',
  annual: 'Annuelle (un passage chaque mois)',
}

const EQUIPMENT_LABELS: Record<QuoteEquipment, string> = {
  bins: 'Bacs roulants',
  pav: "Points d'apport volontaire",
  urban_furniture: 'Mobilier urbain',
  signage: 'Signalisation',
}

const PHOTO_LINK_LIFETIME_DAYS = 7

const PHOTO_LINK_LIFETIME_SECONDS = PHOTO_LINK_LIFETIME_DAYS * 24 * 60 * 60

const describeBins = (quote: QuoteNotification): string =>
  [
    quote.smallBinCount > 0 ? `${quote.smallBinCount} petit(s) bac(s)` : '',
    quote.largeBinCount > 0 ? `${quote.largeBinCount} grand(s) bac(s)` : '',
  ]
    .filter(text => text.length > 0)
    .join(' + ')

const signPhotoUrls = async (
  client: SupabaseClient<Database>,
  paths: string[],
): Promise<string[]> => {
  if (paths.length === 0) {
    return []
  }
  const { data } = await client.storage
    .from(QUOTE_PHOTOS_BUCKET)
    .createSignedUrls(paths, PHOTO_LINK_LIFETIME_SECONDS)
  return (data ?? []).flatMap(entry => (entry.signedUrl ? [entry.signedUrl] : []))
}

/**
 * Emails BINOVYA about a new quote request. A failure is logged and never blocks the customer:
 * the request is already saved in the database.
 * @param client - Supabase client using the secret key
 * @param quote - Quote request that was just saved
 */
export const notifyQuoteRequest = async (
  client: SupabaseClient<Database>,
  quote: QuoteNotification,
): Promise<void> => {
  const config = useRuntimeConfig()
  if (!config.resendApiKey || !config.contactEmailTo) {
    console.warn('Quote email skipped: RESEND_API_KEY or CONTACT_EMAIL_TO is not set')
    return
  }

  try {
    const html: string = generateQuoteEmailHtml(
      {
        ...quote,
        equipmentLabel: quote.equipment.map(item => EQUIPMENT_LABELS[item]).join(', '),
        binsLabel: describeBins(quote),
        planLabel: quote.plan ? PLAN_LABELS[quote.plan] : 'Pas encore décidée',
        photoLinkDays: PHOTO_LINK_LIFETIME_DAYS,
        photoUrls: await signPhotoUrls(client, quote.photoPaths),
      },
      escapeHtml,
    )
    const { error } = await new Resend(config.resendApiKey).emails.send({
      from: CONTACT_SENDER,
      to: [config.contactEmailTo],
      subject: `Demande de devis - ${quote.lastName} ${quote.firstName}`,
      html,
      replyTo: quote.email,
    })
    if (error) {
      console.error('Quote email failed', error)
    }
  } catch (error) {
    console.error('Quote email failed', error)
  }
}
