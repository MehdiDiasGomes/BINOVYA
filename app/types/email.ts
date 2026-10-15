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
