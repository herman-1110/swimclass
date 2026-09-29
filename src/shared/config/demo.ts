/**
 * Demo mode (`shared/api/demo`) runs the seed with the database clock stopped at the
 * moment the seed's expected results assume (TECH_SPEC §10; tests/db/fixture.ts
 * FIXTURE_NOW: keep them in step). Screens use the same moment as "now"
 * (`shared/lib/time`), so the demo looks like the drawings in `design/`.
 */
export const DEMO_NOW = '2026-09-26T12:00:00+08:00'

/** Every seeded account's password: public sample data for development only (DEV_SETUP §3). */
export const DEMO_PASSWORD = 'swim-test-2026'
