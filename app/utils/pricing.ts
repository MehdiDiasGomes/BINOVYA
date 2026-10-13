import type { BookingService } from '@/types/booking'

/**
 * Applies the degressive pricing of a service: full price for the first unit, reduced price after.
 * @param service - Service being priced
 * @param quantity - Number of units booked
 * @returns Line total in cents
 */
export const computeLineTotalCents = (service: BookingService, quantity: number): number =>
  quantity <= 0
    ? 0
    : service.firstUnitPriceCents + (quantity - 1) * service.additionalUnitPriceCents

export const formatPrice = (cents: number, locale: string): string =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100)
