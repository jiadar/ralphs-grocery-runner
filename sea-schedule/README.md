# Southeast Asia 2026 — Master Travel Schedule

## Overview

A multi-person, multi-destination travel schedule spanning May 8–Jun 19, 2026 across the Philippines, Shanghai, and Osaka. Built as an interactive React artifact with per-person filtering, flight tracking, BJJ session management, jet lag protocol deviation tracking, Show All/Collapse All, and Print PDF per person.

## People

| Person | Home | Role in Trip |
|--------|------|-------------|
| **Javin** | San Diego (Naic, Cavite when in PH) | Primary planner. CEO of Atchafalaya Hotels Intl. BJJ practitioner. Has jet lag protocol + recurring meetings. |
| **Jhoed** | San Diego | Travels with group through El Nido. Returns to Naic May 24. Departs MNL May 26. No BJJ. |
| **Nick** | San Francisco | Free May 12–Jun 19. Does ALL BJJ sessions with Javin. Goes to Zambia after Shanghai. Must be in SFO by Jun 19. |
| **Cody** | San Francisco | Arrives Shanghai Jun 1. Has a 2-week limit (SFO to SFO). Goes to Osaka after Shanghai. |

## Confirmed Flights

| Date | Route | Flight | Depart | Arrive | Who |
|------|-------|--------|--------|--------|-----|
| May 13 | LAX → MNL | PR 113 | 12:25pm | 6:00pm+1 | Javin, Jhoed |
| May 13 | SFO → MNL | TBD | TBD | TBD | Nick |
| May 18 | MNL → TAG (Bohol) | Z2 358 | 2:10pm | 3:30pm | Javin, Jhoed, Nick |
| May 21 | TAG → ENI (El Nido) | 5J 5611 | 3:40pm | 5:25pm | Javin, Jhoed, Nick |
| May 24 | ENI → MPH → MNL | T65410 + PR2044 | 2:25pm | 6:55pm | Javin, Jhoed, Nick |
| May 26 | MNL → NRT → SAN | JL0746 + JL0066 | 10:05am | 11:05am | Jhoed |
| May 31 | SFO → PVG (Shanghai) | CA7210 | 1:30pm | 5:25pm+1 | Cody |
| Jun 1 | MNL → PVG | PR 336 | 10:50am | 2:30pm | Javin, Nick |
| Jun 10 | PVG → YVR → SAN | AC26 + AC8766 | 3:55pm | 4:15pm | Javin |
| Jun 10 | PVG → KIX (Osaka) | 9C6581 | 3:10pm | 6:30pm | Cody |
| Jun 11 | PVG → ADD → LUN | ET685 + ET863 | 12:20am | 1:10pm | Nick |
| Jun 18 | LUN → DXB → SFO | EK714 + EK225 | 9:35pm | 2:00pm+1 | Nick |

## Trip Phases

### Phase 0: Pre-Flight Jet Lag Ramp (May 8–13, San Diego)
- Javin follows a 5-day westward delay protocol shifting sleep 90 min/day later
- Wake shifts from 7:00am → 1:00pm over 5 days
- Meal times shift with wake time (breakfast, lunch, dinner all shift 90 min later each day)
- Melatonin 0.5mg at bedtime each ramp night, 1mg on hotel night
- May 12: Airport hotel night (check-in 11pm, forced early sleep)
- May 13: Hotel alarm 8am, depart LAX 12:25pm

### Phase 1: Arrival + Naic (May 14–17)
- Arrive MNL 6pm May 14. Drive to Naic (family house), arrive ~9:30pm
- Jet lag 36-hour buffer: no activities until 9am May 16 (40 hrs post-Naic-arrival)
- May 16: First BJJ — Comp Training in Imus (Javin + Nick)
- May 17: Rest day

### Phase 2: Islands (May 18–25)
- **Bohol** (May 18–20): 3 nights Mon/Tue/Wed. No weekend stay. Bohol BJJ Mon + Wed evenings.
- **El Nido** (May 21–23): 3 nights Thu/Fri/Sat. Madness MMA Thu + Fri (Javin + Nick only).
- **May 24 (Sun)**: Fly El Nido → Caticlan (Boracay) → MNL. Drive MNL → Naic. All three together.
- **May 25 (Mon)**: Drive Naic → MNL. Dinner BGC. Motion BJJ 7–9pm. Hotel night. Jhoed's last night.

