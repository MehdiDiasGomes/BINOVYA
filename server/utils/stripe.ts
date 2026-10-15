import Stripe from 'stripe'

let stripeClient: Stripe | null = null

/**
 * Returns the shared Stripe client, created on first use from the server secret key.
 * @returns Stripe client
 */
export const useStripe = (): Stripe => {
  if (stripeClient) {
    return stripeClient
  }
  const { stripeSecretKey } = useRuntimeConfig()
  if (!stripeSecretKey) {
    throw createError({ statusCode: 503, statusMessage: 'Payment unavailable' })
  }
  stripeClient = new Stripe(stripeSecretKey)
  return stripeClient
}
