# Jet Lag Planner — Claude Code Handoff README

This document captures the full context of the project: what was built, the science and
calculation logic behind every decision, known issues, and what to work on next. Load this
into Claude Code to continue where we left off.

---

## What This Is

A personal, privacy-first jet lag protocol generator for **Javin**, a San Diego-based
executive/athlete who travels frequently to **Manila, Philippines** and **West Sumatra,
Indonesia** for 3–5 week stays. The app generates a science-based, day-by-day plan covering:

- Light exposure (when to seek it, when to avoid it)
- Melatonin timing and dosage
- Sleep windows with exact in-bed and wake times
- In-flight meal timing for long-haul legs (>8h)
- Pre-flight ramp schedule (up to 7 days of gradual clock shifting)
- Post-arrival recovery protocol
- Meeting conflict alerts (recurring PDT meetings shown in destination local time)

**No third-party apps, no data collection, no accounts.** Runs entirely in the browser.
Exports to Markdown (copy to clipboard) and PDF (browser print dialog).

---

## File Structure

```
jetlag-planner/
├── jetlag.config.yaml        ← personal defaults (edit this for each trip)
├── vite.config.js            ← includes yamlPlugin()
├── vite-plugin-yaml.js       ← zero-dependency YAML→JS transform for Vite
└── src/
    ├── jetlag-planner.jsx    ← entire app, single file
    ├── App.jsx               ← just: import JetLagPlanner; export default () => <JetLagPlanner />
    └── index.css             ← minimal reset: * { box-sizing: border-box; margin: 0; padding: 0; }
```

---

## Setup

```bash
nvm install 22 && nvm use 22
npm create vite@latest jetlag-planner -- --template react
cd jetlag-planner
npm install
# Place files as above, then:
npm run dev
```

Open `http://localhost:5173`.

---

## The Science — Circadian Biology

### Primary Sources

Research from the **Biological Rhythms Research Laboratory at Rush University Medical
Center** (Eastman, Burgess) forms the core of the protocol. Key papers:

- Eastman & Burgess (2009) — "How to Travel the World Without Jet Lag"
- Burgess et al. — "Using Bright Light and Melatonin to Reduce Jet Lag"
- Revell & Eastman — adaptation guides for 7–9h shifts
- CDC Yellow Book (2025) — clinical guidelines for jet lag disorder
- Frontiers in Physiology (2019) — interventions for westward and eastward flight

### Core Concepts

**Circadian pacemaker (SCN):** The suprachiasmatic nucleus in the hypothalamus drives a
~24h clock. It entrains primarily to light, with secondary signals from food timing,
exercise, and melatonin.

**CBTmin (Core Body Temperature Minimum):** The daily low point of the circadian cycle,
approximately **2 hours before habitual wake time**. This is the pivot point for all
light-timing decisions:
- Light exposure **before** CBTmin → phase **delay** (clock shifts later)
- Light exposure **after** CBTmin → phase **advance** (clock shifts earlier)
- The largest shifts occur in the 3–6h window either side of CBTmin

**Peripheral clocks:** Every organ (liver, gut, pancreas, lungs) has its own molecular
clock. These respond strongly to meal timing. Eating at destination meal times accelerates
re-entrainment independently of the brain's master clock.

**Westward vs. Eastward:**
- Westward flight (SD → Asia): clock needs to **delay** ~9h. Body shifts ~1.5h/day
  naturally. Easier. Recovery: ~6 days.
- Eastward flight (Asia → SD): clock needs to **advance** ~15h. Body advances ~1h/day.
  Much harder. Recovery: 9–10 days without protocol.

**Melatonin:** Only time cue other than light that directly shifts the SCN.
- Evening melatonin → phase advance (clock earlier)
- Morning melatonin → phase delay (clock later)
- Dose: 0.5–1 mg fast-release. Higher doses (>3 mg) stay in the system too long and
  confuse the clock.
