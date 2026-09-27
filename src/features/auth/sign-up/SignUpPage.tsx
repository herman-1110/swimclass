import { Link } from 'react-router'
import { PlaceholderPage } from '../../../components/PlaceholderPage'

export function SignUpPage() {
  return (
    <PlaceholderPage
      title="Create an account"
      description="Sign up with a username, your name, email and phone. Your coach approves new accounts before you can book."
      builtIn="05"
      variant="auth"
    >
      <p className="m-0">
        <Link to="/login" className="inline-flex min-h-11 items-center">
          Already have an account? Log in
        </Link>
      </p>
    </PlaceholderPage>
  )
}
