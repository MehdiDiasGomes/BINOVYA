export type ServiceSlug = 'small-bin' | 'large-bin'

export type BookingStepId = 'address' | 'services' | 'date' | 'contact'

export type DayStatus = 'available' | 'full' | 'closed' | 'outOfSector'

export type GeoPoint = {
  latitude: number
  longitude: number
}

export type BookingService = {
  slug: ServiceSlug
  titleKey: string
  descriptionKey: string
  image: string
  firstUnitPriceCents: number
  additionalUnitPriceCents: number
}

export type BookingAddress = GeoPoint & {
  label: string
  city: string
  postcode: string
}

export type BookingContact = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export type BookingQuantities = Record<ServiceSlug, number>

export type BookingDraft = {
  address: BookingAddress | null
  quantities: BookingQuantities
  collectionWeekdays: number[]
  isCollectionUnknown: boolean
  date: string | null
  contact: BookingContact
  hasAcceptedTerms: boolean
}

export type BookingLine = {
  service: BookingService
  quantity: number
  totalCents: number
}

export type DayStatusEntry = {
  date: string
  status: DayStatus
}

export type DayAvailability = DayStatusEntry & {
  isRecommended: boolean
}

export type AvailabilityResponse = {
  isInServiceArea: boolean
  serviceAreaRadiusKm: number
  days: DayStatusEntry[]
}

export type AvailabilityState = 'idle' | 'loading' | 'ready' | 'error'

export type BookingRequestItem = {
  slug: ServiceSlug
  quantity: number
}

export type BookingRequest = {
  address: BookingAddress
  items: BookingRequestItem[]
  collectionWeekdays: number[]
  date: string
  contact: BookingContact
}

export type BookingResponse = {
  bookingId: string
  amountTotalCents: number
}

export type ContactErrors = Partial<Record<keyof BookingContact, string>>

export type GeocodingFeature = {
  geometry: {
    coordinates: [number, number]
  }
  properties: {
    id: string
    label: string
    city: string
    postcode: string
  }
}

export type GeocodingResponse = {
  features: GeocodingFeature[]
}
