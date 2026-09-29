/** Query keys for accounts, so features can refresh them after a change. */
export const accountKeys = {
  all: ['account'] as const,
  me: (userId: string | null) => [...accountKeys.all, 'me', userId] as const,
}