### Phase 3: BJJ Block (May 26–31, Naic)
- Jhoed departs MNL 10:05am May 26 (JAL via NRT to SAN)
- Javin + Nick: KMA May 26, then Comp Training Wed/Thu/Sat, Cavite City Fri
- May 31: Rest + pack for Shanghai

### Phase 4: Shanghai (Jun 1–10)
- Javin + Nick fly MNL → PVG Jun 1 (PR 336)
- Cody arrives PVG from SFO (departed May 31, CA7210)
- Shanghai is UTC+8 (same as Manila) — meetings stay 10pm–midnight local
- 7 full days (Jun 2–8, every day except Sunday Jun 7)
- Jun 9: Last day together (meeting night)
- Jun 10: Everyone departs — Javin to SAN, Cody to KIX, Nick stays for late-night Zambia flight

### Phase 5: Returns (Jun 10–19)
- Javin arrives SAN Jun 10 at 4:15pm (9 days before Jun 19 Monterrey)
- Nick departs PVG Jun 11 12:20am → Zambia (7 days Jun 11–17) → departs LUN Jun 18 → SFO Jun 19
- Cody in Osaka Jun 10+, returns SFO within 2-week window

## Hard Constraints

### Javin
- Depart LAX May 13 at 12:25pm, arrive MNL May 14 6:00pm
- BJJ Bohol 2x minimum
- BJJ Cavite City 1x minimum
- BJJ Comp Training 1x Saturday minimum, 1x Mon–Thu minimum
- BJJ Motion 1x minimum
- Nothing scheduled first 36 hours after Naic arrival (calculated from ~9:30pm May 14)
- Need 8-day jet lag buffer before Jun 19 Monterrey flight
- Travel with Nick the entire time until he leaves for Africa
- Travel with Jhoed at least 2/3 of the nights
- Travel with Cody for at least 6 days
- At most 1 BJJ per day
- 9 hours sleep every night
- Sleep immediately (5 min) after meetings end

### Jhoed
- Same LAX flight as Javin (PR 113 May 13)
- Departs MNL May 26 at 10:05am (JAL JL0746 MNL → NRT → SAN)
- Stays with group through El Nido, flies back to Naic May 24, hotel in MNL May 25
- No BJJ
- Must be in MNL hotel night before departure (May 25)
- Must leave hotel 6:15am on May 26 for flight

### Nick
- Free May 12 to Jun 19
- Trains ALL BJJ sessions with Javin (all 11)
- Needs 1 full week in Zambia (Jun 11–17)
- Must be in SFO by Jun 19

### Cody
- Departs SFO May 31 (CA7210 1:30pm → PVG 5:25pm+1)
- 2-week limit counted SFO to SFO
- Goes to Osaka after Shanghai (9C6581 PVG → KIX Jun 10)

## BJJ Scheduling Rules

- Add travel time each way from that day's base location
- Can only go to Cavite City and Comp Team from Naic
- Can go to Cavite City, KMA, Motion from Manila/Makati
- Add 15 minutes early arrival before class start (exceptions below)
- Bohol BJJ first night: no early arrival needed (always starts 15 min late)
- Comp Training: no early arrival needed (always starts 15 min late)
- Bohol BJJ: 45 min chit chat after class, return always by car (45 min)
- Comp Training: 1 hour shower + chat after class
- Motion: 15 min post-class buffer
- Madness MMA + FCP: 1 hour session, 30 min travel each way, 30 min shower after

### BJJ Gym Schedules (all times local)
- **KMA**: Location Makati/Manila. Tue/Thu 12–2pm or 7–9pm
- **Motion**: Location Manila (15 min walk from BGC). Mon/Thu 7–9pm; Fri 10am–12pm
- **Bohol BJJ**: Location Bohol. Mon/Wed/Fri 6:30–8:30pm
- **Cavite City**: Location Cavite City. Fri 5:30–9:00pm
- **Comp Training**: Location Imus. Mon/Tue/Wed/Thu/Sat 1:00–3:00pm
- **Madness MMA**: Location El Nido. Flexible scheduling.

