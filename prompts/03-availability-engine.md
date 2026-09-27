# Prompt 03: Availability engine (open hours, travel gap, clash reasons)

## CONTEXT
This is the heart of the system: which start times are free and, if not, why. It must
live in SQL so booking (prompt 04) and display (prompts 06–08) use the same rules.
Read PRD BR-8 to BR-12, BR-27, BR-29, BR-30 and TECH_SPEC §5.1 and §10.
`design/Main.dc.html` contains a JavaScript version of the same logic in its script
block (`startsFor`, `conflictFor`); use it to understand behaviour, not as code to copy.

## DIAGNOSE
1. Confirm prompt 02 is done: seed loaded, `group_balance` tests pass.
2. Confirm weekly rules in the seed: Mon–Fri 17:30–22:00; Sat–Sun 07:00–12:00 and
   16:00–22:00.
3. Report how you will compute "the MYT day" for a timestamptz before writing code.

## TASK
1. `open_windows(p_day date)`: weekly rules for the ISO weekday + 'open' exceptions
   overlapping the day, merged, minus 'closed' exceptions. Returns timestamptz ranges.
2. `slot_check(p_starts_at, p_minutes, p_group_id, p_viewer)`: checks in the
   exact order of TECH_SPEC §5.1; returns `ok`, `reason`, `detail` jsonb:
   - `overlap_mine`: `{starts_at, ends_at, names}` (names only because it's the viewer's)
   - `overlap_other`: `{starts_at, ends_at}` only
   - `gap_after`: `{ends_at}`; `gap_before`: `{starts_at}`
   New bookings always need the full gap; `gap_override` on an existing booking only
   changes how travel blocks are drawn. Cancelled/excused bookings are ignored.
3. `week_slots(p_week_start, p_minutes, p_group_id)`: every start in each open
   window (stepping `start_step_minutes` from the window start) for 7 days, with the
   check result. Customers may only pass their own group; the coach may pass any.
4. `week_busy(p_week_start)`: jsonb per day with `open`, `closed`, and `busy`
   blocks (`starts_at`, `ends_at`, `mine`, `travel_before`, `travel_after`).
   Never include names, locations, or other accounts' ids.
5. `coach_week(p_week_start)`: coach only; full details per booking (display_names,
   type_label, location, status, gap_override, account display name, unpaid flag).
6. Grants: customers get `week_slots` and `week_busy`; only the coach can run
   `coach_week` (check inside). Revoke from `anon`/`public`.

## VALIDATION
Write `tests/db/availability.test.ts` with `set local app.now = '2026-09-26 12:00+08'`:
- Free starts for the week of Mon 28 Sep for 60 and 120 minutes equal the table in
  TECH_SPEC §10 exactly (as meiling with the "Aiman & Sofia" group).
- Every reason listed under "Expected reasons" in TECH_SPEC §10 is returned with the
  right code and detail.
- `outside_window` for Mon 26 Oct; `past` for a time earlier on 26 Sep.
- Open exception Wed 7 Oct 15:00–17:30 adds the 3:00–5:00 pm starts that day only;
  adding a closed exception over it removes them.
- `week_busy` as meiling: her lessons have `mine = true`; the JSON contains none of
  the other customers' names or locations (search the serialized output).
- A customer calling `week_slots` with someone else's group gets `not_your_group`.
- Coach `coach_week` returns names; meiling calling it gets an error.
- HANDOFF.md updated.
