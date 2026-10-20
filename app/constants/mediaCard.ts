import type { MediaCardTone, MediaCardToneClasses } from '@/types/mediaCard'

export const MEDIA_CARD_SHELL_CLASS: string =
  'relative isolate flex h-full min-w-0 flex-col gap-4.5 overflow-hidden rounded-[32px] px-6 pb-6 pt-7 shadow-xl shadow-navy-950/30'

export const MEDIA_CARD_TONES: Record<MediaCardTone, MediaCardToneClasses> = {
  success: {
    surface: 'bg-linear-[165deg] from-navy-800 via-navy-900 to-navy-950',
    glow: 'from-emerald-300/25',
    eyebrow: 'text-emerald-300',
  },
  info: {
    surface: 'bg-linear-[165deg] from-navy-800 via-navy-900 to-navy-950',
    glow: 'from-turquoise/30',
    eyebrow: 'text-cyan-300',
  },
  warning: {
    surface: 'bg-linear-[165deg] from-navy-800 via-navy-900 to-navy-950',
    glow: 'from-amber-300/25',
    eyebrow: 'text-amber-300',
  },
  neutral: {
    surface: 'bg-linear-[165deg] from-slate-700 to-slate-800',
    glow: 'from-slate-300/15',
    eyebrow: 'text-slate-300',
  },
}

export const DETAIL_ROW_CLASS: string =
  'flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3'
