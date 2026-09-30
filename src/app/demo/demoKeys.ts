/** Query keys for demo mode's own tools (never part of the real site). */
export const demoKeys = {
  all: ['demo'] as const,
  accounts: () => [...demoKeys.all, 'accounts'] as const,
  mailbox: () => [...demoKeys.all, 'mailbox'] as const,
}