- Must be combined with correct light timing — melatonin alone without matching light
  exposure has reduced effect.

**Sleep duration and recovery:** Sleep debt impairs the adaptive capacity of the
circadian system. Javin needs **9 hours of actual sleep** plus a **45-minute wind-down
buffer** = 9h 45m total in bed. All sleep windows in the plan are computed from these
values, not assumed.

---

## Calculation Logic

### Time Zone Math

```
HOME_UTC = -7  (San Diego PDT)
Manila   = UTC+8   → diff = 8 - (-7) = +15h ahead of SD
Sumatra  = UTC+7   → diff = 7 - (-7) = +14h ahead of SD

Westward shift needed (outbound): 24 - diff
  Manila:  24 - 15 = 9h delay
  Sumatra: 24 - 14 = 10h delay

Eastward shift needed (return):   diff
  Manila:  15h advance
  Sumatra: 14h advance
```

### Sleep Window Calculation

All sleep windows are computed from the user's sleep needs, not assumed:

```
totalBedMin       = bedtimeBuffer + sleepDuration * 60
                  = 45 + 9*60 = 585 min (9h 45m)

lightsOutMin      = (wakeHour * 60 - totalBedMin) mod 1440
                  = (7*60 - 585) mod 1440
                  = (-165 + 1440) mod 1440
                  = 1275 min = 21.25h = 9:15 PM

sleepOnsetMin     = lightsOutMin + bedtimeBuffer = 1275 + 45 = 1320 = 10:00 PM
```

Two separate sleep windows are computed:
- **Home sleep window** — based on `wakeHour` (SD wake time)
- **Destination sleep window** — based on `destWakeHour` (may differ from home)

### CBTmin Calculation

```
cbTminHome = (wakeHour - 2 + 24) % 24
           = (7 - 2 + 24) % 24 = 5 AM

cbTminDest = (destWakeHour - 2 + 24) % 24
```

Pre-flight advice uses `cbTminHome`. Post-arrival advice uses `cbTminDest`.

### Pre-Flight Ramp (Outbound / Delay)

The ramp shifts wake time **later by 45 minutes per day** going backward from
the departure wake time (hotel wake or home alarm):

```
Day -1: wake = depDayWakeHour               (e.g. 8:00 AM hotel)
Day -2: wake = depDayWakeHour + 45min       (8:45 AM)
Day -3: wake = depDayWakeHour + 90min       (9:30 AM)
...
Capped at 12:00 PM noon — beyond that is unrealistic.
```

Sleep time for each ramp day: `lightsOut = wake - totalBedMin`, capped at 2:00 AM max.
This preserves a full sleep duration throughout the ramp. The actual sleep hours are
computed and displayed on every day card.

**Key research insight:** Sleep debt actively worsens jet lag adaptation. The ramp
should preserve full sleep duration rather than maximizing the phase shift at the cost
of sleep quality.

### Hotel Night (Day -1) Special Case

When `useHotel = true`, day -1 is split into two cards:

1. **Home → Hotel card**: Normal ramped schedule during the day. Drive to airport hotel
   ~90 min before check-in. Melatonin at check-in. Sleep window computed from check-in
   time + buffer → hotel wake time.

2. **Hotel Departure Morning card**: Wake at hotel wake time. Morning hotel light
   reinforces the delay shift. By day -1 of a 7-day ramp, CBTmin has shifted to
   approximately `hotelWakeTime - 2h`, meaning the hotel wake falls right at or just
   after CBTmin — morning light at this time causes phase delay (correct direction).

**Why hotel is better than leaving from home:**
The original home alarm was 5:45 AM. After a 7-day ramp, CBTmin has shifted to ~6 AM.
Waking at 5:45 AM means exposure to morning light *before* the shifted CBTmin, which
causes a phase advance — partially undoing the ramp. The hotel option (8 AM wake) lands
after the shifted CBTmin, so morning light reinforces rather than reverses the shift.

### In-Flight Meal Timing

