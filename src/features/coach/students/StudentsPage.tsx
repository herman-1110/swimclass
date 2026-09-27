import { Link } from 'react-router'
import { PlaceholderPage } from '../../../components/PlaceholderPage'

export function StudentsPage() {
  return (
    <PlaceholderPage
      title="Students & payments"
      description="Every group's package, balance and payments."
      builtIn="09"
      variant="coach"
    >
      <p className="m-0">
        <Link to="/coach/students/new" className="inline-flex min-h-11 items-center font-semibold">
          Add students
        </Link>
      </p>
    </PlaceholderPage>
  )
}
