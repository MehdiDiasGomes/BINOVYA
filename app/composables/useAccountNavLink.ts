import type { AccountNavIcon, AccountNavLink } from '@/types/account'

import { ACCOUNT_NAV_ICONS, ACCOUNT_NAV_LABEL_KEYS, ACCOUNT_NAV_PATHS } from '@/constants/account'

/**
 * Resolves the account entry link (customer login, customer area or admin area) from the session.
 * @returns Localized path, label key and icon of the account link
 */
export const useAccountNavLink = (): AccountNavLink => {
  const localePath = useLocalePath()
  const { status } = useCustomerSession()

  return {
    path: computed((): string => localePath(ACCOUNT_NAV_PATHS[status.value])),
    labelKey: computed((): string => ACCOUNT_NAV_LABEL_KEYS[status.value]),
    icon: computed((): AccountNavIcon => ACCOUNT_NAV_ICONS[status.value]),
  }
}