For flights >8 hours, the plan calculates which destination meal windows (breakfast 7–9 AM,
lunch 12–2 PM, dinner 6–8 PM destination time) fall during the flight, and tells the
traveler exactly when to eat in terms of:
- Destination local time
- Elapsed hours into the flight
- Departure-local equivalent time (for reference)

**LAX → MNL (12:20 PM departure, arrives next day 6:00 PM Manila):**
- Departure = 12:20 PDT = 3:20 AM PHT next day
- Flight duration ≈ 14.7h
- Manila breakfast (7 AM) falls about 4.2h into the flight
- Manila lunch (12 PM) falls about 9.2h in

The traveler is told: spend the first half of the flight normally (eat, work, stay awake).
Around 11 PM SD time (~10.7h in), take melatonin and sleep. Resist sleeping through
arrival morning.

### Post-Arrival Recovery (Outbound)

All post-arrival times are in **destination local time**. The stable daily target is:

```
stableBedH  = destLightsOutHour  (e.g. 9:15 PM Manila)
stableWakeH = destWakeHour       (e.g. 7:00 AM Manila)
sleepH      = sleepDuration      (9h actual sleep)
```

Day 1 is arrival day (arrives 6 PM Manila). The plan tells the traveler to:
- Stay awake until lights-out (9:15 PM Manila = ~6 AM SD time, so about 3h after arrival)
- Sleep the full 9h → wake 7 AM Manila
- Avoid morning light (before 10 AM) which would advance the clock (wrong direction for
  westward traveler still adjusting)

### Red-Eye Detection Logic

A flight is treated as a "long-haul / sleep-window crossing" event if:
```javascript
const lateDepart = depHour >= 22 || depHour < 5;
const nextDayArr = arrDate > depDate;
const isRedEye   = lateDepart || nextDayArr;
```

This correctly catches a 12:20 PM LAX departure that arrives the next day.

### Meeting Conversion (PDT → Destination Local)

```javascript
destMeetingStart = (pdtHour - HOME_UTC + destUtc + 24) % 24
                 = (7 - (-7) + 8 + 24) % 24
                 = (7 + 7 + 8 + 24) % 24
                 = 46 % 24 = 22  →  10:00 PM Manila
```

Tuesday/Thursday 7–9 AM PDT = **10:00 PM – 12:00 AM Manila time**.

---

## User Profile (Javin)

| Setting | Value |
|---|---|
| Home timezone | San Diego, PDT (UTC-7) |
| Home wake | 7:00 AM |
| Home bedtime | 11:00 PM |
| Sleep needed | 9 hours |
| Wind-down buffer | 45 minutes |
| Total time in bed | 9h 45m |
| Destination wake | 7:00 AM |
| Destinations | Manila (PHT, UTC+8), West Sumatra (WIB, UTC+7) |
| Typical stay | 3–5 weeks |
| Pre-flight ramp | 7 days |
| Recurring meetings | Team standup, Tue & Thu, 7–9 AM PDT |
| Departure | LAX 12:20 PM → MNL 6:00 PM next day |
| Hotel night | Yes — check in 11 PM night before, wake 8 AM |
| Notes | Athlete — sleep quality is non-negotiable. 9h is a hard requirement, not a preference. |

---

## Config File (`jetlag.config.yaml`)

All user defaults are stored in `jetlag.config.yaml` at the project root. The Vite build
system imports it at compile time via `vite-plugin-yaml.js` (zero npm dependencies).

To update for a new trip: change `outbound_legs.dep_date` and `arr_date` in the YAML and
restart the dev server. All other settings persist automatically.

The YAML plugin handles the subset of YAML used in the config: scalars, nested objects,
arrays of objects, inline arrays, and comments. For advanced YAML features, swap the
parser in `vite-plugin-yaml.js` for `js-yaml`.

---

## Known Issues & Remaining Work