### BJJ Sessions (11 total)

| # | Date | Day | Gym | Notes | Who |
|---|------|-----|-----|-------|-----|
| 1 | May 16 | Sat | Comp Training | 1/4 | Javin, Nick |
| 2 | May 18 | Mon | Bohol BJJ | Bohol 1/2 | Javin, Nick |
| 3 | May 20 | Wed | Bohol BJJ | Bohol 2/2 | Javin, Nick |
| 4 | May 21 | Thu | Madness MMA | El Nido | Javin, Nick |
| 5 | May 22 | Fri | Madness MMA | El Nido | Javin, Nick |
| 6 | May 25 | Mon | Motion | Manila | Javin, Nick |
| 7 | May 26 | Tue | KMA | Manila | Javin, Nick |
| 8 | May 27 | Wed | Comp Training | 2/4 | Javin, Nick |
| 9 | May 28 | Thu | Comp Training | 3/4 | Javin, Nick |
| 10 | May 29 | Fri | Cavite City | | Javin, Nick |
| 11 | May 30 | Sat | Comp Training | 4/4 | Javin, Nick |

## Travel Time Constants

### Naic ↔ Manila
- 2.5–3 hours each way by car (morning traffic adds ~30 min)
- When in MNL, prefer not to stay in hotel — drive back to Naic if no MNL activity next day

### Naic ↔ Imus (Comp Training)
- Bus: 2.5 hours each way (less traffic late night: ~1.5 hrs)
- Drive: 1.5 hours
- Scooter: 1 hour
- Depart 10:30am (bus) / 11:15am (drive) / 11:45am (scooter) for 1pm class

### Naic ↔ Cavite City
- Same travel times as Imus
- Late night bus return: 1.5 hrs (less traffic)

### Makati → Naic
- 3 hours

### Bohol town ↔ Bohol BJJ
- Bus: 1.5 hours each way
- Car: 45 minutes each way
- Return always by car

### Airport Rules
- 1.5 hours early for domestic flights
- 3 hours early for international flights
- 2 hours early for May 25 Busuanga departure (Jhoed cannot miss connection) — NOTE: no longer applicable after Coron was removed
- Bohol airport to town: 1 hour (exit airport 40 min + tuk tuk 25 min to town)

### Shanghai
- City to PVG airport: 1 hour

### Restaurant Closing Times
- Bohol: 10pm (one late-night schwarma shop open at 10:45pm)
- El Nido: 9pm (must be seated by 8:45pm)

## Jet Lag Protocol (Javin)

### Pre-flight Ramp (May 8–12, San Diego)
Westward delay: shift sleep 90 min later each day.

| Day | Date | Wake | Sleep | Hours |
|-----|------|------|-------|-------|
| Fri | May 8 | 7:00am | 10:00pm | 9 |
| Sat | May 9 | 8:30am | 11:30pm | 9 |
| Sun | May 10 | 10:00am | 1:00am | 9 |
| Mon | May 11 | 11:30am | 2:30am | 9 |
| Tue | May 12 | 1:00pm | 11:00pm (hotel) | 9 |
| Wed | May 13 | 8:00am (alarm) | On plane | — |

### Post-arrival Protocol (May 14–21, Philippines)
- Sleep: 1:00am local, Wake: 10:00am local, 9 hours
- Seek light: 7:00am–1:00pm local
- Meals: Breakfast 10:30am, Lunch 12–1pm, Dinner 10:30pm
- Melatonin: 0.5–1mg at 1:00am lights-out
- Status progression: Critical (Day 1–2) → Moderate (Day 3–4) → Good (Day 5–8)
- Protocol complete after May 21

### Protocol Deviation Tracking
- 🟡 ≤ 1 hour deviation from protocol
- 🔴 > 1 hour deviation from protocol
- Track only during protocol period (May 14–21)
- On non-meeting nights during protocol: shift bedtime 1 hour earlier, dinner 2 hours earlier

