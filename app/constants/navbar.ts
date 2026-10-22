import type { NavItem } from '@/types/navbar'
import type { TransitionProps } from 'vue'

export const MOBILE_MENU_PANEL_CLASS: string =
  'absolute inset-x-0 top-full z-40 flex flex-col border-t border-white/8 bg-navy-900 pb-5 pt-2.5 shadow-lg'

export const MOBILE_MENU_LINK_CLASS: string =
  'flex min-h-11 items-center gap-2 border-b border-white/5 py-3 text-[15px] font-semibold text-white/85 transition-colors duration-press ease-brand hover:text-turquoise focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-white/60 aria-[current=page]:font-black aria-[current=page]:text-white aria-[current=page]:underline aria-[current=page]:underline-offset-8 motion-reduce:transition-none'

export const LANGUAGE_LINK_CLASS: string =
  'flex min-h-11 min-w-11 items-center justify-center rounded-md font-semibold text-[#dce8f0] transition-colors duration-press ease-brand hover:text-turquoise focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60 aria-[current=true]:font-black aria-[current=true]:text-white aria-[current=true]:hover:text-white aria-[current=true]:underline aria-[current=true]:underline-offset-8 motion-reduce:transition-none'

export const MOBILE_MENU_TRANSITION: TransitionProps = {
  enterActiveClass:
    'transition-[opacity,translate] duration-lift ease-brand motion-reduce:transition-none',
  enterFromClass: '-translate-y-2 opacity-0',
  enterToClass: 'translate-y-0 opacity-100',
  leaveActiveClass:
    'transition-[opacity,translate] duration-press ease-brand motion-reduce:transition-none',
  leaveFromClass: 'translate-y-0 opacity-100',
  leaveToClass: '-translate-y-2 opacity-0',
}

export const SERVICES_HEADING_ID: string = 'services-heading'

export const navigationItems: NavItem[] = [
  { labelKey: 'nav.services', path: '/', hash: '#services', focusId: SERVICES_HEADING_ID },
  { labelKey: 'nav.quote', path: '/quote' },
  { labelKey: 'nav.contact', path: '/contact' },
]
