import { BOOKING_SUBMIT_ERROR_KEYS } from '@/constants/booking'
import { isInvalidAddressError } from '@/utils/fetchError'
import { focusFirstElement } from '@/utils/focus'

type AddressErrorState = {
  errorKey: Ref<string | null>
  catchInvalidAddress: (error: unknown) => boolean
  focusAddress: () => Promise<void>
  clear: () => void
}

/**
 * Shares the error shown on an address field when the server rejects the signed address, so the
 * booking and quote forms handle `invalidAddress` the same way.
 * @param inputId - Id of the address input, also used as the key of the shared state
 * @returns Translation key of the error, the error catcher, the focus helper and a reset
 */
export const useAddressError = (inputId: string): AddressErrorState => {
  const errorKey: Ref<string | null> = useState<string | null>(
    `address-error-${inputId}`,
    () => null,
  )

  const catchInvalidAddress = (error: unknown): boolean => {
    if (!isInvalidAddressError(error)) {
      return false
    }
    errorKey.value = BOOKING_SUBMIT_ERROR_KEYS.invalidAddress
    return true
  }

  const focusAddress = async (): Promise<void> => {
    await nextTick()
    focusFirstElement([inputId])
  }

  const clear = (): void => {
    errorKey.value = null
  }

  return { errorKey, catchInvalidAddress, focusAddress, clear }
}
