import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { emailLogKeys } from '../api/keys'
import { EMAIL_LOG_AVAILABLE } from '../api/useEmailLog'
import { EmailLogSection } from './EmailLogSection'

afterEach(cleanup)

describe('EmailLogSection', () => {
  it('shows nothing and asks for nothing until the database has email_log()', async () => {
    expect(EMAIL_LOG_AVAILABLE).toBe(false)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <EmailLogSection />
      </QueryClientProvider>,
    )
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(container.innerHTML).toBe('')
    const log = queryClient.getQueryCache().find({ queryKey: emailLogKeys.list(50) })
    expect(log?.state.fetchStatus).toBe('idle')
    expect(log?.state.dataUpdateCount).toBe(0)
    expect(log?.state.errorUpdateCount).toBe(0)
  })
})
