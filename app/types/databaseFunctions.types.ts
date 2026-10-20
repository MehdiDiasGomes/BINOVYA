/**
 * RPC function signatures of the database schema, composed into `Database` by `database.types.ts`.
 */
export type BookingPlan = 'one_off' | 'quarterly' | 'annual'
export type PhotoKind = 'before' | 'after'
export type CountryCode = 'FR' | 'LU'
type RescheduleOverridable = 'out_of_area' | 'day_closed' | 'day_full' | 'out_of_sector'
type RescheduleRefusal =
  | RescheduleOverridable
  | 'not_found'
  | 'not_paid'
  | 'invalid_date'
  | 'same_date'
  | 'past_date'
  | 'too_far'
  | 'too_frequent'
type AdminBookingMode = 'payment_link' | 'offline'
type AdminCreateRefusal =
  | RescheduleOverridable
  | 'invalid_input'
  | 'invalid_quantities'
  | 'quote_required'
  | 'customer_not_found'
  | 'past_date'
  | 'too_far'
  | 'customer_pending'
type CheckoutLinkResendResult =
  | 'ok'
  | 'not_found'
  | 'not_pending'
  | 'expired'
  | 'no_link'
  | 'too_frequent'
type SetPhotoRefusal = 'not_found' | 'not_paid' | 'future_date' | 'invalid_kind' | 'invalid_path'
type CompleteRefusal =
  | 'not_found'
  | 'already_completed'
  | 'not_paid'
  | 'future_date'
  | 'missing_photos'
type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

export type DatabaseFunctions = {
  get_availability: {
    Args: { p_latitude: number; p_longitude: number }
    Returns: { day: string; status: string }[]
  }
  create_booking: {
    Args: {
      p_customer_id: string
      p_scheduled_date: string
      p_address: string
      p_city: string
      p_postcode: string
      p_latitude: number
      p_longitude: number
      p_plan: BookingPlan
      p_small_bin_count: number
      p_large_bin_count: number
      p_household_collection_weekdays: number[]
      p_recycling_collection_weekdays: number[]
      p_bins_ready_confirmed: boolean
      p_country_code?: CountryCode
      p_hold_minutes?: number
    }
    Returns: { new_booking_id: string; total_cents: number }[]
  }
  booking_price_cents: {
    Args: { p_plan: BookingPlan; p_small_bin_count: number; p_large_bin_count: number }
    Returns: number | null
  }
  admin_create_booking: {
    Args: {
      p_customer_id: string
      p_mode: AdminBookingMode
      p_scheduled_date: string
      p_address: string
      p_city: string
      p_postcode: string
      p_latitude: number
      p_longitude: number
      p_plan: BookingPlan
      p_small_bin_count: number
      p_large_bin_count: number
      p_household_collection_weekdays: number[]
      p_recycling_collection_weekdays: number[]
      p_country_code?: CountryCode
      p_force?: boolean
      p_hold_minutes?: number
    }
    Returns: {
      ok: boolean
      reason: AdminCreateRefusal | null
      new_booking_id: string | null
      total_cents: number | null
      hold_expires_at: string | null
      overridden_reasons: RescheduleOverridable[] | null
    }[]
  }
  admin_claim_checkout_link_resend: {
    Args: { p_booking_id: string }
    Returns: CheckoutLinkResendResult
  }
  confirm_booking_payment: {
    Args: {
      p_booking_id: string
      p_checkout_session_id: string
      p_payment_intent_id: string
      p_amount_cents: number
    }
    Returns: 'paid' | 'already_paid' | 'refund_required' | 'not_payable' | 'not_found'
  }
  day_check: {
    Args: {
      p_date: string
      p_latitude: number
      p_longitude: number
      p_exclude_booking_id: string | null
      p_apply_bounds: boolean
    }
    Returns: 'closed' | 'full' | 'outOfSector' | 'available'
  }
  admin_reschedule_booking: {
    Args: { p_booking_id: string; p_new_date: string; p_force?: boolean }
    Returns: {
      ok: boolean
      reason: RescheduleRefusal | null
      old_date: string | null
      new_date: string | null
      overridden_reason: RescheduleOverridable | null
      overridden_reasons: RescheduleOverridable[] | null
    }[]
  }
  admin_set_intervention_photo: {
    Args: { p_booking_id: string; p_kind: PhotoKind; p_storage_path: string }
    Returns: {
      ok: boolean
      reason: SetPhotoRefusal | null
      replaced: boolean | null
    }[]
  }
  admin_complete_booking: {
    Args: { p_booking_id: string; p_force?: boolean }
    Returns: {
      ok: boolean
      reason: CompleteRefusal | null
      send_photos_mail: boolean | null
      without_photos: boolean | null
      booking_date: string | null
    }[]
  }
  admin_day_overview: {
    Args: { p_from: string; p_to: string }
    Returns: {
      day: string
      weekday: number
      capacity: number
      capacity_source: 'rule' | 'override'
      is_closed: boolean
      sector_latitude: number | null
      sector_longitude: number | null
      sector_label: string | null
      note: string | null
      active_count: number
      paid_count: number
    }[]
  }
  is_admin: {
    Args: Record<string, never>
    Returns: boolean
  }
  has_recent_sign_in: {
    Args: Record<string, never>
    Returns: boolean
  }
  oldest_link_sign_in_at: {
    Args: Record<string, never>
    Returns: string | null
  }
  claim_login_link: {
    Args: { p_email: string }
    Returns: string | null
  }
  claim_admin_login_link: {
    Args: { p_email: string }
    Returns: string | null
  }
  suppress_auth_emails: {
    Args: { event: Json }
    Returns: Json
  }
  expire_stale_bookings: {
    Args: Record<string, never>
    Returns: number
  }
}
