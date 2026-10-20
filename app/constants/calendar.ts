export const CALENDAR_GRID_DAY_COUNT: number = 42

export const CALENDAR_NAV_BUTTON_CLASS: string =
  'pointer-events-auto flex size-11 items-center justify-center rounded-lg border border-ink/50 bg-white text-ink opacity-100 shadow-none transition-[color,background-color,border-color,scale] duration-press ease-brand hover:border-primary hover:bg-paper-2 hover:text-ink hover:opacity-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 has-[>svg]:px-0 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 motion-safe:not-data-[disabled]:active:scale-95 motion-reduce:transition-none'

export const CALENDAR_CELL_CLASS: string =
  'relative flex h-11 w-full cursor-pointer items-center justify-center rounded-lg text-sm font-bold text-ink transition-[color,background-color,scale] duration-press ease-brand hover:bg-paper-2 hover:text-ink focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white data-[outside-view]:invisible data-[today]:not-data-[selected]:bg-paper-2 data-[today]:not-data-[selected]:font-black data-[today]:not-data-[selected]:underline data-[today]:not-data-[selected]:decoration-2 data-[today]:not-data-[selected]:underline-offset-4 data-[disabled]:cursor-not-allowed data-[disabled]:font-medium data-[disabled]:text-ink/35 data-[disabled]:opacity-100 data-[disabled]:line-through data-[disabled]:hover:bg-transparent data-[unavailable]:cursor-not-allowed data-[unavailable]:font-medium data-[unavailable]:text-ink/35 data-[unavailable]:opacity-100 data-[unavailable]:line-through data-[unavailable]:hover:bg-transparent data-[selected]:bg-primary data-[selected]:font-black data-[selected]:text-white data-[selected]:hover:bg-primary data-[selected]:hover:text-white motion-safe:not-data-[disabled]:not-data-[unavailable]:active:scale-95 motion-reduce:transition-none'

export const CALENDAR_CELL_WRAPPER_CLASS: string =
  'flex-1 px-0 py-0.5 [&:has([data-selected])]:bg-transparent'

export const CALENDAR_RECOMMENDED_CLASS: string =
  'bg-turquoise/15 ring-1 ring-inset ring-turquoise-deep data-[selected]:ring-0'

export const CALENDAR_DOT_BASE_CLASS: string = 'size-1.5 rounded-full bg-current'

export const CALENDAR_DAY_DOT_CLASS: string = `${CALENDAR_DOT_BASE_CLASS} absolute bottom-1`

const CALENDAR_MARKED_DOT_ENTER_CLASS: string =
  'duration-press ease-brand motion-safe:animate-in motion-safe:fade-in'

export const CALENDAR_MARKED_DOT_CLASS: string = `${CALENDAR_DOT_BASE_CLASS} shrink-0 ${CALENDAR_MARKED_DOT_ENTER_CLASS}`

export const CALENDAR_MARKED_DAY_DOT_CLASS: string = `${CALENDAR_DOT_BASE_CLASS} absolute bottom-0.5 ${CALENDAR_MARKED_DOT_ENTER_CLASS}`

export const CALENDAR_HEAD_CELL_CLASS: string =
  'flex-1 pb-2 text-center text-xs font-bold uppercase text-ink/70'

export const CALENDAR_HEADING_CLASS: string =
  'font-heading text-base font-black capitalize text-ink'
