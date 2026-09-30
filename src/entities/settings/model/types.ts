import type { FunctionResult } from '@/shared/api/rpc'

type PublicSettingsRow = FunctionResult<'get_public_settings'>[number]

/**
 * What every signed-in account may read about the business (TECH_SPEC §5.4). The generated
 * types say the prices and payment instructions are always there; they are null until the
 * coach sets them (HANDOFF v0.5, open issues).
 */
export type PublicSettings = Omit<
  PublicSettingsRow,
  'price_1to1_cents' | 'price_1to2_cents' | 'price_1to3_cents' | 'payment_instructions'
> & {
  price_1to1_cents: number | null
  price_1to2_cents: number | null
  price_1to3_cents: number | null
  payment_instructions: string | null
}
