import type { CountryCode } from '@/types/booking'

export type ContactSubject = 'meeting' | 'info' | 'other'

export type ContactForm = {
  firstName: string
  lastName: string
  company: string
  email: string
  phone: string
  phoneCountryCode: CountryCode
  subject: ContactSubject | ''
  message: string
  website: string
}

export type ContactPayload = Omit<ContactForm, 'phoneCountryCode'>

export type ContactField =
  | 'firstName'
  | 'lastName'
  | 'company'
  | 'email'
  | 'phone'
  | 'subject'
  | 'message'

export type ContactFormErrors = Partial<Record<ContactField, string>>

export type ContactResponse = {
  success: boolean
}
