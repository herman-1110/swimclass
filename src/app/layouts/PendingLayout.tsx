import { AuthLayout } from './AuthLayout'
import { useBusinessName } from './useBusinessName'

/**
 * Waiting for approval: the sign-in card, but signed in, so it shows the settings' business
 * name (a waiting account may read them; auth spec §1.1, §2.6).
 */
export function PendingLayout() {
  const businessName = useBusinessName()
  return <AuthLayout businessName={businessName} />
}
