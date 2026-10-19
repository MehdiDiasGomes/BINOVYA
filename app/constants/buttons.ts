import { cva } from 'class-variance-authority'

import type { ButtonClassBuilder, ButtonSize, ButtonVariant } from '@/types/button'

const BUTTON_BASE_CLASS: string =
  'inline-flex cursor-pointer items-center justify-center gap-2 border text-center font-bold transition-all duration-press ease-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100'

const BUTTON_LIFT_CLASS: string =
  'hover:-translate-y-px active:translate-y-0 aria-disabled:hover:translate-y-0 disabled:hover:translate-y-0 motion-reduce:hover:translate-y-0'

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: `${BUTTON_LIFT_CLASS} rounded-lg border-transparent bg-primary text-sm text-white hover:bg-navy-800 focus-visible:ring-primary`,
  secondary:
    'rounded-lg border-ink/50 bg-white text-sm text-ink hover:border-primary hover:bg-paper-2 focus-visible:ring-primary',
  destructive:
    'rounded-lg border-destructive bg-white text-sm text-destructive hover:bg-red-50 hover:text-red-700 focus-visible:ring-destructive',
  warning: `${BUTTON_LIFT_CLASS} rounded-lg border-amber-500 bg-amber-300 text-sm text-navy-950 hover:bg-amber-200 focus-visible:ring-amber-700`,
  onDark: `${BUTTON_LIFT_CLASS} rounded-full border-transparent bg-white font-heading text-base text-ink hover:bg-paper-2 focus-visible:ring-turquoise focus-visible:ring-offset-navy-900`,
  onDarkWarning: `${BUTTON_LIFT_CLASS} rounded-full border-transparent bg-amber-300 font-heading text-base text-navy-950 hover:bg-amber-200 focus-visible:ring-turquoise focus-visible:ring-offset-navy-900`,
  onDarkGhost:
    'rounded-full border-white/40 bg-white/10 text-sm text-white hover:border-white/70 hover:bg-white/20 focus-visible:ring-turquoise focus-visible:ring-offset-navy-900',
  onDarkOutline:
    'rounded-lg border-white/30 bg-transparent text-sm text-white hover:border-turquoise hover:text-turquoise focus-visible:ring-white/60 focus-visible:ring-offset-0 active:bg-white/10',
}

const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'min-h-12 px-5 py-2',
  sm: 'min-h-11 px-4 py-2',
}

export const buttonClass: ButtonClassBuilder = cva(BUTTON_BASE_CLASS, {
  variants: {
    variant: BUTTON_VARIANT_CLASSES,
    size: BUTTON_SIZE_CLASSES,
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})

export const BACK_LINK_CLASS: string =
  'inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-primary underline-offset-4 transition-colors duration-press ease-brand hover:text-navy-800 hover:underline motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2'

export const TEXT_LINK_CLASS: string =
  'inline-flex min-h-11 items-center gap-2 rounded-sm text-primary underline underline-offset-4 transition-colors duration-press ease-brand hover:text-navy-800 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none'
