import { Link } from 'react-router'

import { ROUTES } from '@/shared/config/routes'
import { PlaceholderPage } from '@/shared/ui/PlaceholderPage'

export function ForgotPasswordPage() {
  return (
    <PlaceholderPage
      title="Forgot your password?"
      description="Enter your email and we'll send you a link to set a new password."
      builtIn="05"
      variant="auth"
    >
      <p className="m-0">
        <Link to={ROUTES.login} className="inline-flex min-h-11 items-center">
          Back to log in
        </Link>
      </p>
    </PlaceholderPage>
  )
}
