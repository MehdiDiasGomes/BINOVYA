import { ERROR_TEXT_TONE_CLASS } from '@/constants/feedback'

export const INPUT_GROUP_FRAME_CLASS: string =
  'col-span-2 col-start-1 row-start-2 rounded-lg border border-ink/50 bg-white transition-[border-color,box-shadow] duration-press ease-brand group-has-[:focus-visible]:border-primary group-has-[:focus-visible]:ring-[3px] group-has-[:focus-visible]:ring-primary/60 group-has-[[aria-invalid=true]]:border-red-700 motion-reduce:transition-none'

export const FIELD_INPUT_CLASS: string =
  'h-12 w-full rounded-lg border border-ink/50 bg-white px-4 text-[15px] text-ink outline-none transition-[border-color,box-shadow] duration-press ease-brand placeholder:text-ink/60 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/60 aria-invalid:border-red-700 motion-reduce:transition-none'

export const FIELD_TEXTAREA_CLASS: string =
  'block w-full resize-none rounded-lg border border-ink/50 bg-white px-4 py-3 text-[15px] text-ink outline-none transition-[border-color,box-shadow] duration-press ease-brand placeholder:text-ink/60 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/60 aria-invalid:border-red-700 motion-reduce:transition-none'

export const SELECT_ITEM_CLASS: string =
  'min-h-11 cursor-pointer text-sm font-semibold text-ink transition-colors duration-press ease-brand focus:bg-paper-2 focus:text-ink data-[state=checked]:font-black motion-reduce:transition-none'

export const FLOATING_PANEL_CLASS: string =
  'rounded-xl border-border bg-white text-ink shadow-lg motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none'

export const FIELD_HINT_CLASS: string = 'mt-1.5 block text-[13px] text-ink/70'

export const FIELD_ERROR_CLASS: string = `mt-1.5 flex items-center gap-1.5 text-[13px] font-bold ${ERROR_TEXT_TONE_CLASS}`

/** Native checkbox classes: size, brand accent and focus outline. */
export const CHECKBOX_CLASS: string =
  'h-5 w-5 shrink-0 accent-primary focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary'

export const NUMBER_FIELD_STEP_BUTTON_CLASS: string =
  'mx-0.5 flex size-11 cursor-pointer items-center justify-center rounded-md p-0 text-ink transition-colors duration-press ease-brand hover:bg-primary/10 hover:text-primary active:bg-primary/20 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-ink/40 disabled:opacity-100 motion-reduce:transition-none'

export const WHOLE_NUMBER_FORMAT: Intl.NumberFormatOptions = {
  maximumFractionDigits: 0,
  useGrouping: false,
}

export const DIGITS_PATTERN: RegExp = /^\d+$/
