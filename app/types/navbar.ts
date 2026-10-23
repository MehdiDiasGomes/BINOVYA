export type NavItem = {
  labelKey: string
  path: string
  hash?: string
  focusId?: string
}

export type AnchorNavigationOutcome = 'ignored' | 'currentPage' | 'otherPage'

export type AnchorNavigationHandler = (
  event: MouseEvent,
  item: NavItem,
) => Promise<AnchorNavigationOutcome>