### Protocol Deviations

| Date | Item | Protocol | Actual | Deviation | Icon |
|------|------|----------|--------|-----------|------|
| May 14 | Dinner | 10:30pm | 9:30pm | 1hr early | 🟡 |
| May 15 | Dinner | 10:30pm | 8:30pm | 2hr early | 🔴 |
| May 15 | Bed | 1:00am | 12:00am | 1hr early | 🟡 |
| May 16 | Wake | 10:00am | 9:00am | 1hr early | 🟡 |
| May 16 | Breakfast | 10:30am | 9:30am | 1hr early | 🟡 |
| May 16 | Dinner | 10:30pm | 8:30pm | 2hr early | 🔴 |
| May 16 | Bed | 1:00am | 12:00am | 1hr early | 🟡 |
| May 17 | Wake | 10:00am | 9:00am | 1hr early | 🟡 |
| May 17 | Breakfast | 10:30am | 9:30am | 1hr early | 🟡 |
| May 17 | Dinner | 10:30pm | 8:30pm | 2hr early | 🔴 |
| May 17 | Bed | 1:00am | 12:30am | 30min early | 🟡 |
| May 18 | Wake | 10:00am | 9:30am | 30min early | 🟡 |
| May 18 | Breakfast | 10:30am | 9:45am | 45min early | 🟡 |
| May 18 | Bed | 1:00am | 12:00am | 1hr early | 🟡 |
| May 19 | Dinner | 10:30pm | 9:00pm | 1.5hr early | 🔴 |
| May 20 | Wake | 10:00am | 9:00am | 1hr early | 🟡 |
| May 20 | Breakfast | 10:30am | 9:30am | 1hr early | 🟡 |
| May 20 | Bed | 1:00am | 12:00am | 1hr early | 🟡 |
| May 21 | Dinner | 10:30pm | 8:45pm | 1hr 45min early | 🔴 |

## Javin's Sleep Schedule

### During Protocol (May 14–21)
- Meeting nights (Tue/Thu): Meeting ends midnight, bed 12:05am, wake 10:00am (9hrs)
- Non-meeting nights: Bed 12:00am–12:30am, wake 9:00am–9:30am (9hrs)
- Exception May 18: Wake 9:30am (30 min protocol deviation for Bohol flight)

### Post-Protocol Philippines (May 22–31)
- Non-meeting nights: Bed 11:00pm, wake 8:00am (9hrs)
- Meeting nights: Bed 12:00am, wake 9:00am (9hrs)
- Exception May 31: Bed 9:00pm, wake 6:00am (9hrs — early Jun 1 departure)

### Shanghai (Jun 1–10)
- Same timezone as Manila (UTC+8). Meetings stay 10pm–midnight local.
- Meeting nights (Tue/Thu): Meeting ends midnight, bed 12:05am, wake 9:00am (9hrs)
- Non-meeting nights: Bed 11:00pm, wake 8:00am (9hrs)

## Javin's Meetings
- Recurring: Tuesday and Thursday, 7:00–9:00am San Diego time (PDT)
- Philippines equivalent: 10:00pm–midnight PHT (UTC+8)
- Shanghai equivalent: 10:00pm–midnight CST (UTC+8) — same as Philippines
- Sleep immediately after meeting ends (5 minutes buffer)

## Soft Constraints

### General
- Travel together when possible
- If traveling from Manila before noon, stay in Manila the night before
- Prefer to land around 1–3pm at destinations
- Prefer to depart midday (around 11am–noon)
- Minimize hotel nights in Manila/Makati — prefer Naic family home
- ~~Minimize trips to/through Manila~~ — relaxed for final routing

### Javin
- Prefer BJJ in Manila/Makati when it fits
- Prefer Comp Training when other constraints are met (maximize sessions)
- No rest days during Naic BJJ block — train every available day
- Bohol limited to 3 nights, no weekend stay (boring there)

### Shanghai
- Javin wants 6+ full days excluding travel days
- Every day except Sunday
- Originally was Osaka; changed to Shanghai based on Javin's preference + better flight routing
- Same timezone as Manila — no meeting time shift needed

