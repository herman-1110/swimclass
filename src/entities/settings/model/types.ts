import type { FunctionResult, Row } from '@/shared/api/rpc'

type PublicSettingsRow = FunctionResult<'get_public_settings'>[number]

/**
 * What every signed-in account may read about the business (TECH_SPEC §5.4). The generated
 * types say the prices and payment instructions are always there; they are null until the
 * coach sets them (HANDOFF v0.5, open issues; data-contracts §6.1).
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

/**
 * The whole settings row (TECH_SPEC §3), as the coach reads it. The generated table type is
 * right as it is: prices, payment instructions and lesson expiry may be null. Times of day
 * come as "20:00:00".
 */
export type CoachSettings = Row<'settings'>
