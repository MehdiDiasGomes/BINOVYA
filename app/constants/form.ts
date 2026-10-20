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
