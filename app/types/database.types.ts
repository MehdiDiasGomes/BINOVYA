/**
 * Database schema, written by hand from `supabase/migrations`.
 * Regenerate with `supabase gen types typescript` once the Supabase CLI is linked to the project.
 */
type BookingStatus = 'pending_payment' | 'paid' | 'completed' | 'cancelled' | 'expired'
type PhotoKind = 'before' | 'after'

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
  created_at: string
}

type ServiceRow = {
  id: string
  slug: string
  name: string
  first_unit_price_cents: number
  additional_unit_price_cents: number
  is_active: boolean
  created_at: string
}

type BookingRow = {
  id: string
  customer_id: string
  scheduled_date: string
  address: string
  city: string
  postcode: string
  latitude: number
  longitude: number
  collection_weekdays: number[]
  status: BookingStatus
  amount_total_cents: number
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  expires_at: string | null
  reminder_sent_at: string | null
  day_of_sms_sent_at: string | null
  completed_at: string | null
  created_at: string
}

type BookingItemRow = {
  id: string
  booking_id: string
  service_id: string
  quantity: number
  line_total_cents: number
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
      services: Table<
        ServiceRow,
        'slug' | 'name' | 'first_unit_price_cents' | 'additional_unit_price_cents'
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
      >
      booking_items: Table<
        BookingItemRow,
        'booking_id' | 'service_id' | 'quantity' | 'line_total_cents'
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
          p_collection_weekdays: number[]
          p_items: { slug: string; quantity: number }[]
          p_hold_minutes?: number
        }
        Returns: { new_booking_id: string; total_cents: number }[]
      }
      expire_stale_bookings: {
        Args: Record<string, never>
        Returns: number
      }
    }
    Enums: {
      booking_status: BookingStatus
      photo_kind: PhotoKind
    }
    CompositeTypes: { [_ in never]: never }
  }
}