### Removed Destinations
- **Coron** — removed. Originally planned 2 nights with FCP BJJ. Replaced with extra El Nido night and direct El Nido → MNL flight.
- **Osaka (as Javin destination)** — replaced by Shanghai. Cody goes to Osaka solo after Shanghai.

## Files

- `sea-master-schedule.jsx` — Interactive React artifact with 4 tabs (Daily Schedule, Flights, BJJ, Protocol Deviations), per-person filtering, Show All/Collapse All, and Print PDF per person
- `data.json` — Structured data export of the complete schedule
- `jetlag-protocol-outbound-2026-03-19.json` — Original jet lag protocol JSON from Javin's jet lag planner tool
- `README.md` — This file

## Technical Notes for the React Artifact

### Architecture
- Single-file React component with all data embedded as constants
- Per-person filtering via `who` arrays on schedule items
- Phase-based color coding with sidebar indicators
- Expandable day cards with time tables (individual toggle + Show All/Collapse All)
- Person initials shown in brackets [J], [N], [JN] when viewing "All"

### Features
- **Show All / Collapse All**: Toggles every day card open/closed at once. Individual card clicks still work independently.
- **Print PDF**: Dropdown with 5 options — Master Schedule or any individual person. Swaps to clean white print layout, triggers browser print dialog, returns to dark UI after.
- **Per-person filtering**: Each tab (Schedule, Flights, BJJ) filters to show only that person's items.

### Filtering Logic
- `filterSchedule(items, person)`: If a schedule item has no `who` field, it's shown to everyone present that day. If it has a `who` array, it's only shown to those people.
- Flights tab and BJJ tab filter by matching person name in the `who` string field.
- A day card is hidden entirely if the filtered schedule has 0 items and no notes.

### Key Data Structures
- `DAYS[]`: Array of day objects with date, location, people, schedule items, sleep, notes, flags
- `FLIGHTS[]`: Flat array with date, route, flight number, times, who
- `BJJ_DATA[]`: 11 sessions with gym, count notation, who
- `DEVIATIONS[]`: Protocol deviation table with icon colors

### Design
- Dark theme (bg #0F1419)
- DM Sans body + JetBrains Mono for times/data
- Color-coded tags: flight (blue), bjj (amber), meeting (purple), transport (gray)
- Phase colors on left border of day cards
- Amber gradient header ("Southeast Asia 2026")

## Iteration History

This schedule went through 15+ iterations. Key decision points:

1. **v1**: Initial plan with 2025 calendar (wrong). Caught by user with May 2026 screenshot.
2. **v2**: Corrected to 2026 calendar. Reshuffled BJJ due to day-of-week changes.
3. **v3**: Added Bohol→El Nido direct flight (eliminated a Manila transit).
4. **v4–v5**: Refined El Nido/Coron split, added Madness MMA and FCP.
5. **v6**: Removed Motion constraint temporarily, added FCP on May 24, Madness MMA on May 21.
6. **v7**: Restored Motion on May 25, finalized 2-night Coron.
7. **Jet lag integration**: Mapped protocol onto schedule, identified conflicts with early flights.
8. **Flight research**: User provided actual flight screenshots for all legs.
9. **Detailed timetable**: Full daily schedule with exact times, transport options (bus/drive/scooter), meal timing, melatonin, sleep blocks.
10. **Shanghai pivot**: Changed from Osaka to Shanghai based on user feedback + better flight routing. Shanghai same timezone as Manila — meetings stay 10pm–midnight.
11. **Jhoed stays with group**: Originally split at El Nido; changed to stay through Coron with everyone.
12. **Nick return shift**: Pushed Zambia return +1 day for full 7 days (Jun 18 departure, SFO Jun 19).
13. **Coron removed entirely**: Replaced with extra El Nido night. Direct AirSwift+PAL Express flight El Nido → Caticlan → MNL on May 24. FCP BJJ dropped (was bonus, not required). BJJ count went from 12 → 11.
14. **Nick does all BJJ**: Added to every session alongside Javin.
15. **Per-person schedules**: Each person gets their own filtered view — Jhoed sees no BJJ, Cody sees only Shanghai+Osaka, etc.
