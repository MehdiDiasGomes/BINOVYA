import { cva } from 'class-variance-authority'

import type { ButtonClassBuilder, ButtonSize, ButtonVariant } from '@/types/button'

const BUTTON_BASE_CLASS: string =
  'group/button relative isolate inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden border text-center font-bold transition-[translate,scale,box-shadow,background-color,border-color,color] duration-press ease-brand hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:translate-y-0 aria-disabled:hover:shadow-none aria-disabled:active:scale-100 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100'

const BUTTON_SHINE_CLASS: string =
  'before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:-z-10 before:w-1/2 before:-translate-x-full before:-skew-x-12 before:bg-linear-to-r before:from-transparent before:to-transparent hover:before:translate-x-[300%] hover:before:transition-[translate] hover:before:duration-700 hover:before:ease-in-out disabled:before:hidden aria-disabled:before:hidden motion-reduce:before:hidden'

/**
 * Trailing icon classes of a button: nudges the icon forward while its button is hovered.
 */
export const BUTTON_TRAILING_ICON_CLASS: string =
  'shrink-0 transition-[translate] duration-press ease-brand motion-safe:group-hover/button:translate-x-0.5 group-disabled/button:group-hover/button:translate-x-0 group-aria-disabled/button:group-hover/button:translate-x-0'

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'rounded-lg border-transparent bg-primary text-sm text-white before:via-white/50 hover:bg-navy-800 hover:shadow-lg hover:shadow-primary/30 focus-visible:ring-primary',
  onDarkPrimary:
    'rounded-lg border-transparent bg-primary text-sm text-white before:via-white/50 hover:bg-navy-800 hover:shadow-lg hover:shadow-primary/40 focus-visible:ring-white/60 focus-visible:ring-offset-navy-950',
  secondary:
    'rounded-lg border-ink/50 bg-white text-sm text-ink before:via-primary/15 hover:border-primary hover:bg-paper-2 hover:shadow-md hover:shadow-navy-950/10 focus-visible:ring-primary',
  destructive:
    'rounded-lg border-destructive bg-white text-sm text-destructive before:via-destructive/15 hover:bg-red-50 hover:text-red-700 hover:shadow-md hover:shadow-navy-950/10 focus-visible:ring-destructive',
  destructiveSolid:
    'rounded-lg border-transparent bg-red-700 text-sm text-white before:via-white/50 hover:bg-red-800 hover:shadow-lg hover:shadow-red-700/30 focus-visible:ring-primary aria-disabled:hover:bg-red-700',
  warning:
    'rounded-lg border-amber-500 bg-amber-300 text-sm text-navy-950 before:via-white/50 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/30 focus-visible:ring-amber-700 aria-disabled:hover:bg-amber-300',
  onDark:
    'rounded-full border-transparent bg-white font-heading text-base text-ink before:via-primary/15 hover:bg-paper-2 hover:shadow-lg hover:shadow-navy-950/40 focus-visible:ring-turquoise focus-visible:ring-offset-navy-900',
  onDarkAccent:
    'rounded-lg border-transparent bg-turquoise text-sm text-navy-950 before:via-white/50 hover:bg-turquoise-deep hover:shadow-lg hover:shadow-turquoise/30 focus-visible:ring-white/60 focus-visible:ring-offset-navy-950',
  onDarkWarning:
    'rounded-full border-transparent bg-amber-300 font-heading text-base text-navy-950 before:via-white/50 hover:bg-amber-400 hover:shadow-lg hover:shadow-navy-950/40 focus-visible:ring-turquoise focus-visible:ring-offset-navy-900 aria-disabled:hover:bg-amber-300',
  onDarkGhost:
    'rounded-full border-white/40 bg-white/10 text-sm text-white before:via-white/50 hover:border-white/70 hover:bg-white/20 hover:shadow-lg hover:shadow-navy-950/40 focus-visible:ring-turquoise focus-visible:ring-offset-navy-900',
  onDarkOutline:
    'rounded-lg border-white/30 bg-transparent text-sm text-white before:via-white/50 hover:border-turquoise hover:bg-white/10 hover:text-turquoise hover:shadow-lg hover:shadow-navy-950/40 focus-visible:ring-white/60 focus-visible:ring-offset-0 active:bg-white/10',
  ghost:
    'rounded-lg border-transparent bg-transparent text-sm text-ink/70 before:via-primary/15 hover:bg-paper-2 hover:text-ink hover:shadow-md hover:shadow-navy-950/10 focus-visible:ring-primary aria-disabled:hover:bg-transparent aria-disabled:hover:text-ink/70',
}

const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'min-h-12 px-5 py-2',
  sm: 'min-h-11 px-4 py-2',
  icon: 'size-11 min-h-11 shrink-0 p-0',
}

export const buttonClass: ButtonClassBuilder = cva(`${BUTTON_BASE_CLASS} ${BUTTON_SHINE_CLASS}`, {
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
