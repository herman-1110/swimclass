import { QueryClient } from '@tanstack/react-query'

import { AppError } from './rpc'

// One query per RPC (TECH_SPEC §11). After booking or cancelling, invalidate
// week_slots, week_busy and group_balance.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A refusal from the database won't change on a second try; a dropped connection might.
      retry: (failures, error) =>
        error instanceof AppError && error.code === 'network' && failures < 2,
      staleTime: 30_000,
    },
    mutations: { retry: false },
  },
})