### 1. Post-arrival Day 1 timing still needs validation
Day 1 at Manila: arrival is 6:00 PM local. The plan currently uses `stableBedH`
(9:15 PM) as the target sleep time from the first night. This gives ~3.25h of awake
time post-arrival, which is reasonable, but the breakfast time on Day 1 shows as
"7:30–8:00 AM local" even though the traveler is asleep at that point (they just arrived
at 6 PM the day before). Day 1 meals should account for the arrival time — breakfast
should only appear if it falls after the traveler is awake. **Fix needed: skip meal
slots on Day 1 that fall before `arrivalTime + 1h`.**

### 2. Pre-flight ramp for return direction is less developed
The return (eastward) pre-flight ramp shifts sleep/wake *earlier* by 45 min/day.
The logic exists but hasn't been as carefully tested or refined as the outbound ramp.
The research says eastward pre-shifting is genuinely beneficial (Eastman specifically
tested this), but the current implementation doesn't account for the asymmetry — advances
are harder than delays, so the ramp rate should be closer to 30–40 min/day, not 45.

### 3. HOME_UTC is hardcoded to -7 (PDT)
San Diego is UTC-8 during standard time (November–March). The current code always uses
-7. For winter travel, this causes all PDT-referenced times to be off by 1 hour.
**Fix: auto-detect offset from departure date, or add a PDT/PST toggle to the config.**

### 4. Destination meal times on Day 1 use `destWakeHour` not arrival time
On Day 1, breakfast shows `destWakeHour + 0.5h` which may be before the traveler
actually arrives. Should use `max(arrivalTime + 1h, destWakeHour + 0.5h)`.

### 5. The pre-flight ramp cap (noon) is hard-coded
The `Math.min(..., 12 * 60)` cap is pragmatic but blunt. On a 7-day ramp the last
two days both cap at noon, meaning the plan shows the same wake time twice. A better
approach would be to extend the ramp smoothly and show the traveler they've hit the
practical ceiling, or suggest reducing ramp days if the cap is hit too early.

### 6. PDF export doesn't include the hotel card
The `hotel` day type is handled in the interactive view but the PDF's `typeColor` /
`typeBg` / `typeTag` helpers were updated — verify the hotel card actually renders
correctly in the print output.

### 7. Markdown export may not include all new fields
The `generateMarkdown()` function was last updated before `destWakeHour`, `sleepDuration`,
`bedtimeBuffer`, and meeting data were added to the config snapshot. Verify it outputs
the full sleep window detail per day.

### 8. Return legs default dates are empty strings
In the YAML config, `return_legs.dep_date` and `arr_date` are empty. `cfgLegs()` falls
back to `todayStr()` / `offsetDate(1)` for empty dates, which works but could produce
confusing pre-filled dates in the return direction UI.

---

## Architecture Notes

### Single-file component
`jetlag-planner.jsx` is intentionally one file (~1500 lines). No external component
libraries, no state management beyond `useState`. This was a deliberate choice for
portability and auditability. If it grows significantly, consider splitting into:
- `generatePlan.js` — pure calculation logic (no React)
- `ConfigPanel.jsx`
- `PlanView.jsx`
- `generateMarkdown.js` and `generatePDF.js`

### Key functions

| Function | Purpose |
|---|---|
| `generatePlan(config)` | Core engine — returns `{ days[], shiftNeeded, daysToAdjust, isDelay, cbTmin, destInfo }` |
| `getMealSchedule(leg, isOutbound, destOffset)` | Calculates destination-timed meals for long-haul legs |
| `getMeetingsForDate(dateObj, isAtDest)` | Returns meetings for a given calendar day with local time conversions |
| `generateMarkdown(plan, config)` | Produces full Markdown export string |
| `handlePrintPDF()` | Builds standalone HTML, opens new tab, triggers print |
| `cfgLegs()` / `cfgMeetings()` / `cfgHour()` | Config YAML → React state helpers |

### Day card types

