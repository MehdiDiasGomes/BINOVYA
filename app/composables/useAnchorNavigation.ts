import type { AnchorNavigationHandler, AnchorNavigationOutcome, NavItem } from '@/types/navbar'

import { isPlainLeftClick } from '@/utils/click'

/**
 * Handles a click on a localized nav item, anchor included. Only a plain primary click is
 * intercepted and routed in the app; any other click lets the browser follow the link's href.
 * @returns Click handler resolving to whether the click was ignored, or led to the current or another page
 */
export const useAnchorNavigation = (): AnchorNavigationHandler => {
  const localePath = useLocalePath()
  const route = useRoute()

  return async (event: MouseEvent, item: NavItem): Promise<AnchorNavigationOutcome> => {
    if (!isPlainLeftClick(event)) {
      return 'ignored'
    }
    event.preventDefault()
    const path: string = localePath(item.path)
    const isCurrentPage: boolean = route.path === path
    await navigateTo({ path, hash: item.hash })
    return isCurrentPage ? 'currentPage' : 'otherPage'
  }
}
