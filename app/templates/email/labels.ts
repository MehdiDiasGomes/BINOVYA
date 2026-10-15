import type { BookingPlan } from '@/types/booking'

type BinCounts = {
  smallBinCount: number
  largeBinCount: number
}

export const PLAN_LABELS: Record<BookingPlan, string> = {
  one_off: 'Ponctuelle',
  quarterly: 'Trimestrielle (un passage tous les 3 mois)',
  annual: 'Annuelle (un passage chaque mois)',
}

const countBins = (count: number, adjective: string): string =>
  count > 1 ? `${count} ${adjective}s bacs` : `${count} ${adjective} bac`

/**
 * Describes a bin combination in French with agreement, such as « 1 petit bac + 2 grands bacs ».
 * @param counts - Number of small and large bins
 * @returns Description, empty when there is no bin
 */
export const describeBins = (counts: BinCounts): string =>
  [
    counts.smallBinCount > 0 ? countBins(counts.smallBinCount, 'petit') : '',
    counts.largeBinCount > 0 ? countBins(counts.largeBinCount, 'grand') : '',
  ]
    .filter(text => text.length > 0)
    .join(' + ')

export const EMAIL_BRAND = 'BINOVYA'

export const EMAIL_TAGLINE = 'Nettoyage et désinfection de bacs à poubelles'

export const EMAIL_NOTIFICATION_NOTE = 'Notification automatique du site BINOVYA.'
