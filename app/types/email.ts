import type { BookingPlan } from '@/types/booking'
import type { Database } from '@/types/database.types'

export type BookingEmailData = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  scheduledDate: string
  address: string
  plan: BookingPlan
  smallBinCount: number
  largeBinCount: number
  amountTotalCents: number
}

export type CustomerEmailRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'email' | 'first_name' | 'last_name' | 'phone'
>

export type BookingEmailContent = {
  subject: string
  html: string
}

export type ReminderRunResult = {
  sent: number
  failed: number
}

export type MailTransport = 'resend' | 'outbox'

export type MailOutboxRecord = {
  id: string
  to: string
  from: string
  subject: string
  html: string
  replyTo: string | null
  idempotencyKey: string | null
  logLabel: string
  sentAt: string
}

export type MailTransportEnvironment = {
  isDev: boolean
  nodeEnv: string | undefined
}

export type MailRedirectEnvironment = MailTransportEnvironment & {
  transport: MailTransport | null
}
