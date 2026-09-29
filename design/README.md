# Design references

Approved screens from the design canvas
(https://claude.ai/artifact/JMw6rX6wvskLtiwtLefZZ6). Reference only: build real React
components; never import these files. See `docs/DESIGN.md` §7 for how to read them.

Each screen has two drawings of the same markup, a phone one and a computer one; the
`@container` rules in each file's `<style>` block give the layout at every width
(DESIGN §5). Copied from canvas version 1790670143-1c97 on 29 Sep 2026.

| File | Screen | Size |
|---|---|---|
| Login.dc.html | Customer · Log in · phone | 390 × 844 |
| LoginDesktop.dc.html | Customer · Log in · computer | 1280 × 800 |
| Main.dc.html | Customer · Book a lesson · phone (interactive; script = reference logic) | 390 × 1460 |
| MainDesktop.dc.html | Customer · Book a lesson · computer (same script) | 1280 × 1000 |
| Schedule.dc.html | Customer · Schedule (week grid) · phone | 390 × 880 |
| ScheduleDesktop.dc.html | Customer · Schedule (week grid) · computer | 1280 × 1000 |
| MyClasses.dc.html | Customer · My classes & packages · phone | 390 × 1040 |
| MyClassesDesktop.dc.html | Customer · My classes & packages · computer | 1280 × 800 |
| AdminSchedule.dc.html | Coach · Week schedule · computer (interactive: day list for phones) | 1440 × 1120 |
| AdminSchedulePhone.dc.html | Coach · Day schedule · phone (interactive) | 390 × 1840 |
| AdminStudents.dc.html | Coach · Students & payments · computer (interactive: Record payment) | 1440 × 1040 |
| AdminStudentsPhone.dc.html | Coach · Students & payments · phone (interactive) | 390 × 1320 |
| AdminAddStudents.dc.html | Coach · Add students · computer (interactive) | 1440 × 1000 |
| AdminAddStudentsPhone.dc.html | Coach · Add students · phone (interactive) | 390 × 1320 |
| AdminSettings.dc.html | Coach · Settings · computer | 1440 × 1120 |
| AdminSettingsPhone.dc.html | Coach · Settings · phone | 390 × 2520 |

`screens/`: put a PNG screenshot of each drawing here with the same base name
(for example `Main.png`) so Claude Code can look at them.

Sample names, condos and dates in these files are made up. Prices show as [PRICE].
