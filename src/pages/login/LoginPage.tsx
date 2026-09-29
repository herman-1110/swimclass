import { Link } from 'react-router'
import { PlaceholderPage } from '@/shared/ui/PlaceholderPage'
import { ROUTES } from '@/shared/config/routes'

export function LoginPage() {
  return (
    <PlaceholderPage
      title="Welcome back"
      description="Log in to book lessons and check your package."
      builtIn="05"
      variant="auth"
    >
      <p className="m-0 flex flex-col items-start">
        <Link to={ROUTES.forgotPassword} className="inline-flex min-h-11 items-center">
          Forgot username or password?
        </Link>
        <Link to={ROUTES.signup} className="inline-flex min-h-11 items-center">
          New here? Create an account
        </Link>
      </p>
      <p className="m-0 text-small text-muted">
        Your coach approves new accounts before you can book.
      </p>
    </PlaceholderPage>
  )
}
