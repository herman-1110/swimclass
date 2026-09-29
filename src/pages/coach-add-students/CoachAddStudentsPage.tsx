import { Link } from 'react-router'
import { PlaceholderPage } from '../../../components/PlaceholderPage'

export function AddStudentsPage() {
  return (
    <PlaceholderPage
      title="Add students"
      description="Set up a group of 1 to 3 students from one account, with its pool location and starting balance."
      builtIn="09"
      variant="coach"
    >
      <p className="m-0">
        <Link to="/coach/students" className="inline-flex min-h-11 items-center">
          Back to students & payments
        </Link>
      </p>
    </PlaceholderPage>
  )
}
