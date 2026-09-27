import { QueryClient } from '@tanstack/react-query'

// One query per RPC (TECH_SPEC §11). After booking or cancelling, invalidate
// week_slots, week_busy and group_balance.
export const queryClient = new QueryClient()
