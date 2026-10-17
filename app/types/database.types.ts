/**
 * Database schema, written by hand from `supabase/migrations`.
 * Regenerate with `supabase gen types typescript` once the Supabase CLI is linked to the project.
 */
type BookingStatus = 'pending_payment' | 'paid' | 'completed' | 'cancelled' | 'expired'
type BookingPlan = 'one_off' | 'quarterly' | 'annual'
type PhotoKind = 'before' | 'after'
type QuoteStatus = 'new' | 'answered' | 'closed'
type QuoteEquipment = 'bins' | 'pav' | 'urban_furniture' | 'signage'
type CountryCode = 'FR' | 'LU'
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
type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

type Table<Row, Required extends keyof Row = never> = {
  Row: Row
  Insert: Partial<Row> & Pick<Row, Required>
  Update: Partial<Row>
  Relationships: []
}

type ProfileRow = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  login_link_sent_at: string | null
  deletion_requested_at: string | null
  login_link_count: number
  login_link_window_start: string | null
  created_at: string
}

type AdminLoginLinkRow = {
  user_id: string
  sent_at: string
  link_count: number
  window_start: string
}

type PriceGridRow = {
  plan: BookingPlan
  small_bin_count: number
  large_bin_count: number
  price_cents: number
}

type BookingRow = {
  id: string
  customer_id: string
  scheduled_date: string
  address: string
  city: string
  postcode: string
  country_code: CountryCode
  latitude: number
  longitude: number
  plan: BookingPlan
  small_bin_count: number
  large_bin_count: number
  household_collection_weekdays: number[]
  recycling_collection_weekdays: number[]
  bins_ready_confirmed_at: string
  status: BookingStatus
  amount_total_cents: number
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  expires_at: string | null
  reminder_sent_at: string | null
  day_of_sms_sent_at: string | null
  completed_at: string | null
  rescheduled_at: string | null
  reschedule_count: number
  reschedule_window_start: string | null
  created_at: string
}

type QuoteRequestRow = {
  id: string
  first_name: string
  last_name: string
  company: string | null
  email: string
  phone: string
  address: string
  city: string
  postcode: string
  country_code: CountryCode
  latitude: number | null
  longitude: number | null
  small_bin_count: number
  large_bin_count: number
  equipment: QuoteEquipment[]
  plan: BookingPlan | null
  comment: string | null
  photo_paths: string[]
  status: QuoteStatus
  created_at: string
}

type InterventionPhotoRow = {
  id: string
  booking_id: string
  kind: PhotoKind
  storage_path: string
  created_at: string
}

type AvailabilityRuleRow = {
  weekday: number
  max_bookings: number
}

type AvailabilityOverrideRow = {
  date: string
  max_bookings: number | null
  sector_latitude: number | null
  sector_longitude: number | null
  sector_label: string | null
  note: string | null
}

type BookingSettingsRow = {
  id: boolean
  depot_latitude: number
  depot_longitude: number
  service_area_radius_km: number
  day_sector_radius_km: number
  min_lead_days: number
  horizon_days: number
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, 'id' | 'email' | 'first_name' | 'last_name' | 'phone'>
      admin_login_links: Table<
        AdminLoginLinkRow,
        'user_id' | 'sent_at' | 'link_count' | 'window_start'
      >
      price_grid: Table<
        PriceGridRow,
        'plan' | 'small_bin_count' | 'large_bin_count' | 'price_cents'
      >
      bookings: Table<
        BookingRow,
        | 'customer_id'
        | 'scheduled_date'
        | 'address'
        | 'city'
        | 'postcode'
        | 'latitude'
        | 'longitude'
        | 'plan'
        | 'small_bin_count'
        | 'large_bin_count'
        | 'bins_ready_confirmed_at'
      >
      quote_requests: Table<
        QuoteRequestRow,
        'first_name' | 'last_name' | 'email' | 'phone' | 'address' | 'city' | 'postcode'
      >
      intervention_photos: Table<InterventionPhotoRow, 'booking_id' | 'kind' | 'storage_path'>
      availability_rules: Table<AvailabilityRuleRow, 'weekday' | 'max_bookings'>
      availability_overrides: Table<AvailabilityOverrideRow, 'date'>
      booking_settings: Table<
        BookingSettingsRow,
        | 'depot_latitude'
        | 'depot_longitude'
        | 'service_area_radius_km'
        | 'day_sector_radius_km'
        | 'min_lead_days'
        | 'horizon_days'
      >
    }
    Views: { [_ in never]: never }
    Functions: {
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
    Enums: {
      booking_status: BookingStatus
      booking_plan: BookingPlan
      photo_kind: PhotoKind
      quote_status: QuoteStatus
      quote_equipment: QuoteEquipment
    }
    CompositeTypes: { [_ in never]: never }
  }
}
