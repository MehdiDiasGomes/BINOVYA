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

/**
 * Describes a bin combination in French, such as « 1 petit(s) bac(s) + 1 grand(s) bac(s) ».
 * @param counts - Number of small and large bins
 * @returns Description, empty when there is no bin
 */
export const describeBins = (counts: BinCounts): string =>
  [
    counts.smallBinCount > 0 ? `${counts.smallBinCount} petit(s) bac(s)` : '',
    counts.largeBinCount > 0 ? `${counts.largeBinCount} grand(s) bac(s)` : '',
  ]
    .filter(text => text.length > 0)
    .join(' + ')
