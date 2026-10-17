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
  neutral: {
    surface: 'bg-linear-[165deg] from-slate-700 to-slate-800',
    glow: 'from-slate-300/15',
    eyebrow: 'text-slate-300',
  },
}

export const MEDIA_CARD_ACTION_CLASS: string =
  'block min-h-12 w-full rounded-full bg-white px-5 py-3.5 text-center font-heading text-base font-bold text-ink transition-all duration-press ease-brand hover:-translate-y-px hover:bg-paper-2 active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-turquoise focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900'
