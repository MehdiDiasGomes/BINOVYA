import { describe, expect, it } from 'vitest'

import {
  PRO_AVAILABILITY_HORIZON_DAYS,
  PRO_DAY_CAPACITY_MAX,
  PRO_DAY_NOTE_MAX_LENGTH,
} from '../../../app/constants/pro'
import { addDaysToIsoDate, businessToday } from '../../../app/utils/date'
import {
  dayCapacitySchema,
  dayNoteSchema,
  normalizeDayNote,
  weekdaySchema,
} from '../../../app/utils/proAvailabilityValidation'
import { ADDRESS_TOKEN_MAX_LENGTH } from '../../../server/utils/addressToken'
import {
  municipalityDetailsSchema,
  signedMunicipalitySchema,
} from '../../../server/utils/bookingSchemas'
import {
  isBeyondProHorizon,
  proAvailabilityQuerySchema,
  proBookingParamsSchema,
  proDateParamsSchema,
  proDayOverrideSchema,
  proRescheduleSchema,
  proWeekdayRulesSchema,
} from '../../../server/utils/proSchemas'
import { LUXEMBOURG_COMMUNE, THIONVILLE_COMMUNE } from '../../support/address'

const FAR_DATE = addDaysToIsoDate(businessToday(), PRO_AVAILABILITY_HORIZON_DAYS)

const TOO_FAR_DATE = addDaysToIsoDate(FAR_DATE, 1)

const TOKEN = 'abc.def'

const LUXEMBOURG_SIGNED = { ...LUXEMBOURG_COMMUNE, token: TOKEN }

const FRENCH_COMMUNE = { ...THIONVILLE_COMMUNE, token: TOKEN }

describe('dayCapacitySchema', () => {
  it.each([0, 1, PRO_DAY_CAPACITY_MAX])('accepts %d', value => {
    expect(dayCapacitySchema.safeParse(value).success).toBe(true)
  })

  it.each([-1, PRO_DAY_CAPACITY_MAX + 1, 1.5, '3', null, Number.NaN])('rejects %j', value => {
    expect(dayCapacitySchema.safeParse(value).success).toBe(false)
  })
})

describe('weekdaySchema', () => {
  it.each([0, 6])('accepts %d', value => {
    expect(weekdaySchema.safeParse(value).success).toBe(true)
  })

  it.each([-1, 7, 2.5, '1'])('rejects %j', value => {
    expect(weekdaySchema.safeParse(value).success).toBe(false)
  })
})

describe('dayNoteSchema', () => {
  it('trims the note', () => {
    expect(dayNoteSchema.parse('  Fête  ')).toBe('Fête')
  })

  it('accepts a note of the maximum length and rejects one more character', () => {
    expect(dayNoteSchema.safeParse('a'.repeat(PRO_DAY_NOTE_MAX_LENGTH)).success).toBe(true)
    expect(dayNoteSchema.safeParse('a'.repeat(PRO_DAY_NOTE_MAX_LENGTH + 1)).success).toBe(false)
  })
})

describe('normalizeDayNote', () => {
  it('returns null for an empty or blank note', () => {
    expect(normalizeDayNote('')).toBeNull()
    expect(normalizeDayNote('   \n ')).toBeNull()
  })

  it('returns the trimmed text otherwise', () => {
    expect(normalizeDayNote('  Marché  ')).toBe('Marché')
  })
})

describe('municipality schemas', () => {
  it('accepts a French commune with a 5-digit postcode', () => {
    expect(municipalityDetailsSchema.safeParse(FRENCH_COMMUNE).success).toBe(true)
  })

  it('accepts a Luxembourg commune with an empty postcode', () => {
    expect(municipalityDetailsSchema.safeParse(LUXEMBOURG_SIGNED).success).toBe(true)
  })

  it('accepts a Luxembourg commune with a 4-digit postcode', () => {
    expect(
      municipalityDetailsSchema.safeParse({ ...LUXEMBOURG_SIGNED, postcode: '1234' }).success,
    ).toBe(true)
  })

  it('rejects a French commune with an empty postcode', () => {
    expect(municipalityDetailsSchema.safeParse({ ...FRENCH_COMMUNE, postcode: '' }).success).toBe(
      false,
    )
  })

  it('rejects a French commune with a Luxembourg postcode and the reverse', () => {
    expect(
      municipalityDetailsSchema.safeParse({ ...FRENCH_COMMUNE, postcode: '1234' }).success,
    ).toBe(false)
    expect(
      municipalityDetailsSchema.safeParse({ ...LUXEMBOURG_SIGNED, postcode: '57100' }).success,
    ).toBe(false)
  })

  it('rejects an unknown country and out-of-range coordinates', () => {
    expect(
      municipalityDetailsSchema.safeParse({ ...FRENCH_COMMUNE, countryCode: 'BE' }).success,
    ).toBe(false)
    expect(municipalityDetailsSchema.safeParse({ ...FRENCH_COMMUNE, latitude: 91 }).success).toBe(
      false,
    )
  })

  it('signed variant defaults a missing token to an empty string and caps its length', () => {
    const unsigned = { ...FRENCH_COMMUNE, token: undefined }
    expect(signedMunicipalitySchema.parse(unsigned).token).toBe('')
    expect(
      signedMunicipalitySchema.safeParse({
        ...FRENCH_COMMUNE,
        token: 'x'.repeat(ADDRESS_TOKEN_MAX_LENGTH + 1),
      }).success,
    ).toBe(false)
  })
})

