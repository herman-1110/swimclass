/** Query keys for settings (ARCHITECTURE §3.6): features refresh them after a change. */
export const settingsKeys = {
  all: ['settings'] as const,
  /** get_public_settings: what every signed-in account may read. */
  public: () => [...settingsKeys.all, 'public'] as const,
}
