// What the database tests know about supabase/seed.sql (TECH_SPEC §10): the clock its
// expected results assume, and the fixed ids of the rows tests refer to, so tests don't
// repeat magic values. Keep it in step with seed.sql (and SEED_FINGERPRINT in helpers.ts).

/** Sat 26 Sep 2026, 12:00 MYT: the clock the seed's expected results assume (TECH_SPEC §10). */
export const FIXTURE_NOW = '2026-09-26 12:00+08'

/** Fixed ids from supabase/seed.sql. */
export const SEED = {
  groups: {
    aimanSofia: 'c0000000-0000-4000-8000-000000000001',
    sofia: 'c0000000-0000-4000-8000-000000000002',
    hana: 'c0000000-0000-4000-8000-000000000003',
    weiJie: 'c0000000-0000-4000-8000-000000000004',
    priya: 'c0000000-0000-4000-8000-000000000005',
    adamAlyaAmir: 'c0000000-0000-4000-8000-000000000006',
    junHao: 'c0000000-0000-4000-8000-000000000007',
    chloe: 'c0000000-0000-4000-8000-000000000008',
    ethan: 'c0000000-0000-4000-8000-000000000009',
    kai: 'c0000000-0000-4000-8000-000000000010',
    daniel: 'c0000000-0000-4000-8000-000000000011',
    aina: 'c0000000-0000-4000-8000-000000000012',
    nurul: 'c0000000-0000-4000-8000-000000000013',
  },
  students: {
    aiman: 'b0000000-0000-4000-8000-000000000001',
    sofia: 'b0000000-0000-4000-8000-000000000002',
    hana: 'b0000000-0000-4000-8000-000000000003',
    adam: 'b0000000-0000-4000-8000-000000000006',
  },
  bookings: {
    aimanSofiaSat26: 'd0000000-0000-4000-8000-000000000001',
    aimanSofiaSat3: 'd0000000-0000-4000-8000-000000000002',
    sofiaSun4: 'd0000000-0000-4000-8000-000000000003',
    weiJieFri18: 'd0000000-0000-4000-8000-000000000006',
    weiJieFri25: 'd0000000-0000-4000-8000-000000000007',
    weiJieFri2: 'd0000000-0000-4000-8000-000000000008',
    priyaTue29: 'd0000000-0000-4000-8000-000000000009',
    junHaoMon28: 'd0000000-0000-4000-8000-000000000013',
    chloeSun4: 'd0000000-0000-4000-8000-000000000014',
    ethanSat26: 'd0000000-0000-4000-8000-000000000015',
  },
} as const