describe('proWeekdayRulesSchema', () => {
  it('accepts one to seven distinct weekdays', () => {
    expect(
      proWeekdayRulesSchema.safeParse({ rules: [{ weekday: 1, maxBookings: 3 }] }).success,
    ).toBe(true)
    expect(
      proWeekdayRulesSchema.safeParse({
        rules: Array.from({ length: 7 }, (_, weekday) => ({ weekday, maxBookings: 0 })),
      }).success,
    ).toBe(true)
  })

  it('rejects an empty list and more than seven rules', () => {
    expect(proWeekdayRulesSchema.safeParse({ rules: [] }).success).toBe(false)
    expect(
      proWeekdayRulesSchema.safeParse({
        rules: Array.from({ length: 8 }, (_, index) => ({ weekday: index % 7, maxBookings: 1 })),
      }).success,
    ).toBe(false)
  })

  it('rejects a weekday given twice', () => {
    expect(
      proWeekdayRulesSchema.safeParse({
        rules: [
          { weekday: 2, maxBookings: 1 },
          { weekday: 2, maxBookings: 2 },
        ],
      }).success,
    ).toBe(false)
  })

  it('rejects a capacity above the maximum, a negative one and a bad weekday', () => {
    const rule = (weekday: number, maxBookings: number): unknown => ({
      rules: [{ weekday, maxBookings }],
    })
    expect(proWeekdayRulesSchema.safeParse(rule(1, PRO_DAY_CAPACITY_MAX + 1)).success).toBe(false)
    expect(proWeekdayRulesSchema.safeParse(rule(1, -1)).success).toBe(false)
    expect(proWeekdayRulesSchema.safeParse(rule(7, 1)).success).toBe(false)
  })

  it('rejects a body without rules', () => {
    expect(proWeekdayRulesSchema.safeParse({}).success).toBe(false)
  })
})

describe('proDayOverrideSchema', () => {
  it('accepts a capacity alone, a note alone and an empty exception', () => {
    expect(proDayOverrideSchema.safeParse({ maxBookings: 0, note: null }).success).toBe(true)
    expect(proDayOverrideSchema.safeParse({ maxBookings: null, note: 'x' }).success).toBe(true)
    expect(proDayOverrideSchema.safeParse({ maxBookings: null, note: null }).success).toBe(true)
  })

  it('turns an empty note into null and trims a note', () => {
    expect(proDayOverrideSchema.parse({ maxBookings: 1, note: '' }).note).toBeNull()
    expect(proDayOverrideSchema.parse({ maxBookings: 1, note: '  ok ' }).note).toBe('ok')
  })

  it('keeps sector undefined when absent, null when removed, and the commune when given', () => {
    expect(proDayOverrideSchema.parse({ maxBookings: 1, note: null }).sector).toBeUndefined()
    expect(
      proDayOverrideSchema.parse({ maxBookings: 1, note: null, sector: null }).sector,
    ).toBeNull()
    expect(
      proDayOverrideSchema.parse({ maxBookings: 1, note: null, sector: FRENCH_COMMUNE }).sector,
    ).toMatchObject({ city: 'Thionville', countryCode: 'FR' })
  })

  it('accepts a Luxembourg commune sector with an empty postcode', () => {
    expect(
      proDayOverrideSchema.safeParse({ maxBookings: 2, note: null, sector: LUXEMBOURG_SIGNED })
        .success,
    ).toBe(true)
  })

  it('rejects a sector with a postcode that does not fit the country', () => {
    expect(
      proDayOverrideSchema.safeParse({
        maxBookings: 2,
        note: null,
        sector: { ...FRENCH_COMMUNE, postcode: '' },
      }).success,
    ).toBe(false)
  })

  it('rejects a capacity out of range or fractional', () => {
    expect(
      proDayOverrideSchema.safeParse({ maxBookings: PRO_DAY_CAPACITY_MAX + 1, note: null }).success,
    ).toBe(false)
    expect(proDayOverrideSchema.safeParse({ maxBookings: -1, note: null }).success).toBe(false)
    expect(proDayOverrideSchema.safeParse({ maxBookings: 1.5, note: null }).success).toBe(false)
  })

  it('rejects a note over the maximum length and a missing field', () => {
    expect(
      proDayOverrideSchema.safeParse({
        maxBookings: 1,
        note: 'a'.repeat(PRO_DAY_NOTE_MAX_LENGTH + 1),
      }).success,
    ).toBe(false)
    expect(proDayOverrideSchema.safeParse({ note: null }).success).toBe(false)
    expect(proDayOverrideSchema.safeParse({ maxBookings: 1 }).success).toBe(false)
  })
})