| Type | Color | Meaning |
|---|---|---|
| `pre` | Dark blue | Pre-flight ramp days |
| `hotel` | Blue | Hotel departure morning |
| `flight` | Gold | Flight day(s) |
| `post` + status `critical` | Red | Days 1–3 post-arrival (hardest) |
| `post` + status `moderate` | Amber | Days 4–5 post-arrival |
| `post` + status `good` | Green | Days 6+ post-arrival |

---

## Conversation History Summary

This app was built iteratively across a long conversation. Key milestones in order:

1. **Initial build** — Basic outbound/return direction, Manila/Sumatra destinations, light
   and melatonin protocol cards per day.
2. **Itinerary input** — Multi-segment flight entry with local departure/arrival times and
   dates replacing generic departure date.
3. **Red-eye detection** — Fixed to catch next-day arrivals, not just late-night
   departures. LAX 12:20 PM → MNL 6:00 PM next day correctly flagged.
4. **In-flight meal timing** — For legs >8h, destination-timed meal windows calculated
   and shown with elapsed-time-into-flight reference.
5. **Airport logistics** — Departure day fields (wake, leave home, airport arrival).
   Pre-flight ramp anchors to actual departure-morning wake time.
6. **Configurable pre-flight ramp** — Slider 3–7 days with live description of shift
   produced. Defaults to 7 days.
7. **Markdown export** — "Copy as Markdown" button, full structured export.
8. **PDF export** — Print-optimized HTML in new tab, browser "Save as PDF".
9. **Sleep duration inputs** — `sleepDuration` (hours of actual sleep) and
   `bedtimeBuffer` (wind-down minutes). All wake/sleep times computed from these.
   Defaults: 9h sleep, 45min buffer = 9h 45m in bed.
10. **Destination wake time** — Separate from home wake time. Post-arrival sleep windows
    use `destWakeHour` not `wakeHour`.
11. **Meeting alerts** — Recurring PDT meetings shown in destination local time with
    alertness strategies on affected days.
12. **Airport hotel option** — Toggle in departure logistics. When enabled, day -1 splits
    into two cards (home→hotel transfer, hotel departure morning). Live sleep calculator
    shows whether check-in/wake combo achieves target sleep hours.
13. **YAML config** — `jetlag.config.yaml` for all personal defaults. Zero-dependency
    Vite plugin (`vite-plugin-yaml.js`) to import YAML at build time.
14. **Bug fixes** — Post-arrival Day 1 bed time was computing to 7 AM instead of 9:15 PM
    due to `Math.min(23, destLightsOutHour + offset)` formula overflow. Fixed to use
    `stableBedH = destLightsOutHour` directly. Pre-flight ramp capped at noon wake.
    Red-eye warning banner text updated to reflect actual departure type.

---

## Prompts That Produced Key Decisions

> "I travel frequently from San Diego to Manila and West Sumatra. It takes me several days
> to get adjusted when I fly there, and 9-10 days to get adjusted when I return."

→ Established westward shift (~9h delay, easier) vs. eastward return (~15h advance, harder).

> "I'm an athlete and typically need 9 hours of sleep, and to be in bed for 9 hours and
> 45 minutes."

→ Replaced generic 7-8h sleep assumption. All windows now computed from user-specific values.

> "Would it be better to sleep closer to the airport? We could get to a hotel next to the
> airport by 11 PM the previous night, and then we wouldn't need to wake up until 8 AM."

→ Major protocol improvement. Resolved the CBTmin conflict caused by 5:45 AM home alarm.

> "What does the research say about accepting sleep debt to bank the clock shift?"

→ Research says sleep debt impairs adaptation. Ramp should preserve full sleep duration.
Sleep debt before travel worsens jet lag, not just the symptoms.

> "Why does it say I have a 1 AM departure when my departure is mid-day 12:20 PM?"

→ Warning banner had hardcoded "1 AM" text from an earlier specific scenario. Fixed to
dynamically describe the actual departure type.
