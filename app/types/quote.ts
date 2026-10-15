import type { BookingAddress, BookingContact, BookingPlan } from '@/types/booking'

export type QuoteContact = BookingContact & {
  company: string
}

export type QuoteEquipment = 'bins' | 'pav' | 'urban_furniture' | 'signage'

export type QuoteForm = {
  contact: QuoteContact
  address: BookingAddress | null
  equipment: QuoteEquipment[]
  smallBinCount: number
  largeBinCount: number
  plan: BookingPlan | null
  comment: string
  website: string
}

export type QuotePayload = {
  contact: Omit<QuoteContact, 'phoneCountryCode' | 'company'> & { company?: string }
  address: BookingAddress
  equipment: QuoteEquipment[]
  smallBinCount: number
  largeBinCount: number
  plan: BookingPlan | null
  comment: string
  website: string
}

export type QuoteResponse = {
  quoteId: string
}

export type QuoteField = 'contact' | 'address' | 'equipment' | 'bins'

export type QuoteErrors = Partial<Record<QuoteField, string>>

export type QuotePhotoIssue = 'tooMany' | 'tooLarge' | 'wrongType'

export type QuotePhotoPreview = {
  file: File
  url: string
}