describe('proRescheduleSchema', () => {
  it('defaults force to false', () => {
    expect(proRescheduleSchema.parse({ date: '2026-12-01' })).toEqual({
      date: '2026-12-01',
      force: false,
    })
  })

  it('keeps force when set', () => {
    expect(proRescheduleSchema.parse({ date: '2026-12-01', force: true }).force).toBe(true)
  })

  it('rejects a force that is not a boolean', () => {
    expect(proRescheduleSchema.safeParse({ date: '2026-12-01', force: 'true' }).success).toBe(false)
    expect(proRescheduleSchema.safeParse({ date: '2026-12-01', force: 1 }).success).toBe(false)
  })

  it('accepts the last day of the horizon and rejects the next one as too far', () => {
    expect(proRescheduleSchema.safeParse({ date: FAR_DATE }).success).toBe(true)
    const result = proRescheduleSchema.safeParse({ date: TOO_FAR_DATE })
    expect(result.success).toBe(false)
    expect(!result.success && isBeyondProHorizon(result.error)).toBe(true)
  })

  it('does not flag an invalid date as too far', () => {
    const result = proRescheduleSchema.safeParse({ date: '2026-02-30' })
    expect(result.success).toBe(false)
    expect(!result.success && isBeyondProHorizon(result.error)).toBe(false)
  })

  it('rejects a missing or non-string date', () => {
    expect(proRescheduleSchema.safeParse({}).success).toBe(false)
    expect(proRescheduleSchema.safeParse({ date: 20261201 }).success).toBe(false)
  })

  it('accepts a past date, which the database refuses with its own code', () => {
    expect(proRescheduleSchema.safeParse({ date: '2020-01-01' }).success).toBe(true)
  })
})

describe('isBeyondProHorizon', () => {
  it('is false for an error unrelated to the horizon', () => {
    const result = proBookingParamsSchema.safeParse({ id: 'nope' })
    expect(!result.success && isBeyondProHorizon(result.error)).toBe(false)
  })
})

describe('proDateParamsSchema', () => {
  it('accepts a date within the horizon and rejects an invalid or distant one', () => {
    expect(proDateParamsSchema.safeParse({ date: FAR_DATE }).success).toBe(true)
    expect(proDateParamsSchema.safeParse({ date: TOO_FAR_DATE }).success).toBe(false)
    expect(proDateParamsSchema.safeParse({ date: '2026-13-01' }).success).toBe(false)
  })
})

describe('proBookingParamsSchema', () => {
  it('accepts a UUID and rejects anything else', () => {
    expect(proBookingParamsSchema.safeParse({ id: crypto.randomUUID() }).success).toBe(true)
    expect(proBookingParamsSchema.safeParse({ id: '123' }).success).toBe(false)
    expect(proBookingParamsSchema.safeParse({}).success).toBe(false)
  })
})

describe('proAvailabilityQuerySchema', () => {
  it('accepts an empty query and an ordered range, including one day', () => {
    expect(proAvailabilityQuerySchema.safeParse({}).success).toBe(true)
    expect(
      proAvailabilityQuerySchema.safeParse({ from: '2026-10-01', to: '2026-10-01' }).success,
    ).toBe(true)
  })

  it('rejects a range where to precedes from', () => {
    expect(
      proAvailabilityQuerySchema.safeParse({ from: '2026-10-02', to: '2026-10-01' }).success,
    ).toBe(false)
  })

  it('rejects an invalid date', () => {
    expect(proAvailabilityQuerySchema.safeParse({ from: '2026-02-30' }).success).toBe(false)
  })
})
