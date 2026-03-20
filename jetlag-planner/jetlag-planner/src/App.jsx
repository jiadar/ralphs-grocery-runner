import { useState } from "react";
import cfg from "../jetlag.config.yaml";

// ── Config helpers ────────────────────────────────────────────────────────────
// Parse "HH:MM" from config into integer hour
function cfgHour(timeStr, fallback) {
  if (!timeStr) return fallback;
  const h = parseInt(timeStr.split(":")[0]);
  return isNaN(h) ? fallback : h;
}
// Build default legs from config
function cfgLegs(legList, fallbackFn) {
  if (!legList || !legList.length) return fallbackFn();
  return legList.map((l, i) => ({
    id: i + 1,
    depCity: l.from || "",
    depTime: l.dep_time || "12:00",
    depDate: l.dep_date || todayStr(),
    arrCity: l.to || "",
    arrTime: l.arr_time || "12:00",
    arrDate: l.arr_date || offsetDate(1),
  }));
}
// Build default meetings from config
function cfgMeetings(meetingList) {
  if (!meetingList || !meetingList.length) return [];
  return meetingList.map((m, i) => ({
    id: i + 1,
    label: m.label || "Meeting",
    days: Array.isArray(m.days) ? m.days : [],
    startHour: cfgHour(m.start, 9),
    endHour: cfgHour(m.end, 10),
  }));
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DESTINATIONS = {
  manila:    { name: "Manila, Philippines",    short: "Manila",    tzLabel: "PHT", utcOffset: 8 },
  sumatra:   { name: "West Sumatra, Indonesia", short: "Sumatra",  tzLabel: "WIB", utcOffset: 7 },
  san_diego: { name: "San Diego, CA",           short: "San Diego", tzLabel: "PDT", utcOffset: -7 },
};
const HOME_UTC = -7; // PDT

// Lat/lng for destination sunrise calculations (±1° accuracy, sufficient for circadian timing)
const CITY_COORDS = {
  // Southeast / East Asia
  manila:       { lat:  14.60, lng:  120.98 },
  sumatra:      { lat:  -0.90, lng:  100.37 }, // Padang, West Sumatra
  singapore:    { lat:   1.35, lng:  103.82 },
  bangkok:      { lat:  13.75, lng:  100.50 },
  jakarta:      { lat:  -6.21, lng:  106.85 },
  kuala_lumpur: { lat:   3.14, lng:  101.69 },
  bali:         { lat:  -8.34, lng:  115.09 },
  tokyo:        { lat:  35.68, lng:  139.69 },
  osaka:        { lat:  34.69, lng:  135.50 },
  seoul:        { lat:  37.57, lng:  126.98 },
  hong_kong:    { lat:  22.33, lng:  114.17 },
  taipei:       { lat:  25.03, lng:  121.56 },
  shanghai:     { lat:  31.23, lng:  121.47 },
  beijing:      { lat:  39.91, lng:  116.39 },
  // South Asia
  delhi:        { lat:  28.61, lng:   77.21 },
  mumbai:       { lat:  19.07, lng:   72.88 },
  // Middle East
  dubai:        { lat:  25.20, lng:   55.27 },
  // Europe
  london:       { lat:  51.51, lng:   -0.13 },
  paris:        { lat:  48.85, lng:    2.35 },
  amsterdam:    { lat:  52.37, lng:    4.90 },
  frankfurt:    { lat:  50.11, lng:    8.68 },
  madrid:       { lat:  40.42, lng:   -3.70 },
  rome:         { lat:  41.90, lng:   12.50 },
  // Americas (return legs)
  san_diego:    { lat:  32.72, lng: -117.16 },
  new_york:     { lat:  40.71, lng:  -74.01 },
  chicago:      { lat:  41.88, lng:  -87.63 },
  toronto:      { lat:  43.65, lng:  -79.38 },
  // Pacific
  sydney:       { lat: -33.87, lng:  151.21 },
  auckland:     { lat: -36.86, lng:  174.76 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, "0"); }

function fmtHr(h) {
  const totalMin = Math.round(((h % 24) + 24) % 24 * 60);
  const hr = Math.floor(totalMin / 60) % 24;
  const min = totalMin % 60;
  const ampm = hr >= 12 ? "PM" : "AM";
  const disp = hr % 12 === 0 ? 12 : hr % 12;
  return `${disp}:${pad(min)} ${ampm}`;
}

function fmtHrMin(totalMin) {
  const h = (Math.floor(totalMin / 60) % 24 + 24) % 24;
  const m = ((totalMin % 60) + 60) % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const disp = h % 12 === 0 ? 12 : h % 12;
  return `${disp}:${pad(m)} ${ampm}`;
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d;
}

// Parse "HH:MM" to total minutes
function timeToMin(t) {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return h * 60 + (m || 0);
}

// Convert local minutes to UTC minutes
function toUTC(localMin, utcOffset) {
  return localMin - utcOffset * 60;
}

// Convert UTC minutes to destination local minutes
function utcToLocal(utcMin, destOffset) {
  return utcMin + destOffset * 60;
}

// Compute flight duration in hours between two local times at different offsets, with day offset
function legDurationHours(depTime, depOffset, arrTime, arrOffset, arrDayOffset) {
  const depUTC = toUTC(timeToMin(depTime), depOffset);
  const arrUTC = toUTC(timeToMin(arrTime), arrOffset) + arrDayOffset * 24 * 60;
  return (arrUTC - depUTC) / 60;
}

// ─── Meal timing calculator ───────────────────────────────────────────────────
// For flights >8h, calculate when to eat based on destination meal times.
// Standard meal windows: Breakfast 7-9, Lunch 12-14, Dinner 18-20.
// Returns array of { mealName, destLocalTime, flightMinElapsed, note }
// mealTzOffset: the timezone to schedule meals in (defaults to destOffset).
// Keep destOffset for dep/arr UTC offset calcs; mealTzOffset only controls meal window timing.
function getMealSchedule(leg, isOutbound, destOffset, mealTzOffset) {
  if (mealTzOffset === undefined) mealTzOffset = destOffset;
  // depLocalOffset/arrLocalOffset always use the actual city offsets for correct duration math.
  const depLocalOffset = isOutbound ? HOME_UTC : destOffset;
  const arrLocalOffset = isOutbound ? destOffset : HOME_UTC;

  // Determine day offset (arr date - dep date)
  const depDateObj = new Date(leg.depDate + "T12:00:00");
  const arrDateObj = new Date((leg.arrDate || leg.depDate) + "T12:00:00");
  const arrDayOffset = Math.round((arrDateObj - depDateObj) / (24 * 3600 * 1000));

  const durationHrs = legDurationHours(leg.depTime, depLocalOffset, leg.arrTime, arrLocalOffset, arrDayOffset);
  if (durationHrs < 8) return null; // Only for long haul

  const depUTC = toUTC(timeToMin(leg.depTime), depLocalOffset);

  // Destination meal windows in meal-target timezone (minutes since midnight)
  const destMeals = [
    { name: "Breakfast", windowStart: 7 * 60, windowEnd: 9 * 60, icon: "🌄" },
    { name: "Lunch",     windowStart: 12 * 60, windowEnd: 14 * 60, icon: "☀️" },
    { name: "Dinner",    windowStart: 18 * 60, windowEnd: 20 * 60, icon: "🌆" },
  ];

  const meals = [];

  // Check each destination meal time over flight span
  // Flight covers depUTC to depUTC + durationHrs*60 (UTC)
  const flightEndUTC = depUTC + durationHrs * 60;

  // Check 2 days worth of destination meal windows to catch all that fall during flight
  for (let dayOffset = -1; dayOffset <= 2; dayOffset++) {
    for (const meal of destMeals) {
      // Middle of meal window
      const mealDestLocal = meal.windowStart + 30 + dayOffset * 24 * 60;
      const mealUTC = toUTC(mealDestLocal, mealTzOffset);

      if (mealUTC >= depUTC && mealUTC <= flightEndUTC) {
        const elapsedMin = mealUTC - depUTC;
        const elapsedHrs = elapsedMin / 60;

        // Convert elapsed time back to departure-local time for clarity
        const depLocalAtMeal = timeToMin(leg.depTime) + elapsedMin;
        const depLocalHr = ((Math.floor(depLocalAtMeal / 60)) % 24 + 24) % 24;
        const depLocalMin = ((depLocalAtMeal % 60) + 60) % 60;

        // Destination local time display
        const destHr = ((Math.floor(mealDestLocal / 60)) % 24 + 24) % 24;

        let note = "";
        if (meal.name === "Breakfast") {
          note = isOutbound
            ? "Eat even if your body says it's the middle of the night — this anchors your gut clock to destination morning."
            : "Eat a light breakfast on SD time to start your advance. Protein helps alertness.";
        } else if (meal.name === "Lunch") {
          note = isOutbound
            ? "Have a proper meal here — avoid snacking outside these windows between meals."
            : "Your body may not feel hungry yet (it thinks it's early morning). Eat anyway — a light meal locks in the new schedule.";
        } else {
          note = isOutbound
            ? "Keep dinner light if you plan to sleep after. Avoid heavy carbs that cause blood sugar crashes mid-sleep."
            : "This is your last meal before landing. Keep it light — your digestion is already stressed.";
        }

        meals.push({
          mealName: meal.name,
          icon: meal.icon,
          destLocalTime: fmtHr(destHr),
          depLocalTime: `${(depLocalHr % 12 === 0 ? 12 : depLocalHr % 12)}:${pad(depLocalMin)} ${depLocalHr >= 12 ? "PM" : "AM"}`,
          elapsedHrs: Math.round(elapsedHrs * 10) / 10,
          note,
        });
      }
    }
  }

  // Sort by elapsed time
  meals.sort((a, b) => a.elapsedHrs - b.elapsedHrs);
  return { meals, durationHrs: Math.round(durationHrs * 10) / 10 };
}

// ─── Circadian utilities ──────────────────────────────────────────────────────
// NOAA solar formula — returns sunrise as a decimal hour in destination local clock time.
// Accurate to ±2 min for latitudes between 60°S and 60°N.
function calcSunriseHour(lat, lng, dateStr, utcOffsetHours) {
  const date = new Date(dateStr + "T12:00:00Z");
  const JD = date.getTime() / 86400000 + 2440587.5;
  const T = (JD - 2451545.0) / 36525.0;
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const Mrad = M * Math.PI / 180;
  const C = (1.914602 - T * (0.004817 + 0.000014 * T)) * Math.sin(Mrad)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
          + 0.000289 * Math.sin(3 * Mrad);
  const sunLon = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambdaRad = (sunLon - 0.00569 - 0.00478 * Math.sin(omega * Math.PI / 180)) * Math.PI / 180;
  const sinDec = Math.sin(23.439291 * Math.PI / 180) * Math.sin(lambdaRad);
  const dec = Math.asin(sinDec);
  const y = Math.tan((23.439291 / 2) * Math.PI / 180) ** 2;
  const L0rad = L0 * Math.PI / 180;
  const EOT = 4 * (180 / Math.PI) * (
    y * Math.sin(2 * L0rad)
    - 2 * 0.016708634 * Math.sin(Mrad)
    + 4 * 0.016708634 * y * Math.sin(Mrad) * Math.cos(2 * L0rad)
    - 0.5 * y * y * Math.sin(4 * L0rad)
    - 1.25 * 0.016708634 * 0.016708634 * Math.sin(2 * Mrad)
  );
  const latRad = lat * Math.PI / 180;
  const cosHA = (Math.cos(90.833 * Math.PI / 180) - Math.sin(latRad) * sinDec)
              / (Math.cos(latRad) * Math.cos(dec));
  if (cosHA > 1) return 24;  // polar night
  if (cosHA < -1) return 0;  // polar day
  const HA = Math.acos(cosHA) * 180 / Math.PI;
  const solarNoonUTC = 720 - 4 * lng - EOT;
  const sunriseUTC = solarNoonUTC - 4 * HA;
  return ((sunriseUTC / 60 + utcOffsetHours) % 24 + 24) % 24;
}

// Simplified Phase Response Curve (PRC) based on Czeisler/Eastman research.
// Returns home-timezone decimal hours for the light seek/avoid windows.
// Delay (westward): light 2–8h after CBTmin delays the clock (right direction).
//                   light within 4h before CBTmin or 0–2h after advances (wrong direction — avoid).
// Advance (eastward): mirror image.
function calcPRCWindows(cbTminH, direction) {
  const m24 = h => ((h % 24) + 24) % 24;
  if (direction === "delay") {
    return { seekStart: m24(cbTminH + 2), seekEnd: m24(cbTminH + 8),
             avoidStart: m24(cbTminH - 4), avoidEnd: m24(cbTminH + 2) };
  }
  return { seekStart: m24(cbTminH - 4), seekEnd: m24(cbTminH + 2),
           avoidStart: m24(cbTminH + 2), avoidEnd: m24(cbTminH + 8) };
}

// ─── Plan generator ───────────────────────────────────────────────────────────
function generatePlan({ direction, dest, legs, wakeHour, destWakeHour = 7, sleepHour, sleepDuration = 9, bedtimeBuffer = 45, meetings = [], depDayWake, leaveHomeTime, airportArrTime, useHotel = false, hotelCheckinTime, hotelWakeTime, preFlightDays = 3, protocolTiming = "before" }) {
  const destInfo = DESTINATIONS[dest];
  const destUtc = destInfo.utcOffset;
  const diff = destUtc - HOME_UTC;

  const isOutbound = direction === "outbound";
  // Compute both shift paths around the clock and pick the shorter one.
  // For SD→Manila (diff=15): delayShift=9, advanceShift=15 → delay wins.
  // For Manila→SD (return): delayShift=15, advanceShift=9 → advance wins.
  const rawDiff = ((destUtc - HOME_UTC) % 24 + 24) % 24;
  const delayShift   = isOutbound ? (rawDiff === 0 ? 0 : 24 - rawDiff) : rawDiff;
  const advanceShift = isOutbound ? rawDiff : (rawDiff === 0 ? 0 : 24 - rawDiff);
  // Prefer delay (physiologically easier) when shifts are within 2h of each other
  const isDelay = delayShift <= advanceShift + 2;
  const shiftNeeded = isDelay ? delayShift : advanceShift;

  // CBTmin uses home wake for pre-flight, destination wake for post-arrival outbound
  const cbTminHome = ((wakeHour - 2) + 24) % 24;
  const cbTminDest = ((destWakeHour - 2) + 24) % 24;
  const cbTmin = cbTminHome; // used for pre-flight light advice (SD-based)

  const daysToAdjust = isDelay ? Math.ceil(shiftNeeded / 1.5) : Math.ceil(shiftNeeded / 1.1);

  // Sleep window at HOME
  const totalBedMin = bedtimeBuffer + sleepDuration * 60;
  const lightsOutMin = ((wakeHour * 60 - totalBedMin) % (24 * 60) + 24 * 60) % (24 * 60);
  const lightsOutHour = lightsOutMin / 60;
  const sleepOnsetHour = (lightsOutMin + bedtimeBuffer) % (24 * 60) / 60;

  // Sleep window at DESTINATION (uses destWakeHour)
  const destLightsOutMin = ((destWakeHour * 60 - totalBedMin) % (24 * 60) + 24 * 60) % (24 * 60);
  const destLightsOutHour = destLightsOutMin / 60;

  // Meeting helpers: given a calendar date object, find any meetings that day and return
  // their local time at destination (for outbound) or at SD (for return)
  const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  function getMeetingsForDate(dateObj, isAtDest) {
    const dow = dateObj.getDay(); // 0=Sun
    return meetings.filter(m => m.days.includes(dow)).map(m => {
      if (isAtDest) {
        // Convert PDT meeting time to destination local time (works for both directions:
        // outbound traveler is at dest, return pre-flight traveler is still at dest)
        const destMeetingStart = (m.startHour - HOME_UTC + destUtc + 24) % 24;
        const destMeetingEnd   = (m.endHour   - HOME_UTC + destUtc + 24) % 24;
        return { ...m, localStart: fmtHr(destMeetingStart), localEnd: fmtHr(destMeetingEnd), tzLabel: destInfo.tzLabel, pdtStart: fmtHr(m.startHour), pdtEnd: fmtHr(m.endHour) };
      } else {
        return { ...m, localStart: fmtHr(m.startHour), localEnd: fmtHr(m.endHour), tzLabel: "PDT", pdtStart: fmtHr(m.startHour), pdtEnd: fmtHr(m.endHour) };
      }
    });
  }

  const firstLeg = legs[0];
  const lastLeg = legs[legs.length - 1];
  const firstDepDate = firstLeg.depDate;

  // When using hotel: departure morning wake = hotelWakeTime (e.g. 8:00 AM) — much later than home alarm
  // When not using hotel: departure morning wake = depDayWake (e.g. 5:45 AM)
  const depDayWakeMin = useHotel && hotelWakeTime
    ? timeToMin(hotelWakeTime)
    : depDayWake ? timeToMin(depDayWake) : wakeHour * 60;
  const depDayWakeHour = depDayWakeMin / 60;

  const days = [];

  // ── CIRCADIAN RAMP PRE-COMPUTATION ──────────────────────────────────────────
  // Destination sunrise — the primary biological anchor.
  // CBTmin (core body temperature minimum) occurs ~30 min before sunrise in a
  // well-entrained person. Sunrise is therefore the correct ramp target, not the
  // departure-day logistics (hotel wake time).
  const destCoords = CITY_COORDS[dest];
  const destSunriseHour = destCoords
    ? calcSunriseHour(destCoords.lat, destCoords.lng, firstDepDate, destUtc)
    : destWakeHour - 0.5; // fallback: just before target wake

  // Home (SD) sunrise — anchor for return-trip ramp
  const homeCoords = CITY_COORDS["san_diego"];
  const homeSunriseHour = homeCoords
    ? calcSunriseHour(homeCoords.lat, homeCoords.lng, firstDepDate, HOME_UTC)
    : wakeHour - 0.5;

  // Target CBTmin expressed in HOME timezone.
  // destCBTminLocal ≈ sunrise − 0.5h; convert to home tz by subtracting the UTC offset diff.
  const destCBTminLocal    = destSunriseHour - 0.5;
  const destCBTminInHomeTz = ((destCBTminLocal - (destUtc - HOME_UTC)) % 24 + 24) % 24;

  // Departure-day logistics (hotel wake) — referenced in notes, not used as the ramp target.
  const depDayCBTmin = ((depDayWakeHour - 2) + 24) % 24;

  // Total CBTmin shift using the shorter path determined by isDelay.
  const cbTminShiftRaw = ((destCBTminInHomeTz - cbTminHome + 24) % 24); // positive = delay direction
  const cbTminShiftTotal = isDelay
    ? Math.min(cbTminShiftRaw, shiftNeeded)
    : -Math.min(24 - cbTminShiftRaw, shiftNeeded);

  // Max physiological shift rate: 1.5 h/day delay, 1.0 h/day advance (Czeisler/Eastman).
  const rampRateHr = isDelay ? 1.5 : 1.0;

  // Distribute evenly across pre-flight days, capped at physiological rate.
  const shiftPerDay = preFlightDays > 0
    ? Math.sign(cbTminShiftTotal) * Math.min(rampRateHr, Math.abs(cbTminShiftTotal) / preFlightDays)
    : 0;

  // ── PRE-FLIGHT ────────────────────────────────────────────────────────────
  // Only generate pre-flight ramp days when protocol runs before the flight.
  // When protocol is "after", the active ramp happens post-arrival instead.
  let preFlightTerminalCBTmin;

  if (protocolTiming === "before")
  for (let i = -preFlightDays; i < 0; i++) {
    const d = addDays(firstDepDate, i);
    const label = `${Math.abs(i)} day${Math.abs(i) > 1 ? "s" : ""} before departure`;
    let seekLight, avoidLight, melatonin, sleep, wake, meals, notes;

    if (isDelay) {
      // ── CBTmin-tracking delay ramp ─────────────────────────────────────────
      // dayIndex 0 = first ramp day (furthest from departure, home schedule)
      // dayIndex preFlightDays-1 = day before departure (most shifted)
      const daysOut = Math.abs(i);
      const dayIndex = preFlightDays - daysOut;
      const todayCBTmin = ((cbTminHome + shiftPerDay * dayIndex) + 24) % 24;
      const targetWakeHour = ((todayCBTmin + 2) + 24) % 24;
      const targetWakeMin  = targetWakeHour * 60;
      const targetLightsOutMin = ((targetWakeMin - totalBedMin) % (24 * 60) + 24 * 60) % (24 * 60);
      const targetSleepOnsetMin = (targetLightsOutMin + bedtimeBuffer) % (24 * 60);
      const actualSleepMin = ((targetWakeMin - targetSleepOnsetMin) % (24 * 60) + 24 * 60) % (24 * 60);
      const actualSleepHrs = Math.round(actualSleepMin / 60 * 10) / 10;
      const prc = calcPRCWindows(todayCBTmin, "delay");
      const shiftMinPerDay = Math.round(Math.abs(shiftPerDay) * 60);

      if (i === -1 && useHotel && hotelCheckinTime && hotelWakeTime) {
        // ── HOTEL OPTION: split day -1 into two cards ──────────────────────
        const hotelCheckinMin  = timeToMin(hotelCheckinTime);
        const hotelWakeMin     = timeToMin(hotelWakeTime);
        const hotelSleepOnset  = hotelCheckinMin + bedtimeBuffer;
        const hotelActualSleepMin = ((hotelWakeMin - hotelSleepOnset) % (24 * 60) + 24 * 60) % (24 * 60);
        const hotelActualSleepHrs = Math.round(hotelActualSleepMin / 60 * 10) / 10;
        const leaveForHotelTime = fmtHrMin(hotelCheckinMin - 90);

        // How many hours before natural sleep onset is the hotel check-in?
        // Natural sleep onset = targetSleepOnsetMin (from ramp). Gap tells us how hard
        // it will be to fall asleep at check-in and how much melatonin work is needed.
        const naturalSleepOnsetMin = targetSleepOnsetMin;
        const forcedEarlyHrs = Math.round(
          ((naturalSleepOnsetMin - hotelSleepOnset + 24 * 60) % (24 * 60)) / 60 * 10
        ) / 10;
        // Hours early the hotel alarm wakes vs natural wake
        const alarmEarlyHrs = Math.round(
          ((targetWakeMin - hotelWakeMin + 24 * 60) % (24 * 60)) / 60 * 10
        ) / 10;

        wake       = fmtHrMin(targetWakeMin);
        sleep      = `${fmtHrMin(hotelCheckinMin)} (check in) · ${hotelActualSleepHrs}h sleep`;
        seekLight  = `Seek bright light ${fmtHr(prc.seekStart)}–${fmtHr(prc.seekEnd)} — this is 2–8h after your CBTmin (${fmtHr(todayCBTmin)}) and delays your clock toward destination time.`;
        avoidLight = `Avoid bright light before ${fmtHr(prc.avoidEnd)} (light before CBTmin+2h would advance your clock in the wrong direction). From ${fmtHrMin(hotelCheckinMin - 120)}: dim screens and blue-light glasses for the drive. Keep hotel room dark on arrival — darkness reinforces the forced sleep onset.`;
        melatonin  = `1 mg melatonin at hotel check-in (${hotelCheckinTime}). Your shifted body won't naturally want to sleep for another ~${forcedEarlyHrs}h — melatonin + a fully dark room is what makes this work. Don't go lower than 1 mg tonight.`;
        meals = [
          { icon: "🌄", name: "Breakfast",  time: fmtHrMin(targetWakeMin + 30),   note: "Eat right at your shifted wake — gut clock anchoring" },
          { icon: "☀️", name: "Lunch",      time: fmtHrMin(targetWakeMin + 5*60), note: "Meals follow the shifted wake — later each day reinforces the westward shift" },
          { icon: "🌆", name: "Dinner",     time: `Before ${leaveForHotelTime}`,  note: "Eat before leaving home — don't eat at the hotel, it's past your shifted dinner window" },
        ];
        notes = `CBTmin today: ${fmtHr(todayCBTmin)} → natural wake ${fmtHrMin(targetWakeMin)}. Your ramp has shifted your clock ~${Math.round(Math.abs(shiftPerDay * (preFlightDays - 1)) * 10) / 10}h toward Manila time over the past ${preFlightDays - 1} days. Tonight is the hard part: your body won't naturally want to sleep until ~${fmtHrMin(naturalSleepOnsetMin)}, but hotel check-in is ${hotelCheckinTime}. Take 1 mg melatonin immediately on check-in, put on your sleep mask, and keep the room completely dark. Expect to lie awake for a bit — that's normal. The ${hotelWakeTime} alarm will come ~${alarmEarlyHrs}h before your natural wake, and you will feel it. This is expected and does not undo your ramp — your circadian phase has shifted; this is one night of override. The plane resets the rest.`;
        days.push({ type: "pre", label: `Night before — Home → Airport Hotel`, date: formatDate(d), wake, sleep, seekLight, avoidLight, melatonin, meals, notes });

        // Card B: departure morning at hotel
        days.push({
          type: "hotel",
          label: `🏨 Departure Morning — Airport Hotel`,
          date: formatDate(addDays(firstDepDate, 0)),
          wake: hotelWakeTime,
          sleep: "—",
          seekLight: `Open the curtains immediately on waking — bright light now is ~${Math.round(alarmEarlyHrs)}h before your shifted CBTmin (${fmtHr(todayCBTmin)}), which slightly advances your clock back toward home time. That's acceptable: the flight and destination light will take over. Step outside briefly before the terminal.`,
          avoidLight: `Blue-light glasses from 90 min before boarding. Terminal lighting is bright and uncontrolled — sunglasses through security.`,
          melatonin: `No melatonin this morning. You may feel groggy — that's your shifted clock being overridden by the alarm, not a sign the ramp failed. Caffeine is fine.`,
          meals: [
            { icon: "🌄", name: "Hotel breakfast", time: fmtHrMin(hotelWakeMin + 45), note: "Eat even if not hungry — your gut clock needs anchoring before the long flight" },
            { icon: "☀️", name: "Airport lunch",   time: "At airport — destination time", note: `Switch to destination time at the gate. Eat only if it aligns with a Manila meal window (sunrise ~${fmtHr(destSunriseHour)} local)` },
          ],
          notes: `The ${hotelWakeTime} alarm is ~${alarmEarlyHrs}h before your shifted natural wake (${fmtHrMin(targetWakeMin)}). Expect real grogginess — this is not a sign the ramp failed. Your underlying CBTmin has shifted to ${fmtHr(todayCBTmin)}, which is ~${Math.round(((todayCBTmin - cbTminHome + 24) % 24) * 10) / 10}h closer to Manila time than when you started. No rush this morning. Check out, walk to the terminal, switch your watch to destination time at the gate. Board and sleep mask on immediately.`,
          flightMealSections: [],
        });
      } else {
        // ── Standard ramp day (no hotel, or days earlier than day -1) ──────
        wake  = fmtHrMin(targetWakeMin);
        sleep = `${fmtHrMin(targetLightsOutMin)} (in bed) · ${actualSleepHrs}h sleep`;
        seekLight  = `Bright light ${fmtHr(prc.seekStart)}–${fmtHr(prc.seekEnd)} — 2–8h after your CBTmin (${fmtHr(todayCBTmin)}), which delays your clock toward destination time.`;
        avoidLight = i === -1
          ? `Stay functional this morning — avoid prolonged bright light before ${fmtHr(prc.avoidEnd)} if you can, but don't stress it today.`
          : `Avoid bright light before ${fmtHr(prc.avoidEnd)} — light in this window (before CBTmin+2h) advances your clock, the wrong direction for a westward trip. Sunglasses or stay indoors.`;
        melatonin = `0.5 mg melatonin at lights-out (${fmtHrMin(targetLightsOutMin)}) to reinforce the shifted sleep onset.`;
        const breakfastTime = fmtHrMin(targetWakeMin + 30);
        const lunchTime     = fmtHrMin(targetWakeMin + 5 * 60);
        const dinnerTime    = fmtHrMin(targetWakeMin + 11 * 60);
        const actualDepDayWakeStr = depDayWake || "5:45 AM";
        meals = i === -1 ? [
          { icon: "🌄", name: "Breakfast",         time: breakfastTime, note: `Eat at your shifted wake — fuel before the departure day` },
          { icon: "☀️", name: "Lunch",             time: leaveHomeTime ? `Before you leave at ${leaveHomeTime}` : "Before leaving home", note: "Eat before heading out" },
          { icon: "🌆", name: "Pre-flight dinner", time: airportArrTime ? `After ${airportArrTime} at airport` : "At airport", note: "Last meal before switching to destination time on the plane" },
        ] : [
          { icon: "🌄", name: "Breakfast", time: breakfastTime, note: `${shiftMinPerDay} min later than yesterday — gut clock shift` },
          { icon: "☀️", name: "Lunch",     time: lunchTime,     note: "Meals follow the shifted wake — later each day reinforces the westward shift" },
          { icon: "🌆", name: "Dinner",    time: dinnerTime,    note: "A later dinner each night reinforces the delay signal to your gut clock" },
        ];
        const tomorrowCBTmin = ((todayCBTmin + shiftPerDay) + 24) % 24;
        notes = i === -1
          ? `Departure day. CBTmin: ${fmtHr(todayCBTmin)} → wake at ${fmtHrMin(targetWakeMin)}. Seek bright light ${fmtHr(prc.seekStart)}–${fmtHr(prc.seekEnd)} before heading out.`
          : `CBTmin today: ${fmtHr(todayCBTmin)} → wake ${fmtHrMin(targetWakeMin)}. Seek light ${fmtHr(prc.seekStart)}–${fmtHr(prc.seekEnd)} to delay your clock. Avoid light before ${fmtHr(prc.avoidEnd)}. Tomorrow's CBTmin: ~${fmtHr(tomorrowCBTmin)} (shifted ${shiftMinPerDay} min later). Destination sunrise anchors your target: ~${fmtHr(destSunriseHour)} local (${fmtHr(destSunriseHour - (destUtc - HOME_UTC))} SD time).`;
        days.push({ type: "pre", label, date: formatDate(d), wake, sleep, seekLight, avoidLight, melatonin, meals, notes });
      }
    } else {
      // ── CBTmin-tracking advance ramp (return trip) ──────────────────────
      // Traveler is at destination, advancing clock toward SD time.
      const daysOut = Math.abs(i);
      const dayIndex = preFlightDays - daysOut;

      // CBTmin starts at cbTminDest, advances by |shiftPerDay| per day
      // shiftPerDay is negative for advance after Fix 5
      const todayCBTmin = ((cbTminDest + shiftPerDay * dayIndex) + 24) % 24;
      const targetWakeHour = ((todayCBTmin + 2) + 24) % 24;
      const targetWakeMin = targetWakeHour * 60;
      const targetLightsOutMin = ((targetWakeMin - totalBedMin) % (24 * 60) + 24 * 60) % (24 * 60);
      const targetSleepOnsetMin = (targetLightsOutMin + bedtimeBuffer) % (24 * 60);
      const actualSleepMin = ((targetWakeMin - targetSleepOnsetMin) % (24 * 60) + 24 * 60) % (24 * 60);
      const actualSleepHrs = Math.round(actualSleepMin / 60 * 10) / 10;

      const prc = calcPRCWindows(todayCBTmin, "advance");
      const shiftMinPerDay = Math.round(Math.abs(shiftPerDay) * 60);

      // Melatonin for advance: 5h before DLMO (DLMO ≈ CBTmin + 12h)
      const dlmo = ((todayCBTmin + 12) + 24) % 24;
      const melTime = ((dlmo - 5) + 24) % 24;
      const tomorrowCBTmin = ((todayCBTmin + shiftPerDay) + 24) % 24;
      const homeSunriseInDestTz = ((homeSunriseHour + diff + 24) % 24);
      const breakfastTime = fmtHrMin(targetWakeMin + 30);
      const lunchTime = fmtHrMin(targetWakeMin + 5 * 60);
      const dinnerTime = fmtHrMin(targetWakeMin + 11 * 60);

      // Meeting detection for all eastbound pre-flight days (Fix 7)
      const dayMeetingsPreFlight = getMeetingsForDate(d, true); // true = traveler is at dest (Manila)
      const meetingNotePreFlight = dayMeetingsPreFlight.length > 0
        ? "\n\n" + dayMeetingsPreFlight.map(m =>
            `📅 ${m.label}: ${m.localStart}–${m.localEnd} ${m.tzLabel} (${m.pdtStart}–${m.pdtEnd} PDT) — check this doesn't conflict with your shifted sleep window.`
          ).join(" ")
        : "";

      if (i === -1 && useHotel && hotelCheckinTime && hotelWakeTime) {
        // ── Fix 6: Hotel option for eastbound departure night ─────────────────
        const hotelCheckinMin = timeToMin(hotelCheckinTime);
        const hotelWakeMin    = timeToMin(hotelWakeTime);
        const hotelSleepOnset = hotelCheckinMin + bedtimeBuffer;
        const hotelActualSleepMin = ((hotelWakeMin - hotelSleepOnset) % (24 * 60) + 24 * 60) % (24 * 60);
        const hotelActualSleepHrs = Math.round(hotelActualSleepMin / 60 * 10) / 10;
        const leaveForHotelTime = fmtHrMin(hotelCheckinMin - 90);

        // How far is hotel check-in from the natural (ramp-shifted) sleep onset?
        const forcedEarlyHrs = Math.round(
          ((targetSleepOnsetMin - hotelSleepOnset + 24 * 60) % (24 * 60)) / 60 * 10
        ) / 10;
        const alarmEarlyHrs = Math.round(
          ((targetWakeMin - hotelWakeMin + 24 * 60) % (24 * 60)) / 60 * 10
        ) / 10;

        wake  = fmtHrMin(targetWakeMin);
        sleep = `${fmtHrMin(hotelCheckinMin)} (check in) · ${hotelActualSleepHrs}h sleep`;
        seekLight  = `Bright light ${fmtHr(prc.seekStart)}–${fmtHr(prc.seekEnd)} ${destInfo.tzLabel} — before CBTmin (${fmtHr(todayCBTmin)}), advances your clock.`;
        avoidLight = `Avoid light after ${fmtHr(prc.avoidStart)} ${destInfo.tzLabel} — light post-CBTmin delays your clock (wrong direction). From 2h before hotel check-in: blue-light glasses and dim environment.`;
        // Advance melatonin: take it 5h before DLMO, not at check-in (different from westbound hotel)
        melatonin = `0.5 mg melatonin at ${fmtHr(melTime)} ${destInfo.tzLabel} (~5h before DLMO ${fmtHr(dlmo)}, advance sweet spot). Your body won't naturally want to sleep for another ~${forcedEarlyHrs}h — melatonin + dark room bridges the gap.`;
        meals = [
          { icon: "🌄", name: "Breakfast", time: breakfastTime, note: "Eat right at your shifted wake — gut clock anchoring" },
          { icon: "☀️", name: "Lunch",     time: lunchTime,     note: "Meals follow the shifted wake — earlier each day reinforces the eastward advance" },
          { icon: "🌆", name: "Dinner",    time: `Before ${leaveForHotelTime}`, note: "Eat before leaving for the airport hotel — don't eat again tonight" },
        ];
        notes = `CBTmin: ${fmtHr(todayCBTmin)} → natural wake ${fmtHrMin(targetWakeMin)}. Your ramp has advanced your clock ~${Math.round(Math.abs(shiftPerDay * (preFlightDays - 1)) * 10) / 10}h toward SD time. Hotel check-in is ${hotelCheckinTime} but your body won't want to sleep until ~${fmtHrMin(targetSleepOnsetMin)}. Take melatonin at ${fmtHr(melTime)}, keep room dark, sleep mask on. The ${hotelWakeTime} alarm may come ~${alarmEarlyHrs}h before your shifted natural wake — expect grogginess, but your circadian phase has shifted and the flight will take over.${meetingNotePreFlight}`;
        days.push({ type: "pre", label: `Night before — ${destInfo.short} → Airport Hotel`, date: formatDate(d), wake, sleep, seekLight, avoidLight, melatonin, meals, notes });

        // Card B: departure morning at hotel
        days.push({
          type: "hotel",
          label: `🏨 Departure Morning — Airport Hotel`,
          date: formatDate(addDays(firstDepDate, 0)),
          wake: hotelWakeTime,
          sleep: "—",
          seekLight: `Open curtains immediately on waking — bright light before your shifted CBTmin (${fmtHr(todayCBTmin)}) continues the advance. Step outside briefly before entering the terminal.`,
          avoidLight: `Blue-light glasses from 90 min before boarding. Airport terminal lighting is bright and uncontrolled — sunglasses through security if you're past CBTmin.`,
          melatonin: `No melatonin this morning. You may feel groggy — that's the alarm overriding your shifted clock, not a sign the ramp failed. Caffeine is fine.`,
          meals: [
            { icon: "🌄", name: "Hotel breakfast", time: fmtHrMin(hotelWakeMin + 45), note: "Eat even if not hungry — your gut clock needs anchoring before the flight" },
            { icon: "☀️", name: "Airport meal",    time: "At gate — SD time reference", note: `Switch to SD time at the gate. Eat if it aligns with an SD meal window (SD sunrise ~${fmtHr(homeSunriseHour)} PDT)` },
          ],
          notes: `The ${hotelWakeTime} alarm is ~${alarmEarlyHrs}h before your shifted natural wake. Your CBTmin has advanced to ${fmtHr(todayCBTmin)}, which is ~${Math.round(Math.abs(shiftPerDay * preFlightDays) * 10) / 10}h closer to SD time than when you started. Switch watch to PDT at the gate. Board and sleep mask on when your body clock hits bedtime.`,
          flightMealSections: [],
        });
      } else {
        // ── Standard eastbound ramp day (or departure day without hotel) ──────
        wake  = fmtHrMin(targetWakeMin);
        sleep = `${fmtHrMin(targetLightsOutMin)} (in bed) · ${actualSleepHrs}h sleep`;
        seekLight  = `Bright light ${fmtHr(prc.seekStart)}–${fmtHr(prc.seekEnd)} ${destInfo.tzLabel} — before your CBTmin (${fmtHr(todayCBTmin)}), advances your clock toward SD time.`;
        avoidLight = i === -1
          ? `Avoid bright light after ${fmtHr(prc.avoidStart)} ${destInfo.tzLabel} if possible — but don't stress it today; the flight takes over.`
          : `Avoid bright light ${fmtHr(prc.avoidStart)}–${fmtHr(prc.avoidEnd)} ${destInfo.tzLabel} — light after CBTmin delays your clock (wrong direction).`;
        melatonin = `0.5 mg melatonin at ${fmtHr(melTime)} ${destInfo.tzLabel} — ~5h before DLMO (${fmtHr(dlmo)}), the advance sweet spot.`;

        // Fix 9: Departure-day-specific meals and notes
        meals = i === -1 ? [
          { icon: "🌄", name: "Breakfast",         time: breakfastTime, note: "Eat at your shifted wake — fuel before the departure day" },
          { icon: "☀️", name: "Lunch",             time: leaveHomeTime ? `Before you leave at ${leaveHomeTime}` : "Before leaving for airport", note: "Eat before heading out — last meal on local time" },
          { icon: "🌆", name: "Pre-flight dinner", time: airportArrTime ? `After ${airportArrTime} at airport` : "At airport", note: "Switch to SD time at the gate — eat on SD schedule from here" },
        ] : [
          { icon: "🌄", name: "Breakfast", time: breakfastTime, note: `${shiftMinPerDay} min earlier than yesterday — gut clock advance` },
          { icon: "☀️", name: "Lunch",     time: lunchTime,     note: "Meals shift earlier to reinforce the advance" },
          { icon: "🌆", name: "Dinner",    time: dinnerTime,    note: "Earlier dinner signals shorter day to your body" },
        ];

        notes = i === -1
          ? `Departure day. CBTmin: ${fmtHr(todayCBTmin)} (${destInfo.tzLabel}) → wake ${fmtHrMin(targetWakeMin)}. Seek light ${fmtHr(prc.seekStart)}–${fmtHr(prc.seekEnd)} before heading to the airport. Switch watch to PDT at the gate.${meetingNotePreFlight}`
          : `CBTmin today: ${fmtHr(todayCBTmin)} (${destInfo.tzLabel}) → wake ${fmtHrMin(targetWakeMin)}. Seek light ${fmtHr(prc.seekStart)}–${fmtHr(prc.seekEnd)} to advance. Avoid light ${fmtHr(prc.avoidStart)}–${fmtHr(prc.avoidEnd)}. Tomorrow's CBTmin: ~${fmtHr(tomorrowCBTmin)} (${shiftMinPerDay} min earlier). San Diego sunrise target: ~${fmtHr(homeSunriseHour)} PDT (${fmtHr(homeSunriseInDestTz)} ${destInfo.tzLabel}) — your ramp aims to align your clock to wake with this.${meetingNotePreFlight}`;
        days.push({ type: "pre", label, date: formatDate(d), wake, sleep, seekLight, avoidLight, melatonin, meals, notes });
      }
    }
  }

  // Terminal CBTmin: end-of-ramp value if "before", or un-shifted baseline if "after".
  if (protocolTiming === "before") {
    preFlightTerminalCBTmin = isOutbound
      ? ((cbTminHome + shiftPerDay * preFlightDays) + 24) % 24
      : ((cbTminDest + shiftPerDay * preFlightDays) + 24) % 24;
  } else {
    // "after" mode: no pre-flight shifting occurred. CBTmin is still at baseline.
    preFlightTerminalCBTmin = isOutbound ? cbTminHome : cbTminDest;
  }

  // ── FLIGHT DAYS ───────────────────────────────────────────────────────────
  const flightDates = [...new Set(legs.map(l => l.depDate))];
  flightDates.forEach(dateStr => {
    const dateLegs = legs.filter(l => l.depDate === dateStr);
    const d = addDays(dateStr, 0);
    const firstLegOfDay = dateLegs[0];
    const firstDep = firstLegOfDay.depTime || "12:00";
    const depHour = parseInt(firstDep.split(":")[0]);
    const lateDepart = depHour >= 22 || depHour < 5;
    const nextDayArr = firstLegOfDay.arrDate && firstLegOfDay.depDate && firstLegOfDay.arrDate > firstLegOfDay.depDate;
    const isRedEye = lateDepart || nextDayArr;
    // For daytime-depart / next-day-arrive flights, compute how many hours into the flight
    // the traveler's normal sleep window begins (~sleepHour local), so we know when to sleep on board
    const depMin = timeToMin(firstDep);
    const sleepOnboardMin = sleepHour * 60 > depMin ? sleepHour * 60 - depMin : (sleepHour * 60 + 24 * 60) - depMin;
    const sleepOnboardHrs = Math.round(sleepOnboardMin / 60 * 10) / 10;

    let seekLight, avoidLight, melatonin, wake, sleep, notes;
    const legSummary = dateLegs.map(l => `${l.depCity} ${l.depTime} → ${l.arrCity} ${l.arrTime}`).join("  |  ");

    // Compute meal schedules for each long-haul leg on this date
    const flightMealSections = [];
    dateLegs.forEach(leg => {
      // destUtc is always the foreign-city offset — used for correct flight duration calc.
      // mealTargetOffset controls which timezone the meal windows are scheduled in:
      //   outbound → Manila/Sumatra time; return → San Diego time.
      const mealTargetOffset = isOutbound ? destUtc : HOME_UTC;
      const result = getMealSchedule(leg, isOutbound, destUtc, mealTargetOffset);
      if (result && result.meals.length > 0) {
        flightMealSections.push({
          legLabel: `${leg.depCity} → ${leg.arrCity} (${result.durationHrs}h flight)`,
          meals: result.meals,
          durationHrs: result.durationHrs,
        });
      }
    });

    if (isDelay) {
      if (isRedEye) {
        wake = (useHotel && hotelWakeTime) ? hotelWakeTime : (depDayWake || fmtHr(wakeHour));
        sleep = `On the plane — ~${sleepOnboardHrs}h after takeoff when your body clock hits bedtime`;
        if (lateDepart) {
          // True late-night departure (10 PM+)
          const terminalDarkFrom = fmtHr(depHour - 2 < 0 ? depHour - 2 + 24 : depHour - 2);
          seekLight = `Normal day until evening. Keep the house bright through dinner.`;
          avoidLight = `From ~${terminalDarkFrom}: blue-light blocking glasses — terminal, shuttle, everywhere. Your CBTmin (${fmtHr(cbTmin)}) is near your normal wake time, so late terminal light can accidentally advance your clock.`;
          melatonin = `Take 0.5–1 mg melatonin as soon as you're seated on the plane.`;
          notes = protocolTiming === "after"
            ? `Late-night departure — your clock is still on San Diego time. Blue-light glasses from ~${terminalDarkFrom} onward. Sleep as much of the flight as possible. The active adjustment protocol begins after arrival at ${destInfo.short}.`
            : `Late-night departure — blue-light glasses from ~${terminalDarkFrom} onward in the terminal, sleep mask the moment you board. Sleep as much of the flight as possible.`;
        } else {
          // Daytime departure arriving next day — long-haul (e.g. LAX→MNL ~20h)
          const durationLabel = flightMealSections[0]?.durationHrs ? `~${flightMealSections[0].durationHrs}h` : "long-haul";
          const sleepTargetLocal = fmtHr(sleepHour);
          seekLight = `Normal morning — get natural light before leaving home. Enjoy daylight hours at the airport freely.`;
          avoidLight = `Once airborne, dim your screen after ~${sleepTargetLocal} SD time. Don't follow cabin lights — set your own schedule based on your body clock, not the plane's.`;
          melatonin = `Take 0.5–1 mg melatonin at your usual bedtime (${sleepTargetLocal} SD time, ~${sleepOnboardHrs}h into the flight) to signal sleep onset on board.`;
          notes = protocolTiming === "after"
            ? `This is a ${durationLabel} flight. Your clock is still on San Diego time — the active adjustment protocol begins after arrival at ${destInfo.short}. Sleep when your body wants to (~${sleepTargetLocal} SD time, ${sleepOnboardHrs}h in). Eat the in-flight breakfast on destination time.`
            : `This is a ${durationLabel} flight that crosses your entire sleep window. Spend the first half normally — eat, work, stay awake. Around ${sleepTargetLocal} SD time (~${sleepOnboardHrs}h in), take melatonin, put on your sleep mask, and sleep as long as possible. When you wake, it will be close to morning at destination — eat the in-flight breakfast on destination time even if groggy, and resist sleeping again. You want to arrive tired enough to sleep at a local hour.`;
        }
      } else {
        wake = fmtHr(wakeHour);
        sleep = "On the plane";
        seekLight = `Get outdoor light in the morning before heading to the airport`;
        avoidLight = `On the plane: avoid bright overhead lights during destination's nighttime hours`;
        melatonin = `0.5–1 mg melatonin at destination's 10 PM`;
        notes = protocolTiming === "after"
          ? `Your clock is still on San Diego time. Switch to destination time at takeoff. The active adjustment protocol begins after arrival at ${destInfo.short}.`
          : "Switch your watch to destination time at takeoff. Eat and sleep on destination's schedule from the moment you board.";
      }
    } else {
      // ── Eastbound (advance) flight day ─────────────────────────────────────
      // CBTmin at departure: end of the pre-flight advance ramp (destination tz)
      const depCBTmin = preFlightTerminalCBTmin;
      const depDLMO = ((depCBTmin + 12) + 24) % 24;
      const depMelTime = ((depDLMO - 5) + 24) % 24;

      // When SD bedtime falls in departure-city local time (for on-board sleep target)
      const sdBedtimeInDepLocalHr = ((sleepHour + diff + 24) % 24);
      const sdBedtimeInDepLocalMin = sdBedtimeInDepLocalHr * 60;
      const sdSleepOnboardMin = sdBedtimeInDepLocalMin > depMin
        ? sdBedtimeInDepLocalMin - depMin
        : sdBedtimeInDepLocalMin + 24 * 60 - depMin;
      const sdSleepOnboardHrs = Math.round(sdSleepOnboardMin / 60 * 10) / 10;

      // Time to start avoiding light in terminal (from CBTmin onward, light delays the clock)
      const terminalAvoidFrom = fmtHr(depCBTmin);

      // For eastbound, wake time is the ramp-shifted Manila wake (CBTmin + 2h in dest tz),
      // not the SD departure-logistics time (depDayWakeHour), which is meaningless here.
      const rampWakeHour = ((depCBTmin + 2) + 24) % 24;
      wake = fmtHr(rampWakeHour);

      if (isRedEye) {
        sleep = `On the plane — ~${sdSleepOnboardHrs}h after takeoff, when it's ~${fmtHr(sleepHour)} SD time`;
        if (lateDepart) {
          // True late-night departure from destination city
          seekLight = `Get bright morning/midday light before heading to the airport — light before your CBTmin (${fmtHr(depCBTmin)}) advances your clock.`;
          avoidLight = `From ~${terminalAvoidFrom}: blue-light blocking glasses in the terminal. Light after CBTmin delays your clock — the wrong direction. Sunglasses through the airport.`;
          melatonin = `Take 0.5 mg melatonin at ${fmtHr(depMelTime)} ${destInfo.tzLabel} (~5h before DLMO ${fmtHr(depDLMO)}) — the advance sweet spot. This is earlier than bedtime; that's intentional.`;
          notes = protocolTiming === "after"
            ? `Late departure — your clock is still on ${destInfo.short} time. Blue-light glasses from ${terminalAvoidFrom} onward. Sleep mask on board. The active advance protocol begins after you arrive in San Diego.`
            : `Late departure — wear blue-light glasses in the terminal from ${terminalAvoidFrom} onward. Once on board, sleep mask immediately. Target sleep onset ~${sdSleepOnboardHrs}h into the flight when your SD body clock hits bedtime. Eastward is the hard direction — every hour of in-flight sleep at the right time saves a recovery day.`;
        } else {
          // Daytime/morning departure, long-haul, crosses full sleep window
          const durationLabel = flightMealSections[0]?.durationHrs ? `~${flightMealSections[0].durationHrs}h` : "long-haul";
          seekLight = `Get outdoor light early this morning — light before your CBTmin (${fmtHr(depCBTmin)}) helps advance your clock. Enjoy daylight at the airport through midday.`;
          avoidLight = `From ~${terminalAvoidFrom}: dim your environment. On board, avoid overhead cabin lights after ${fmtHr(sleepHour)} SD time — don't follow the plane's lighting schedule.`;
          melatonin = `Take 0.5 mg melatonin at ${fmtHr(depMelTime)} ${destInfo.tzLabel} (~5h before your DLMO ${fmtHr(depDLMO)}). If that time falls during the flight, take it on board.`;
          notes = protocolTiming === "after"
            ? `This is a ${durationLabel} flight. Your clock is still on ${destInfo.short} time — the active advance protocol begins after you arrive in San Diego. Sleep when your body wants to. Eat the in-flight breakfast aligned to SD time.`
            : `This is a ${durationLabel} flight. The first ${sdSleepOnboardHrs}h are "day" — eat, work, be awake. At ~${fmtHr(sdBedtimeInDepLocalHr)} ${destInfo.tzLabel} (${fmtHr(sleepHour)} SD time), take melatonin if not yet taken, put on your sleep mask, and sleep as long as possible. Wake with SD morning light — eat the in-flight breakfast aligned to SD time. Arriving well-rested makes Day 1 recovery dramatically easier.`;
        }
      } else {
        // Short-haul or same-day arrival
        sleep = "On the plane";
        seekLight = `Morning light before heading to the airport — before CBTmin (${fmtHr(depCBTmin)}) helps advance. Step outside briefly.`;
        avoidLight = `On the plane: dim overhead lights during San Diego's nighttime hours (${fmtHr(sleepHour)}–${fmtHr(wakeHour)} SD time).`;
        melatonin = `0.5 mg melatonin at ${fmtHr(depMelTime)} ${destInfo.tzLabel} — 5h before DLMO (${fmtHr(depDLMO)}), advance sweet spot.`;
        notes = protocolTiming === "after"
          ? `Your clock is still on ${destInfo.short} time. Switch to SD time at takeoff. The active advance protocol begins after arrival.`
          : `Switch your watch to SD time at takeoff. Eat and sleep on SD schedule from the moment you board. Eastward is the hard direction — start advancing your clock now.`;
      }
    }

    days.push({
      type: "flight",
      label: `✈ Flight — ${dateLegs[0].depCity} → ${dateLegs[dateLegs.length-1].arrCity}`,
      date: formatDate(d),
      legSummary, wake, sleep, seekLight, avoidLight, melatonin, notes,
      flightMealSections,
    });
  });

  // ── POST-ARRIVAL ──────────────────────────────────────────────────────────
  const lastArrDate = lastLeg.arrDate || lastLeg.depDate;
  const arrivalBase = addDays(lastArrDate, 0);
  const atLabel = isDelay ? destInfo.short : "San Diego";

  // Post-arrival CBTmin tracking: start from pre-flight terminal value, shift toward target.
  // Outbound: preFlightTerminalCBTmin is SD-tz (cbTminHome-based) → convert to dest tz.
  // Return: preFlightTerminalCBTmin is Manila-tz (cbTminDest-based, per Fix 1) → convert to SD tz.
  const postArrivalStartCBTmin = isDelay
    ? ((preFlightTerminalCBTmin + (destUtc - HOME_UTC)) + 24) % 24   // home→dest tz
    : ((preFlightTerminalCBTmin - (destUtc - HOME_UTC)) + 24) % 24;  // dest→home tz
  const postArrivalCBTminTarget = isDelay ? destCBTminLocal : cbTminHome;
  // Direction and magnitude of remaining shift (positive = later, negative = earlier)
  const postShiftRaw = postArrivalCBTminTarget - postArrivalStartCBTmin;
  const postShiftDir = ((postShiftRaw + 12 + 24) % 24) - 12;  // normalize to [-12, 12]
  const postShiftTotal = Math.abs(postShiftDir);

  if (protocolTiming === "after") {
    // ═══ ACTIVE POST-ARRIVAL RAMP ═══
    // When protocol runs after the flight, the traveler arrives un-shifted and does
    // the full active CBTmin ramp at the arrival location.
    const activeRampDays = preFlightDays;  // reuse the protocol length setting
    const prcMode = isDelay ? "delay" : "advance";
    const postShiftPerDay = Math.sign(postShiftDir) * Math.min(rampRateHr, postShiftTotal / activeRampDays);
    const localTzLabel = isDelay ? destInfo.tzLabel : "PDT";
    const localTzShort = isDelay ? "local" : "PDT";

    for (let i = 1; i <= activeRampDays + 3; i++) {
      const d = new Date(arrivalBase);
      d.setDate(d.getDate() + i - 1);
      const dayIndex = Math.min(i, activeRampDays);  // cap at ramp end
      const inActiveRamp = i <= activeRampDays;

      const todayCBTmin = ((postArrivalStartCBTmin + postShiftPerDay * dayIndex) + 24) % 24;
      const targetWakeHour = ((todayCBTmin + 2) + 24) % 24;
      const targetWakeMin  = targetWakeHour * 60;
      const targetLightsOutMin = ((targetWakeMin - totalBedMin) % (24 * 60) + 24 * 60) % (24 * 60);
      const targetLightsOutH = targetLightsOutMin / 60;
      const shiftMinPerDay = Math.round(Math.abs(postShiftPerDay) * 60);

      const progress = Math.min(1, i / activeRampDays);
      const status = progress < 0.35 ? "critical" : progress < 0.7 ? "moderate" : "good";

      let seekLight, avoidLight, melatonin, sleep, wake, meals, notes;

      if (inActiveRamp) {
        // Active ramp day — shifting CBTmin toward target
        wake = fmtHr(targetWakeHour);
        sleep = `${fmtHr(targetLightsOutH)} ${localTzShort} (in bed) · wake ${fmtHr(targetWakeHour)} · ${sleepDuration}h sleep`;

        const prc = calcPRCWindows(todayCBTmin, prcMode);
        seekLight = i === 1
          ? `CRITICAL: Bright outdoor light ${fmtHr(prc.seekStart)}–${fmtHr(prc.seekEnd)} ${localTzShort} — this is your most important reset tool. ${isDelay ? "2–8h after" : "0–4h before"} your CBTmin (${fmtHr(todayCBTmin)}).`
          : `Bright outdoor light ${fmtHr(prc.seekStart)}–${fmtHr(prc.seekEnd)} ${localTzShort} — ${isDelay ? "2–8h after" : "0–4h before"} your CBTmin (${fmtHr(todayCBTmin)}), ${isDelay ? "delays" : "advances"} your clock toward ${isDelay ? "local" : "SD"} time.`;
        avoidLight = `Avoid bright light ${fmtHr(prc.avoidStart)}–${fmtHr(prc.avoidEnd)} ${localTzShort} — light in this window ${isDelay ? "advances" : "delays"} your clock (wrong direction).`;

        if (isDelay) {
          // Delay: melatonin at lights-out
          const dlmo = ((todayCBTmin + 12) + 24) % 24;
          melatonin = i <= 3
            ? `0.5–1 mg melatonin at ${fmtHr(targetLightsOutH)} ${localTzShort} (lights-out) — your DLMO is ~${fmtHr(dlmo)}.`
            : `Melatonin optional — only if struggling to fall asleep`;
        } else {
          // Advance: 5h before DLMO
          const dlmo = ((todayCBTmin + 12) + 24) % 24;
          const melTime = ((dlmo - 5) + 24) % 24;
          melatonin = i <= activeRampDays
            ? `0.5 mg melatonin at ${fmtHr(melTime)} ${localTzShort} — ~5h before DLMO (${fmtHr(dlmo)}). Advance sweet spot: late afternoon, NOT at bedtime.`
            : `Melatonin optional`;
        }

        // Meals shift daily by shiftMinPerDay
        const breakfastH = targetWakeHour + 0.5;
        const dinnerH = targetLightsOutH - 2.5;
        meals = [
          { icon: "🌄", name: "Breakfast", time: `${fmtHr(breakfastH)}–${fmtHr(breakfastH + 0.5)} ${localTzShort}`, note: i === 1 ? `Force yourself to eat at ${isDelay ? "local" : "SD"} time even if not hungry — gut clock needs anchoring` : `Eat at your shifted wake time — ${shiftMinPerDay} min ${isDelay ? "later" : "earlier"} each day` },
          { icon: "☀️", name: "Lunch",     time: `${fmtHr(((targetWakeHour + 5) + 24) % 24)}–${fmtHr(((targetWakeHour + 6) + 24) % 24)} ${localTzShort}`, note: "Biggest meal of the day — digestion is most active midday" },
          { icon: "🌆", name: "Dinner",    time: `${fmtHr(dinnerH)} ${localTzShort}`, note: i <= 2 ? "Keep it light — finish 2–3h before lights-out to aid sleep quality" : "Finish eating 2–3h before lights-out" },
        ];

        // Meeting detection
        const dayMeetings = getMeetingsForDate(d, isDelay);
        let meetingNote = null;
        if (dayMeetings.length > 0) {
          if (isDelay) {
            meetingNote = dayMeetings.map(m => `📅 ${m.label}: ${m.localStart}–${m.localEnd} ${m.tzLabel} (${m.pdtStart}–${m.pdtEnd} PDT). ${i <= 3 ? "This falls during your active ramp — use caffeine strategically 30–45 min before." : "You should be closer to adjusted by now — manage energy normally."}`).join(" ");
          } else {
            const cbTminOffset = ((todayCBTmin - cbTminHome + 12 + 24) % 24) - 12;
            const lagDesc = Math.round(Math.abs(cbTminOffset) * 10) / 10;
            meetingNote = dayMeetings.map(m => {
              const bodyPerceivedTime = ((m.startHour + cbTminOffset) + 24) % 24;
              return `📅 ${m.label}: ${m.localStart}–${m.localEnd} PDT (body clock ~${lagDesc}h behind — perceives this as ~${fmtHr(bodyPerceivedTime)} body-time). ${i <= 4 ? `Have caffeine 30–45 min before. Bright light exposure immediately after helps advance your clock.` : `You should be largely adjusted by now — manage normally.`}`;
            }).join(" ");
          }
        }

        const shiftSoFar = Math.round(Math.abs(postShiftPerDay * dayIndex) * 10) / 10;
        notes = (i === 1
          ? `Day 1 — hardest day. Your clock is ~${Math.round(postShiftTotal * 10) / 10}h off ${isDelay ? "local" : "SD"} time. ${isDelay ? `Your body thinks it's ~${fmtHr((todayCBTmin - (destUtc - HOME_UTC) + 24) % 24)} SD time.` : `Your body is still on ${destInfo.short} time.`} The active protocol starts now — light, melatonin, and meal timing are your tools. ${isDelay ? `Stay awake until ${fmtHr(targetLightsOutH)} local.` : `DO NOT sleep past ${fmtHr(targetWakeHour)} no matter what.`}`
          : i <= 3 ? `Day ${i} of active ramp — ${shiftSoFar}h shifted so far. Stick rigidly to the schedule. ${isDelay ? "Sunlight + food timing are your two strongest reset tools." : "Morning sunlight is the heavy lifter. Caffeine OK before noon. No naps after 3 PM."}`
          : `Day ${i} — ${shiftSoFar}h shifted of ${Math.round(postShiftTotal * 10) / 10}h total. ${progress > 0.7 ? "Nearly there — consistency now is what completes the reset." : "Keep going. An afternoon walk in sunlight does double duty: light exposure and light exercise."}`)
          + (meetingNote ? `\n\n${meetingNote}` : "");
      } else {
        // Post-ramp maintenance days — CBTmin is at target, hold steady
        const finalCBTmin = postArrivalCBTminTarget;
        const finalWakeH = ((finalCBTmin + 2) + 24) % 24;
        const finalLightsOutMin = ((finalWakeH * 60 - totalBedMin) % (24 * 60) + 24 * 60) % (24 * 60);
        const finalLightsOutH = finalLightsOutMin / 60;

        wake = fmtHr(finalWakeH);
        sleep = `${fmtHr(finalLightsOutH)} ${localTzShort} (in bed) · wake ${fmtHr(finalWakeH)} · ${sleepDuration}h sleep`;

        const prc = calcPRCWindows(finalCBTmin, prcMode);
        seekLight = `Bright outdoor light ${fmtHr(prc.seekStart)}–${fmtHr(prc.seekEnd)} ${localTzShort} — maintain your adjusted rhythm.`;
        avoidLight = `Avoid bright light ${fmtHr(prc.avoidStart)}–${fmtHr(prc.avoidEnd)} ${localTzShort} — protect your new schedule.`;
        melatonin = "Melatonin optional — only if struggling to fall asleep";

        const breakfastH = finalWakeH + 0.5;
        const dinnerH = finalLightsOutH - 2.5;
        meals = [
          { icon: "🌄", name: "Breakfast", time: `${fmtHr(breakfastH)} ${localTzShort}`, note: "Consistent timing locks in your reset" },
          { icon: "☀️", name: "Lunch",     time: `${fmtHr(((finalWakeH + 5) + 24) % 24)} ${localTzShort}`, note: "Normal meal — you're adjusted" },
          { icon: "🌆", name: "Dinner",    time: `${fmtHr(dinnerH)} ${localTzShort}`, note: "Finish eating 2–3h before lights-out" },
        ];

        // Meetings on maintenance days
        const dayMeetings = getMeetingsForDate(d, isDelay);
        let meetingNote = null;
        if (dayMeetings.length > 0) {
          meetingNote = dayMeetings.map(m => `📅 ${m.label}: ${m.localStart}–${m.localEnd} ${isDelay ? m.tzLabel : "PDT"} — you should be fully adjusted by now.`).join(" ");
        }

        notes = `Protocol complete. Maintain consistent sleep/wake schedule — ${fmtHr(finalLightsOutH)} lights-out, ${fmtHr(finalWakeH)} wake. Your circadian clock is aligned to ${isDelay ? "local" : "SD"} time.`
          + (meetingNote ? `\n\n${meetingNote}` : "");
      }

      days.push({ type: "post", label: `Day ${i} at ${atLabel}`, date: formatDate(d), status, wake, sleep, seekLight, avoidLight, melatonin, meals, notes });
    }
  } else {
    // ═══ PASSIVE POST-ARRIVAL (existing behavior when protocol ran before the flight) ═══
    for (let i = 1; i <= daysToAdjust + 2; i++) {
      const d = new Date(arrivalBase);
      d.setDate(d.getDate() + i - 1);
      const progress = Math.min(1, i / daysToAdjust);
      // Track CBTmin each post-arrival day
      const dayShift = Math.min(rampRateHr * i, postShiftTotal);
      const todayCBTminLocal = ((postArrivalStartCBTmin + Math.sign(postShiftDir) * dayShift) + 24) % 24;
      let seekLight, avoidLight, melatonin, sleep, wake, meals, notes;

      if (isDelay) {
        // All times here are DESTINATION LOCAL (Manila/Sumatra time)
        const stableBedH = destLightsOutHour;
        const stableWakeH = destWakeHour;

        wake = i === 1 ? "Sleep in — no alarm today" : fmtHr(stableWakeH);

        const bedH = stableBedH;
        const sleepOnsetH = bedH + bedtimeBuffer / 60;

        sleep = i === 1
          ? `${fmtHr(bedH)} local (in bed) · ${sleepDuration}h sleep`
          : `${fmtHr(bedH)} local (in bed) · wake ${fmtHr(stableWakeH)} · ${sleepDuration}h sleep`;

        const prc = calcPRCWindows(todayCBTminLocal, "delay");
        seekLight = `Bright outdoor light ${fmtHr(prc.seekStart)}–${fmtHr(prc.seekEnd)} local — 2–8h after your CBTmin (${fmtHr(todayCBTminLocal)}), delays your clock toward local time.`;
        avoidLight = `Avoid bright light ${fmtHr(prc.avoidStart)}–${fmtHr(prc.avoidEnd)} local — light in this window advances your clock (wrong direction).`;

        const dlmo = ((todayCBTminLocal + 12) + 24) % 24;
        melatonin = i <= 3
          ? `0.5–1 mg melatonin at ${fmtHr(bedH)} local (lights-out) — your DLMO is ~${fmtHr(dlmo)}.`
          : `Melatonin optional — only if struggling to fall asleep`;

        const dinnerH = bedH - 2.5;
        meals = [
          { icon: "🌄", name: "Breakfast", time: `${fmtHr(stableWakeH + 0.5)}–${fmtHr(stableWakeH + 1)} local`, note: i === 1 ? "Force yourself to eat at local time even if not hungry — gut clock needs anchoring" : "Eat at local time — consistency locks in the gut clock" },
          { icon: "☀️", name: "Lunch",     time: "12:00–1:00 PM local", note: "Biggest meal of the day — digestion is most active midday" },
          { icon: "🌆", name: "Dinner",    time: `${fmtHr(dinnerH)} local`, note: i <= 2 ? "Keep it light — finish 2–3h before lights-out to aid sleep quality" : "Finish eating 2–3h before lights-out" },
        ];

        const dayMeetings = getMeetingsForDate(d, true);
        const meetingNote = dayMeetings.length > 0
          ? dayMeetings.map(m => `📅 ${m.label}: ${m.localStart}–${m.localEnd} ${m.tzLabel} (${m.pdtStart}–${m.pdtEnd} PDT). ${i <= 3 ? "This falls during your recovery window — use caffeine strategically 30–45 min before. Avoid screens/bright light at this local hour if it's past your CBTmin." : "You should be closer to adjusted by now — manage energy normally."}`).join(" ")
          : null;

        notes = (i === 1
          ? `You arrive at 6:00 PM local. Your body thinks it's ~${fmtHr((18 - diff + 24) % 24)} SD time — late morning. Stay awake until ${fmtHr(bedH)} local (${fmtHr((bedH - diff + 24) % 24)} SD time), then sleep a full ${sleepDuration}h. This is your most important night.`
          : i <= 3 ? `Stick rigidly to local meal and sleep times. Target: in bed ${fmtHr(bedH)} local, wake ${fmtHr(stableWakeH)} local. Sunlight + food timing are your two strongest reset tools.`
          : progress > 0.7 ? `Nearly there. Protect the ${fmtHr(bedH)} lights-out / ${fmtHr(stableWakeH)} wake — consistency now is what completes the reset.`
          : "An afternoon walk in sunlight does double duty: light exposure and light exercise.")
          + (meetingNote ? `\n\n${meetingNote}` : "");
      } else {
        // Return to SD: passive recovery
        const targetWakeH = Math.max(6, wakeHour - Math.max(0, 2 - Math.floor(i * 0.4)));
        wake = fmtHr(targetWakeH);
        const targetLightsOutH = ((targetWakeH * 60 - totalBedMin) % (24 * 60) + 24 * 60) % (24 * 60) / 60;
        sleep = `${fmtHr(targetLightsOutH)} PDT (in bed) · ${sleepDuration}h sleep`;
        const prc = calcPRCWindows(todayCBTminLocal, "advance");
        seekLight = i === 1
          ? `CRITICAL: Bright light ${fmtHr(prc.seekStart)}–${fmtHr(prc.seekEnd)} PDT — advances your clock toward SD time. Even 20 min helps.`
          : `Bright light ${fmtHr(prc.seekStart)}–${fmtHr(prc.seekEnd)} PDT — before CBTmin (${fmtHr(todayCBTminLocal)}), advances your clock.`;
        avoidLight = `Avoid bright light ${fmtHr(prc.avoidStart)}–${fmtHr(prc.avoidEnd)} PDT — light after CBTmin delays your clock (wrong direction).`;

        const dlmo = ((todayCBTminLocal + 12) + 24) % 24;
        const melTime = ((dlmo - 5) + 24) % 24;
        melatonin = i <= 5
          ? `0.5 mg melatonin at ${fmtHr(melTime)} PDT — ~5h before DLMO (${fmtHr(dlmo)}). Advance sweet spot: late afternoon, NOT at bedtime.`
          : `Melatonin optional`;
        meals = [
          { icon: "🌄", name: "Breakfast", time: `${fmtHr(targetWakeH + 1)} PDT`, note: i === 1 ? "Eat breakfast at SD time immediately — even if your body thinks it's evening in Asia" : "Consistent breakfast time anchors your gut clock to SD" },
          { icon: "☀️", name: "Lunch",     time: `12:00–1:00 PM PDT`,             note: "Eat at SD noon even if not hungry — skipping delays your gut clock recovery" },
          { icon: "🌆", name: "Dinner",    time: `6:00–7:00 PM PDT`,              note: i <= 3 ? "Keep dinner light and early — your gut thinks it's the middle of the night" : "Normal dinner by now" },
        ];
        notes = i === 1
          ? `Hardest day — clock is ~${Math.round(postShiftTotal * 10) / 10}h off (pre-flight ramp already closed ~${Math.round((shiftNeeded - postShiftTotal) * 10) / 10}h of the ${shiftNeeded}h gap). DO NOT sleep past ${fmtHr(wakeHour)} no matter what. Missing morning light today costs 2 full recovery days.`
          : i <= 3 ? "Morning sunlight is the heavy lifter. Caffeine OK before noon. No naps after 3 PM."
          : i <= 6 ? "Halfway there. A 20-min nap before 2 PM is fine."
          : "Almost fully adjusted. Protect your wake time 2 more days.";

        const dayMeetings = getMeetingsForDate(d, false);
        if (dayMeetings.length > 0) {
          const meetingNote = dayMeetings.map(m => {
            const cbTminOffset = ((todayCBTminLocal - cbTminHome + 12 + 24) % 24) - 12;
            const bodyPerceivedTime = ((m.startHour + cbTminOffset) + 24) % 24;
            const lagDesc = Math.round(Math.abs(cbTminOffset) * 10) / 10;
            return `📅 ${m.label}: ${m.localStart}–${m.localEnd} PDT (body clock ~${lagDesc}h behind — perceives this as ~${fmtHr(bodyPerceivedTime)} body-time). ${i <= 4 ? `This is one of your hardest meeting windows during recovery. Have caffeine 30–45 min before. Bright light exposure immediately after helps advance your clock. Keep this a no-alcohol day.` : `You should be largely adjusted by now — manage normally.`}`;
          }).join(" ");
          notes += `\n\n${meetingNote}`;
        }
      }

      const status = progress < 0.35 ? "critical" : progress < 0.7 ? "moderate" : "good";
      days.push({ type: "post", label: `Day ${i} at ${atLabel}`, date: formatDate(d), status, wake, sleep, seekLight, avoidLight, melatonin, meals, notes });
    }
  }

  return { days, shiftNeeded, daysToAdjust, isDelay, cbTmin, destInfo, destSunriseHour, shiftPerDay, protocolTiming };
}

// ─── Default itineraries ──────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().split("T")[0]; }
function offsetDate(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split("T")[0]; }

const DEFAULT_LEGS = {
  outbound: [
    { id: 1, depCity: "LAX", depTime: "12:20", depDate: "2026-05-13", arrCity: "MNL", arrTime: "18:00", arrDate: "2026-05-14" },
  ],
  return: [
    { id: 1, depCity: "MNL", depTime: "08:00", depDate: todayStr(), arrCity: "LAX", arrTime: "10:30", arrDate: offsetDate(1) },
  ],
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function JetLagPlanner() {
  const [step, setStep] = useState("config");
  const [direction, setDirection] = useState(cfg.trip?.direction || "outbound");
  const [dest, setDest] = useState(cfg.trip?.destination || "manila");
  const [wakeHour, setWakeHour] = useState(cfgHour(cfg.sleep?.wake_home, 7));
  const [sleepHour, setSleepHour] = useState(cfgHour(cfg.sleep?.bedtime, 23));
  const [destWakeHour, setDestWakeHour] = useState(cfgHour(cfg.sleep?.wake_dest, 7));
  const [sleepDuration, setSleepDuration] = useState(cfg.sleep?.duration_hours ?? 9);
  const [bedtimeBuffer, setBedtimeBuffer] = useState(cfg.sleep?.wind_down_minutes ?? 45);
  const [meetings, setMeetings] = useState(() => cfgMeetings(cfg.meetings));
  const [depDayWake, setDepDayWake] = useState(cfg.departure?.home_wake || "05:45");
  const [leaveHomeTime, setLeaveHomeTime] = useState(cfg.departure?.leave_home || "06:20");
  const [airportArrTime, setAirportArrTime] = useState(cfg.departure?.airport_arrival || "08:50");
  const [useHotel, setUseHotel] = useState(cfg.departure?.use_hotel ?? true);
  const [hotelCheckinTime, setHotelCheckinTime] = useState(cfg.departure?.hotel_checkin || "23:00");
  const [hotelWakeTime, setHotelWakeTime] = useState(cfg.departure?.hotel_wake || "08:00");
  const [preFlightDays, setPreFlightDays] = useState(cfg.trip?.pre_flight_ramp_days ?? 7);
  const [outboundTiming, setOutboundTiming] = useState(cfg.trip?.outbound_protocol_timing || "before");
  const [returnTiming, setReturnTiming] = useState(cfg.trip?.return_protocol_timing || "after");
  const [legs, setLegs] = useState(() => {
    const dir = cfg.trip?.direction || "outbound";
    return dir === "outbound"
      ? cfgLegs(cfg.outbound_legs, () => DEFAULT_LEGS.outbound.map(l => ({ ...l })))
      : cfgLegs(cfg.return_legs, () => DEFAULT_LEGS.return.map(l => ({ ...l })));
  });
  const [plan, setPlan] = useState(null);
  const [expandedDay, setExpandedDay] = useState(0);

  function handleDirectionChange(d) {
    setDirection(d);
    setLegs(d === "outbound"
      ? cfgLegs(cfg.outbound_legs, () => DEFAULT_LEGS.outbound.map(l => ({ ...l })))
      : cfgLegs(cfg.return_legs, () => DEFAULT_LEGS.return.map(l => ({ ...l })))
    );
  }

  function updateLeg(id, field, val) {
    setLegs(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));
  }

  function addLeg() {
    const last = legs[legs.length - 1];
    setLegs(prev => [...prev, {
      id: Date.now(), depCity: last.arrCity, depTime: "10:00",
      depDate: last.arrDate || last.depDate, arrCity: "", arrTime: "15:00",
      arrDate: last.arrDate || last.depDate,
    }]);
  }

  function removeLeg(id) {
    if (legs.length <= 1) return;
    setLegs(prev => prev.filter(l => l.id !== id));
  }

  const protocolTiming = direction === "outbound" ? outboundTiming : returnTiming;

  function handleGenerate() {
    const timing = direction === "outbound" ? outboundTiming : returnTiming;
    const p = generatePlan({ direction, dest, legs, wakeHour, destWakeHour, sleepHour, sleepDuration, bedtimeBuffer, meetings, depDayWake, leaveHomeTime, airportArrTime, useHotel: timing === "before" ? useHotel : false, hotelCheckinTime, hotelWakeTime, preFlightDays, protocolTiming: timing });
    setPlan(p);
    setStep("plan");
    setExpandedDay(0);
  }

  // A flight crosses overnight (red-eye) if it departs late OR arrives the next day or later
  const hasRedEye = legs.some(l => {
    const h = parseInt((l.depTime || "12:00").split(":")[0]);
    const lateDepart = h >= 22 || h < 5;
    const nextDayArr = l.arrDate && l.depDate && l.arrDate > l.depDate;
    return lateDepart || nextDayArr;
  });

  // Config snapshot for markdown export
  const configSnapshot = { direction, dest, legs, wakeHour, destWakeHour, sleepHour, sleepDuration, bedtimeBuffer, meetings, depDayWake, leaveHomeTime, airportArrTime, useHotel, hotelCheckinTime, hotelWakeTime, preFlightDays, protocolTiming, outboundTiming, returnTiming };

  return (
    <div style={{ minHeight: "100vh", background: "#070810", color: "#e8e4dc", fontFamily: "Georgia, serif" }}>
      <div style={{
        background: "linear-gradient(160deg,#0b1022 0%,#0f1830 100%)",
        borderBottom: "1px solid rgba(180,160,100,0.13)",
        padding: "26px 18px 18px",
      }}>
        <div style={{ maxWidth: 740, margin: "0 auto" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.35em", color: "#b4a050", fontFamily: "monospace", marginBottom: 4 }}>✦ CIRCADIAN RESET PROTOCOL</div>
          <h1 style={{
            margin: 0, fontWeight: "normal", fontSize: "clamp(20px,5vw,32px)",
            background: "linear-gradient(120deg,#e8e4dc 30%,#b4a050)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Jet Lag Planner</h1>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#5a5040", fontStyle: "italic" }}>
            San Diego ↔ Manila / West Sumatra · Light, melatonin &amp; meal timing
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 740, margin: "0 auto", padding: "18px 14px 40px" }}>
        {step === "config" && (
          <ConfigPanel
            direction={direction} dest={dest} wakeHour={wakeHour} sleepHour={sleepHour}
            destWakeHour={destWakeHour} sleepDuration={sleepDuration} bedtimeBuffer={bedtimeBuffer}
            meetings={meetings}
            legs={legs} hasRedEye={hasRedEye}
            depDayWake={depDayWake} leaveHomeTime={leaveHomeTime} airportArrTime={airportArrTime}
            useHotel={useHotel} hotelCheckinTime={hotelCheckinTime} hotelWakeTime={hotelWakeTime}
            preFlightDays={preFlightDays} onPreFlightDays={setPreFlightDays}
            onDepDayWake={setDepDayWake} onLeaveHomeTime={setLeaveHomeTime} onAirportArrTime={setAirportArrTime}
            onUseHotel={setUseHotel} onHotelCheckinTime={setHotelCheckinTime} onHotelWakeTime={setHotelWakeTime}
            onDirection={handleDirectionChange} onDest={setDest}
            onWake={setWakeHour} onSleep={setSleepHour}
            onDestWakeHour={setDestWakeHour}
            onSleepDuration={setSleepDuration} onBedtimeBuffer={setBedtimeBuffer}
            onMeetings={setMeetings}
            onUpdateLeg={updateLeg} onAddLeg={addLeg} onRemoveLeg={removeLeg}
            onGenerate={handleGenerate}
            outboundTiming={outboundTiming} returnTiming={returnTiming}
            onOutboundTiming={setOutboundTiming} onReturnTiming={setReturnTiming}
            protocolTiming={protocolTiming}
          />
        )}
        {step === "plan" && plan && (
          <PlanView
            plan={plan} legs={legs} direction={direction} config={configSnapshot}
            expandedDay={expandedDay} setExpandedDay={setExpandedDay}
            onBack={() => setStep("config")}
          />
        )}
      </div>
    </div>
  );
}

// ─── Config Panel ─────────────────────────────────────────────────────────────
function ConfigPanel({ direction, dest, wakeHour, sleepHour, destWakeHour, sleepDuration, bedtimeBuffer, meetings, legs, hasRedEye, depDayWake, leaveHomeTime, airportArrTime, useHotel, hotelCheckinTime, hotelWakeTime, preFlightDays, onPreFlightDays, onDepDayWake, onLeaveHomeTime, onAirportArrTime, onUseHotel, onHotelCheckinTime, onHotelWakeTime, onDirection, onDest, onWake, onSleep, onDestWakeHour, onSleepDuration, onBedtimeBuffer, onMeetings, onUpdateLeg, onAddLeg, onRemoveLeg, onGenerate, outboundTiming, returnTiming, onOutboundTiming, onReturnTiming, protocolTiming }) {
  return (
    <div>
      <Card title="Trip Direction">
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { val: "outbound", icon: "🛫", main: "San Diego → Asia", sub: "Westward · clock delay" },
            { val: "return",   icon: "🛬", main: "Asia → San Diego", sub: "Eastward · clock advance" },
          ].map(o => (
            <button key={o.val} onClick={() => onDirection(o.val)} style={{
              flex: 1, padding: "13px 10px", cursor: "pointer", textAlign: "left",
              display: "flex", flexDirection: "column", gap: 3, borderRadius: 9,
              background: direction===o.val ? "rgba(180,160,50,0.1)" : "rgba(255,255,255,0.02)",
              border: direction===o.val ? "1px solid rgba(180,160,50,0.4)" : "1px solid rgba(255,255,255,0.07)",
              transition: "all 0.15s",
            }}>
              <div style={{ fontSize: 18 }}>{o.icon}</div>
              <div style={{ fontSize: 13, color: direction===o.val ? "#d4b84a" : "#b0a888" }}>{o.main}</div>
              <div style={{ fontSize: 10, color: "#6a6050" }}>{o.sub}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Protocol Timing" sub="When to run the active circadian shifting protocol — independently for each direction.">
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#b4a050", fontFamily: "monospace", letterSpacing: "0.15em", marginBottom: 6 }}>OUTBOUND (SD → ASIA)</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { val: "before", icon: "📋", main: "Before the flight", sub: "Shift clock at home before departure" },
              { val: "after",  icon: "🌏", main: "After the flight",  sub: "Shift clock at destination after arrival" },
            ].map(o => (
              <button key={o.val} onClick={() => onOutboundTiming(o.val)} style={{
                flex: 1, padding: "11px 10px", cursor: "pointer", textAlign: "left",
                display: "flex", flexDirection: "column", gap: 2, borderRadius: 8,
                background: outboundTiming===o.val ? "rgba(180,160,50,0.1)" : "rgba(255,255,255,0.02)",
                border: outboundTiming===o.val ? "1px solid rgba(180,160,50,0.4)" : "1px solid rgba(255,255,255,0.07)",
                transition: "all 0.15s",
              }}>
                <div style={{ fontSize: 16 }}>{o.icon}</div>
                <div style={{ fontSize: 12, color: outboundTiming===o.val ? "#d4b84a" : "#b0a888" }}>{o.main}</div>
                <div style={{ fontSize: 10, color: "#5a5040" }}>{o.sub}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#b4a050", fontFamily: "monospace", letterSpacing: "0.15em", marginBottom: 6 }}>RETURN (ASIA → SD)</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { val: "before", icon: "📋", main: "Before the flight", sub: "Shift clock at destination before departure" },
              { val: "after",  icon: "🏠", main: "After the flight",  sub: "Shift clock at home after arrival" },
            ].map(o => (
              <button key={o.val} onClick={() => onReturnTiming(o.val)} style={{
                flex: 1, padding: "11px 10px", cursor: "pointer", textAlign: "left",
                display: "flex", flexDirection: "column", gap: 2, borderRadius: 8,
                background: returnTiming===o.val ? "rgba(180,160,50,0.1)" : "rgba(255,255,255,0.02)",
                border: returnTiming===o.val ? "1px solid rgba(180,160,50,0.4)" : "1px solid rgba(255,255,255,0.07)",
                transition: "all 0.15s",
              }}>
                <div style={{ fontSize: 16 }}>{o.icon}</div>
                <div style={{ fontSize: 12, color: returnTiming===o.val ? "#d4b84a" : "#b0a888" }}>{o.main}</div>
                <div style={{ fontSize: 10, color: "#5a5040" }}>{o.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Your Baseline Schedule">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <Lbl>Destination</Lbl>
            <Sel value={dest} onChange={e => onDest(e.target.value)}>
              <option value="manila">Manila, Philippines</option>
              <option value="sumatra">West Sumatra, Indonesia</option>
              <option value="san_diego">San Diego, CA</option>
            </Sel>
          </div>
          <div>
            <Lbl>Wake time at home (SD)</Lbl>
            <Sel value={wakeHour} onChange={e => onWake(Number(e.target.value))}>
              {Array.from({length:12},(_,i)=>i+4).map(h=>(
                <option key={h} value={h}>{fmtHr(h)}</option>
              ))}
            </Sel>
          </div>
          <div>
            <Lbl>Wake time at destination</Lbl>
            <Sel value={destWakeHour} onChange={e => onDestWakeHour(Number(e.target.value))}>
              {Array.from({length:12},(_,i)=>i+4).map(h=>(
                <option key={h} value={h}>{fmtHr(h)}</option>
              ))}
            </Sel>
            <div style={{ fontSize: 10, color: "#5a5040", marginTop: 4 }}>Used for post-arrival sleep window</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <Lbl>Sleep needed (hours)</Lbl>
            <Sel value={sleepDuration} onChange={e => onSleepDuration(Number(e.target.value))}>
              {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(h => (
                <option key={h} value={h}>{h}h</option>
              ))}
            </Sel>
            <div style={{ fontSize: 10, color: "#5a5040", marginTop: 4 }}>Actual sleep, not time in bed</div>
          </div>
          <div>
            <Lbl>Wind-down buffer (minutes)</Lbl>
            <Sel value={bedtimeBuffer} onChange={e => onBedtimeBuffer(Number(e.target.value))}>
              {[0, 15, 20, 30, 45, 60, 75, 90].map(m => (
                <option key={m} value={m}>{m === 0 ? "None" : `${m} min`}</option>
              ))}
            </Sel>
            <div style={{ fontSize: 10, color: "#5a5040", marginTop: 4 }}>
              Time in bed before sleep onset · Total in bed: {Math.floor((sleepDuration * 60 + bedtimeBuffer) / 60)}h {(sleepDuration * 60 + bedtimeBuffer) % 60 > 0 ? `${(sleepDuration * 60 + bedtimeBuffer) % 60}m` : ""}
            </div>
          </div>
        </div>

        {/* Pre-flight ramp */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Lbl>{protocolTiming === "before" ? "Pre-flight ramp length" : "Post-arrival ramp length"}</Lbl>
            <span style={{ fontSize: 13, color: "#d4b84a", fontFamily: "monospace", fontWeight: "bold" }}>
              {preFlightDays} days
            </span>
          </div>
          <input
            type="range" min={3} max={7} step={1} value={preFlightDays}
            onChange={e => onPreFlightDays(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#b4a050", cursor: "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#5a5040", fontFamily: "monospace", marginTop: 3 }}>
            <span>3 days · minimal disruption</span>
            <span>7 days · maximum shift</span>
          </div>
          <div style={{ fontSize: 11, color: "#5a5040", marginTop: 8, lineHeight: 1.55 }}>
            {protocolTiming === "before"
              ? (preFlightDays <= 3
                ? "Standard protocol. Produces ~2–2.5h of pre-shift with moderate lifestyle impact."
                : preFlightDays <= 5
                ? `${preFlightDays}-day ramp produces ~${preFlightDays * 1.25 - 1.25}–${preFlightDays}h of pre-shift. Meaningful reduction in post-arrival recovery.`
                : `7-day ramp can pre-shift up to ~7h westward — potentially landing nearly adjusted. Requires real schedule flexibility for a full week.`)
              : (preFlightDays <= 3
                ? "Standard protocol. ~2–2.5h of active post-arrival shifting with moderate lifestyle impact."
                : preFlightDays <= 5
                ? `${preFlightDays}-day active ramp at your arrival location. Shifts ~${preFlightDays * 1.25 - 1.25}–${preFlightDays}h using light, melatonin, and meal timing.`
                : `7-day active ramp — maximizes post-arrival shifting. Requires disciplined light/meal schedule for a full week after landing.`)}
          </div>
        </div>
      </Card>

      <Card title="Recurring Meetings" sub="Meetings you must attend remotely. The plan will flag these days and suggest alertness strategies.">
        {meetings.map((mtg, idx) => {
          const DAY_OPTS = [{v:1,l:"Mon"},{v:2,l:"Tue"},{v:3,l:"Wed"},{v:4,l:"Thu"},{v:5,l:"Fri"},{v:6,l:"Sat"},{v:0,l:"Sun"}];
          const destMeetingStart = (mtg.startHour - HOME_UTC + DESTINATIONS[dest].utcOffset + 24) % 24;
          const destMeetingEnd   = (mtg.endHour   - HOME_UTC + DESTINATIONS[dest].utcOffset + 24) % 24;
          return (
            <div key={mtg.id} style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8, padding: "11px 12px", marginBottom: 8, position: "relative",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <Lbl>Meeting name</Lbl>
                  <Inp value={mtg.label} onChange={e => onMeetings(prev => prev.map(m => m.id===mtg.id ? {...m,label:e.target.value} : m))} placeholder="e.g. Team standup" />
                </div>
                <div>
                  <Lbl>Start (PDT)</Lbl>
                  <Sel value={mtg.startHour} onChange={e => onMeetings(prev => prev.map(m => m.id===mtg.id ? {...m,startHour:Number(e.target.value)} : m))}>
                    {Array.from({length:24},(_,i)=>i).map(h=><option key={h} value={h}>{fmtHr(h)}</option>)}
                  </Sel>
                </div>
                <div>
                  <Lbl>End (PDT)</Lbl>
                  <Sel value={mtg.endHour} onChange={e => onMeetings(prev => prev.map(m => m.id===mtg.id ? {...m,endHour:Number(e.target.value)} : m))}>
                    {Array.from({length:24},(_,i)=>i).map(h=><option key={h} value={h}>{fmtHr(h)}</option>)}
                  </Sel>
                </div>
              </div>
              <div>
                <Lbl>Repeats on</Lbl>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {DAY_OPTS.map(day => {
                    const on = mtg.days.includes(day.v);
                    return (
                      <button key={day.v} onClick={() => onMeetings(prev => prev.map(m => m.id===mtg.id ? {...m, days: on ? m.days.filter(d=>d!==day.v) : [...m.days,day.v].sort()} : m))} style={{
                        padding: "3px 9px", borderRadius: 5, fontSize: 10, cursor: "pointer", fontFamily: "monospace",
                        background: on ? "rgba(180,160,50,0.2)" : "rgba(255,255,255,0.03)",
                        border: on ? "1px solid rgba(180,160,50,0.5)" : "1px solid rgba(255,255,255,0.08)",
                        color: on ? "#d4b84a" : "#5a5040",
                      }}>{day.l}</button>
                    );
                  })}
                </div>
              </div>
              {mtg.days.length > 0 && (
                <div style={{ fontSize: 10, color: "#5a5040", marginTop: 7 }}>
                  At destination: {fmtHr(destMeetingStart)}–{fmtHr(destMeetingEnd)} {DESTINATIONS[dest].tzLabel}
                </div>
              )}
              {meetings.length > 1 && (
                <button onClick={() => onMeetings(prev => prev.filter(m => m.id !== mtg.id))} style={{
                  position: "absolute", top: 9, right: 9,
                  background: "transparent", border: "1px solid rgba(200,80,80,0.3)",
                  borderRadius: 4, color: "#c06050", padding: "2px 8px", fontSize: 10, cursor: "pointer",
                }}>✕</button>
              )}
            </div>
          );
        })}
        <button onClick={() => onMeetings(prev => [...prev, { id: Date.now(), label: "", days: [], startHour: 9, endHour: 10 }])} style={{
          width: "100%", padding: "9px", background: "transparent",
          border: "1px dashed rgba(180,160,100,0.2)", borderRadius: 8,
          color: "#6a6050", fontSize: 11, cursor: "pointer", fontFamily: "monospace",
        }}>+ Add meeting</button>
      </Card>

      <Card title="Flight Itinerary" sub="Enter each flight segment including connections. All times in local time at each city.">
        {legs.map((leg, idx) => (
          <div key={leg.id} style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 9, padding: "13px", marginBottom: 8, position: "relative",
          }}>
            <div style={{ fontSize: 9, color: "#b4a050", fontFamily: "monospace", marginBottom: 9, letterSpacing: "0.18em" }}>
              SEGMENT {idx + 1}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", gap: 8, marginBottom: 8 }}>
              <div><Lbl>From</Lbl><Inp value={leg.depCity} onChange={e => onUpdateLeg(leg.id,"depCity",e.target.value)} placeholder="LAX" /></div>
              <div><Lbl>Departure date</Lbl><Inp type="date" value={leg.depDate} onChange={e => onUpdateLeg(leg.id,"depDate",e.target.value)} /></div>
              <div><Lbl>Departs (local)</Lbl><Inp type="time" value={leg.depTime} onChange={e => onUpdateLeg(leg.id,"depTime",e.target.value)} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", gap: 8 }}>
              <div><Lbl>To</Lbl><Inp value={leg.arrCity} onChange={e => onUpdateLeg(leg.id,"arrCity",e.target.value)} placeholder="NRT" /></div>
              <div><Lbl>Arrival date (local)</Lbl><Inp type="date" value={leg.arrDate} onChange={e => onUpdateLeg(leg.id,"arrDate",e.target.value)} /></div>
              <div><Lbl>Arrives (local)</Lbl><Inp type="time" value={leg.arrTime} onChange={e => onUpdateLeg(leg.id,"arrTime",e.target.value)} /></div>
            </div>
            {legs.length > 1 && (
              <button onClick={() => onRemoveLeg(leg.id)} style={{
                position: "absolute", top: 9, right: 9,
                background: "transparent", border: "1px solid rgba(200,80,80,0.3)",
                borderRadius: 4, color: "#c06050", padding: "2px 8px", fontSize: 10, cursor: "pointer",
              }}>✕</button>
            )}
          </div>
        ))}
        <button onClick={onAddLeg} style={{
          width: "100%", padding: "9px", background: "transparent",
          border: "1px dashed rgba(180,160,100,0.2)", borderRadius: 8,
          color: "#6a6050", fontSize: 11, cursor: "pointer", fontFamily: "monospace",
        }}>+ Add connection / layover</button>
      </Card>

      {hasRedEye && protocolTiming === "before" && (
        <Card title="Departure Day Logistics">
          {/* Hotel toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { val: false, icon: "🏠", main: "Leave from home", sub: `Wake ${depDayWake || "early"}, drive to airport` },
              { val: true,  icon: "🏨", main: "Stay at airport hotel", sub: "Check in night before, relax departure morning" },
            ].map(o => (
              <button key={String(o.val)} onClick={() => onUseHotel(o.val)} style={{
                flex: 1, padding: "11px 10px", cursor: "pointer", textAlign: "left",
                display: "flex", flexDirection: "column", gap: 2, borderRadius: 8,
                background: useHotel === o.val ? "rgba(74,106,144,0.15)" : "rgba(255,255,255,0.02)",
                border: useHotel === o.val ? "1px solid rgba(74,106,144,0.5)" : "1px solid rgba(255,255,255,0.07)",
                transition: "all 0.15s",
              }}>
                <div style={{ fontSize: 16 }}>{o.icon}</div>
                <div style={{ fontSize: 12, color: useHotel === o.val ? "#7aaad0" : "#b0a888" }}>{o.main}</div>
                <div style={{ fontSize: 10, color: "#5a5040" }}>{o.sub}</div>
              </button>
            ))}
          </div>

          {useHotel ? (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Lbl>Check in at hotel (night before)</Lbl>
                  <Inp type="time" value={hotelCheckinTime} onChange={e => onHotelCheckinTime(e.target.value)} />
                </div>
                <div>
                  <Lbl>Wake at hotel (departure morning)</Lbl>
                  <Inp type="time" value={hotelWakeTime} onChange={e => onHotelWakeTime(e.target.value)} />
                </div>
              </div>
              {hotelCheckinTime && hotelWakeTime && (() => {
                const checkin = timeToMin(hotelCheckinTime);
                const wake = timeToMin(hotelWakeTime);
                const onset = checkin + bedtimeBuffer;
                const sleepMins = ((wake - onset) % (24 * 60) + 24 * 60) % (24 * 60);
                const sleepHrs = Math.round(sleepMins / 60 * 10) / 10;
                const ok = sleepHrs >= sleepDuration - 0.5;
                return (
                  <div style={{
                    marginTop: 10, padding: "8px 12px", borderRadius: 6, fontSize: 11, lineHeight: 1.55,
                    background: ok ? "rgba(60,140,80,0.08)" : "rgba(200,80,60,0.08)",
                    border: ok ? "1px solid rgba(60,140,80,0.25)" : "1px solid rgba(200,80,60,0.25)",
                    color: ok ? "#70c090" : "#d07060",
                  }}>
                    {ok
                      ? `✓ ${sleepHrs}h sleep — you'll be fully rested for the flight. Check in at ${hotelCheckinTime}, wake ${hotelWakeTime}.`
                      : `⚠ Only ${sleepHrs}h sleep — try checking in earlier or waking later to reach your ${sleepDuration}h target.`}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <Lbl>Wake up (departure day)</Lbl>
                <Inp type="time" value={depDayWake} onChange={e => onDepDayWake(e.target.value)} />
              </div>
              <div>
                <Lbl>Leave home</Lbl>
                <Inp type="time" value={leaveHomeTime} onChange={e => onLeaveHomeTime(e.target.value)} />
              </div>
              <div>
                <Lbl>Arrive at airport</Lbl>
                <Inp type="time" value={airportArrTime} onChange={e => onAirportArrTime(e.target.value)} />
              </div>
            </div>
          )}
        </Card>
      )}

      {hasRedEye && (() => {
        const firstLeg = legs[0];
        const depH = parseInt((firstLeg.depTime || "12:00").split(":")[0]);
        const isLateNight = depH >= 22 || depH < 5;
        const isNextDay = firstLeg.arrDate && firstLeg.depDate && firstLeg.arrDate > firstLeg.depDate;
        return (
          <div style={{
            background: "rgba(200,150,40,0.06)", border: "1px solid rgba(200,150,40,0.22)",
            borderRadius: 9, padding: "13px 15px", marginBottom: 14,
            fontSize: 12, color: "#c8a050", lineHeight: 1.65,
          }}>
            {isLateNight
              ? <><strong>⚠ Late-night departure detected.</strong> Your plan will include specific light management advice for the terminal and in-flight sleep timing.</>
              : <><strong>⚠ Long-haul flight crossing your sleep window.</strong> Your {firstLeg.depTime} departure arrives on {firstLeg.arrDate} — the flight spans your entire sleep window. Your plan will include in-flight sleep and meal timing advice keyed to this.</>
            }
          </div>
        );
      })()}

      <button onClick={onGenerate} style={{
        width: "100%", padding: "13px",
        background: "linear-gradient(135deg,#b4a050,#8a7030)",
        border: "none", borderRadius: 8, color: "#070810",
        fontSize: 13, fontWeight: "bold", letterSpacing: "0.1em",
        textTransform: "uppercase", cursor: "pointer", fontFamily: "monospace",
      }}>Generate My Protocol →</button>
    </div>
  );
}

// ─── Markdown generator ───────────────────────────────────────────────────────
function generateMarkdown(plan, config) {
  const { days, shiftNeeded, daysToAdjust, isDelay, cbTmin, destInfo } = plan;
  const { direction, legs, wakeHour, sleepHour, depDayWake, leaveHomeTime, airportArrTime, preFlightDays } = config;

  const lines = [];
  lines.push(`# Jet Lag Protocol — ${direction === "outbound" ? "San Diego → " + destInfo.name : destInfo.name + " → San Diego"}`);
  lines.push(`_Generated ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}_`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(`| **Direction** | ${direction === "outbound" ? "Westward (clock delay)" : "Eastward (clock advance)"} |`);
  lines.push(`| **Destination** | ${destInfo.name} (${destInfo.tzLabel}, UTC+${destInfo.utcOffset}) |`);
  lines.push(`| **Clock shift needed** | ${shiftNeeded}h ${isDelay ? "later" : "earlier"} |`);
  lines.push(`| **Your CBTmin** | ${fmtHr(cbTmin)} (core body temp minimum — light pivot point) |`);
  lines.push(`| **Est. recovery with protocol** | ${daysToAdjust}–${daysToAdjust + 1} days |`);
  lines.push(`| **Pre-flight ramp** | ${preFlightDays} days |`);
  lines.push(`| **Usual wake / sleep** | ${fmtHr(wakeHour)} / ${fmtHr(sleepHour)} |`);
  if (depDayWake) lines.push(`| **Departure day wake** | ${depDayWake} (leave ${leaveHomeTime}, airport ${airportArrTime}) |`);
  lines.push("");
  lines.push("## Itinerary");
  legs.forEach(l => {
    lines.push(`- ${l.depCity} ${l.depTime} (${l.depDate}) → ${l.arrCity} ${l.arrTime} (${l.arrDate || l.depDate})`);
  });
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Day-by-Day Plan");
  lines.push("");

  days.forEach(day => {
    const typeTag = day.type === "flight" ? " ✈" : day.type === "pre" ? "" : ` [${(day.status || "").toUpperCase()}]`;
    lines.push(`### ${day.label}${typeTag} — ${day.date}`);
    lines.push("");
    lines.push(`| | |`);
    lines.push(`|---|---|`);
    lines.push(`| **Wake** | ${day.wake} |`);
    lines.push(`| **Sleep** | ${day.sleep} |`);
    lines.push(`| ☀️ Seek light | ${day.seekLight} |`);
    lines.push(`| 🕶️ Avoid light | ${day.avoidLight} |`);
    lines.push(`| 💊 Melatonin | ${day.melatonin} |`);

    if (day.type === "flight" && day.flightMealSections && day.flightMealSections.length > 0) {
      lines.push("");
      day.flightMealSections.forEach(section => {
        lines.push(`**In-flight meals — ${section.legLabel}** _(timed to destination local time)_`);
        lines.push("");
        section.meals.forEach(m => {
          lines.push(`- **${m.mealName}** at ${m.destLocalTime} dest. time (~${m.depLocalTime} dep. local, ${m.elapsedHrs}h into flight) — ${m.note}`);
        });
      });
    } else if (day.meals && day.meals.length > 0) {
      lines.push("");
      lines.push("**Meals**");
      lines.push("");
      day.meals.forEach(m => {
        lines.push(`- **${m.name}** — ${m.time} — ${m.note}`);
      });
    }

    if (day.legSummary) {
      lines.push("");
      lines.push(`_Segments: ${day.legSummary}_`);
    }

    lines.push("");
    lines.push(`> ${day.notes}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  lines.push("## Always-On Rules");
  lines.push("");
  [
    "☕ Caffeine before noon at destination only",
    "💧 Stay well hydrated — dehydration amplifies every symptom",
    "🏃 Exercise in the destination's morning, not evening",
    "🍽️ No snacking between designated meal windows",
    "🚫 No alcohol — fragments sleep, blocks melatonin",
    "📱 Night mode on all screens 2h before bed",
  ].forEach(t => lines.push(`- ${t}`));

  return lines.join("\n");
}

// ─── Plan View ────────────────────────────────────────────────────────────────
function PlanView({ plan, legs, direction, config, expandedDay, setExpandedDay, onBack }) {
  const { days, shiftNeeded, daysToAdjust, isDelay, cbTmin, destInfo } = plan;
  const [copied, setCopied] = useState(false);

  function handleCopyMarkdown() {
    const md = generateMarkdown(plan, config);
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function handleDownloadJSON() {
    const { shiftNeeded, daysToAdjust, isDelay, cbTmin, destInfo } = plan;
    const output = {
      _meta: {
        description: "Jet Lag Protocol — generated by Javin's Jet Lag Planner",
        generated: new Date().toISOString(),
        direction: config.direction === "outbound" ? `San Diego → ${destInfo.name}` : `${destInfo.name} → San Diego`,
        usage: "Upload this file to Claude to discuss, adjust, or build on this jet lag protocol.",
      },
      trip: {
        direction: config.direction,
        destination: destInfo.name,
        timezone: `${destInfo.tzLabel} (UTC${destInfo.utcOffset >= 0 ? "+" : ""}${destInfo.utcOffset})`,
        shiftNeededHours: shiftNeeded,
        shiftDirection: isDelay ? "delay (westward)" : "advance (eastward)",
        estimatedAdjustmentDays: daysToAdjust,
        preFlightRampDays: config.preFlightDays,
        flights: config.legs,
      },
      sleepProfile: {
        homeWakeTime: `${config.wakeHour}:00`,
        destWakeTime: `${config.destWakeHour}:00`,
        homeBedtime: `${config.sleepHour}:00`,
        sleepDurationHours: config.sleepDuration,
        windDownMinutes: config.bedtimeBuffer,
        totalTimeInBedHours: (config.sleepDuration * 60 + config.bedtimeBuffer) / 60,
        cbTminHome: `${cbTmin}:00`,
      },
      departureLogistics: {
        useHotel: config.useHotel,
        hotelCheckin: config.useHotel ? config.hotelCheckinTime : null,
        hotelWake: config.useHotel ? config.hotelWakeTime : null,
        homeWake: config.useHotel ? null : config.depDayWake,
        leaveHome: config.useHotel ? null : config.leaveHomeTime,
        airportArrival: config.useHotel ? null : config.airportArrTime,
      },
      recurringMeetings: config.meetings.map(m => ({
        label: m.label,
        daysPDT: m.days,
        startPDT: `${m.startHour}:00`,
        endPDT: `${m.endHour}:00`,
      })),
      protocol: plan.days.map(day => ({
        label: day.label,
        date: day.date,
        type: day.type,
        status: day.status || null,
        sleep: day.sleep,
        wake: day.wake,
        seekLight: day.seekLight,
        avoidLight: day.avoidLight,
        melatonin: day.melatonin,
        meals: day.meals || null,
        notes: day.notes || [],
      })),
    };
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jetlag-protocol-${config.direction}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrintPDF() {
    const { direction, legs, wakeHour, sleepHour, depDayWake, leaveHomeTime, airportArrTime, preFlightDays } = config;
    const title = `Jet Lag Protocol — ${direction === "outbound" ? "San Diego → " + destInfo.name : destInfo.name + " → San Diego"}`;
    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const typeColor = d => d.type === "flight" ? "#7a5f00" : d.type === "hotel" ? "#1a3a6a" : d.type === "pre" ? "#2a3a5a" : d.status === "critical" ? "#6a1a10" : d.status === "moderate" ? "#5a3a00" : "#0a4a20";
    const typeBg   = d => d.type === "flight" ? "#fdf6dc" : d.type === "hotel" ? "#eef4ff" : d.type === "pre" ? "#f0f4ff" : d.status === "critical" ? "#fff0ee" : d.status === "moderate" ? "#fff8ee" : "#f0fff6";
    const typeTag  = d => d.type === "flight" ? "FLIGHT" : d.type === "hotel" ? "HOTEL" : d.type === "pre" ? "PRE-FLIGHT" : (d.status || "").toUpperCase();

    const dayHTML = days.map(day => {
      const mealsHTML = (() => {
        if (day.type === "flight" && day.flightMealSections && day.flightMealSections.length > 0) {
          return day.flightMealSections.map(s => `
            <div class="meal-section">
              <div class="meal-section-title">🍽️ In-flight meals — ${s.legLabel}</div>
              ${s.meals.map(m => `
                <div class="meal-row">
                  <span class="meal-icon">${m.icon}</span>
                  <span class="meal-name">${m.mealName}</span>
                  <span class="meal-time">${m.destLocalTime} dest.</span>
                  <span class="meal-sub">(~${m.depLocalTime} dep. local · ${m.elapsedHrs}h in)</span>
                  <span class="meal-note"> — ${m.note}</span>
                </div>`).join("")}
            </div>`).join("");
        } else if (day.meals && day.meals.length > 0) {
          return `<div class="meal-section">
            <div class="meal-section-title">🍽️ Meal timing</div>
            <div class="meal-grid">
              ${day.meals.map(m => `
                <div class="meal-card">
                  <div class="meal-card-icon">${m.icon}</div>
                  <div class="meal-card-name">${m.name}</div>
                  <div class="meal-card-time">${m.time}</div>
                  <div class="meal-card-note">${m.note}</div>
                </div>`).join("")}
            </div>
          </div>`;
        }
        return "";
      })();

      return `
        <div class="day-card" style="border-left:4px solid ${typeColor(day)}; background:${typeBg(day)}">
          <div class="day-header">
            <div>
              <span class="day-label">${day.label}</span>
              <span class="day-date">${day.date}</span>
            </div>
            <span class="day-tag" style="color:${typeColor(day)};border-color:${typeColor(day)}">${typeTag(day)}</span>
          </div>
          ${day.legSummary ? `<div class="leg-summary">${day.legSummary}</div>` : ""}
          <div class="day-grid">
            <div class="day-field"><span class="field-label">🌅 WAKE</span><span class="field-val">${day.wake}</span></div>
            <div class="day-field"><span class="field-label">🌙 SLEEP</span><span class="field-val">${day.sleep}</span></div>
            <div class="day-field wide"><span class="field-label">☀️ SEEK LIGHT</span><span class="field-val">${day.seekLight}</span></div>
            <div class="day-field wide"><span class="field-label">🕶️ AVOID LIGHT</span><span class="field-val">${day.avoidLight}</span></div>
            <div class="day-field wide"><span class="field-label">💊 MELATONIN</span><span class="field-val">${day.melatonin}</span></div>
          </div>
          ${mealsHTML}
          <div class="day-note">${day.notes}</div>
        </div>`;
    }).join("");

    const itineraryHTML = legs.map(l =>
      `<span class="itin-leg">${l.depCity} ${l.depTime} → ${l.arrCity} ${l.arrTime} <em>(${l.arrDate || l.depDate})</em></span>`
    ).join("  ·  ");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>
      @page { margin: 18mm 16mm; size: A4; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Georgia, serif; font-size: 11px; color: #1a1a2e; background: white; line-height: 1.5; }
      h1 { font-size: 20px; font-weight: normal; color: #1a1a2e; margin-bottom: 2px; }
      .subtitle { font-size: 10px; color: #888; font-style: italic; margin-bottom: 14px; }
      .summary-bar { display: flex; gap: 20px; background: #f8f6f0; border: 1px solid #d4c080; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; flex-wrap: wrap; }
      .summary-item { font-size: 10px; } .summary-item strong { color: #1a1a2e; }
      .itin-box { background: #f5f5f5; border-radius: 5px; padding: 8px 12px; font-size: 10px; font-family: monospace; color: #444; margin-bottom: 16px; }
      .itin-label { color: #b4a050; font-weight: bold; margin-bottom: 4px; letter-spacing: 0.1em; }
      .itin-leg { white-space: nowrap; }
      .section-title { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: #b4a050; font-family: monospace; margin: 16px 0 8px; border-bottom: 1px solid #e8e0c0; padding-bottom: 4px; }
      .day-card { border-radius: 0 6px 6px 0; padding: 10px 12px; margin-bottom: 8px; page-break-inside: avoid; }
      .day-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
      .day-label { font-size: 12px; font-weight: bold; color: #1a1a2e; margin-right: 8px; }
      .day-date { font-size: 10px; color: #888; }
      .day-tag { font-size: 8px; padding: 1px 6px; border: 1px solid; border-radius: 20px; font-family: monospace; white-space: nowrap; }
      .leg-summary { font-size: 9px; font-family: monospace; color: #7a6020; background: rgba(180,160,50,0.1); padding: 3px 7px; border-radius: 3px; margin-bottom: 6px; }
      .day-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; margin-bottom: 6px; }
      .day-field { display: flex; gap: 6px; align-items: baseline; }
      .day-field.wide { grid-column: 1 / -1; }
      .field-label { font-size: 8px; font-family: monospace; color: #888; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; min-width: 72px; }
      .field-val { font-size: 10px; color: #1a1a2e; }
      .day-note { font-size: 10px; color: #555; font-style: italic; border-left: 2px solid #d4c080; padding-left: 8px; margin-top: 6px; line-height: 1.55; }
      .meal-section { margin-top: 7px; padding-top: 7px; border-top: 1px solid rgba(0,0,0,0.08); }
      .meal-section-title { font-size: 8px; font-family: monospace; color: #a07820; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 5px; }
      .meal-row { font-size: 10px; display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 3px; align-items: baseline; }
      .meal-icon { font-size: 12px; }
      .meal-name { font-weight: bold; color: #7a5000; }
      .meal-time { color: #1a1a2e; }
      .meal-sub { color: #999; font-size: 9px; font-family: monospace; }
      .meal-note { color: #555; font-style: italic; }
      .meal-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
      .meal-card { background: rgba(180,140,60,0.07); border: 1px solid rgba(180,140,60,0.2); border-radius: 5px; padding: 6px 8px; }
      .meal-card-icon { font-size: 14px; margin-bottom: 2px; }
      .meal-card-name { font-size: 9px; color: #b4a050; font-family: monospace; letter-spacing: 0.08em; text-transform: uppercase; }
      .meal-card-time { font-size: 11px; color: #1a1a2e; margin: 2px 0; }
      .meal-card-note { font-size: 9px; color: #666; line-height: 1.4; }
      .always-on { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 8px; }
      .always-on-item { font-size: 10px; color: #444; background: #f8f8f8; padding: 5px 8px; border-radius: 4px; line-height: 1.45; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>
      <h1>${title}</h1>
      <div class="subtitle">Generated ${date} · ${preFlightDays}-day pre-flight ramp</div>
      <div class="summary-bar">
        <div class="summary-item"><strong>Shift needed:</strong> ${shiftNeeded}h ${isDelay ? "later (delay)" : "earlier (advance)"}</div>
        <div class="summary-item"><strong>CBTmin:</strong> ${fmtHr(cbTmin)}</div>
        <div class="summary-item"><strong>Est. recovery:</strong> ${daysToAdjust}–${daysToAdjust+1} days with protocol</div>
        <div class="summary-item"><strong>Usual wake/sleep:</strong> ${fmtHr(wakeHour)} / ${fmtHr(sleepHour)}</div>
        ${depDayWake ? `<div class="summary-item"><strong>Dep. day wake:</strong> ${depDayWake} · leave ${leaveHomeTime} · airport ${airportArrTime}</div>` : ""}
      </div>
      <div class="itin-box">
        <div class="itin-label">ITINERARY</div>
        ${itineraryHTML}
      </div>
      <div class="section-title">Day-by-Day Protocol</div>
      ${dayHTML}
      <div class="section-title">Always-On Rules</div>
      <div class="always-on">
        ${["☕ Caffeine before noon at destination only","💧 Stay well hydrated — dehydration amplifies every symptom","🏃 Exercise in the destination's morning, not evening","🍽️ No snacking between designated meal windows","🚫 No alcohol — fragments sleep, blocks melatonin","📱 Night mode on all screens 2h before bed"].map(t=>`<div class="always-on-item">${t}</div>`).join("")}
      </div>
    </body></html>`;

    const win = window.open("", "_blank");
    if (!win) { alert("Please allow popups for this page to print the PDF."); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }

  return (
    <div>
      <div style={{
        padding: "13px 16px", borderRadius: 9, marginBottom: 16,
        background: "rgba(180,160,50,0.07)", border: "1px solid rgba(180,160,50,0.18)",
        fontSize: 12, color: "#9a8a70", lineHeight: 1.8,
      }}>
        <span style={{ color: "#b4a050", fontFamily: "monospace", fontSize: 10, letterSpacing: "0.18em" }}>
          {direction === "outbound" ? "OUTBOUND" : "RETURN"} · {destInfo.name.toUpperCase()}
        </span><br />
        Clock shift: <strong style={{ color: "#e8e4dc" }}>{shiftNeeded}h {isDelay ? "later (delay)" : "earlier (advance)"}</strong>
        &emsp;·&emsp;CBTmin: <strong style={{ color: "#e8e4dc" }}>{fmtHr(cbTmin)}</strong>
        &emsp;·&emsp;Est. recovery: <strong style={{ color: "#e8e4dc" }}>{daysToAdjust}–{daysToAdjust+1} days</strong>
        {!isDelay && <><br /><span style={{ color: "#c08040", fontSize: 11 }}>⚠ Eastward advances are harder — morning light is your primary lever.</span></>}
      </div>

      <div style={{
        padding: "10px 14px", borderRadius: 8, marginBottom: 16,
        background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)",
        fontSize: 11, color: "#6a6050", fontFamily: "monospace",
      }}>
        <div style={{ color: "#b4a050", marginBottom: 5, letterSpacing: "0.15em", fontSize: 10 }}>YOUR ITINERARY</div>
        {legs.map((l, i) => (
          <div key={i} style={{ marginBottom: 2 }}>
            {l.depCity} {l.depTime} → {l.arrCity} {l.arrTime}
            <span style={{ color: "#3a3028", marginLeft: 8 }}>arrives {l.arrDate}</span>
          </div>
        ))}
      </div>

      <div style={{ position: "relative" }}>
        <div style={{
          position: "absolute", left: 17, top: 0, bottom: 0,
          width: 1, background: "rgba(180,160,100,0.07)", pointerEvents: "none",
        }} />

        {days.map((day, i) => {
          const isExp = expandedDay === i;
          const dotColor =
            day.type === "pre" ? "#403830" :
            day.type === "hotel" ? "#4a6a90" :
            day.type === "flight" ? "#b4a050" :
            day.status === "critical" ? "#c04838" :
            day.status === "moderate" ? "#b08838" : "#488860";

          return (
            <div key={i} style={{ position: "relative", paddingLeft: 42, marginBottom: 5 }}>
              <div style={{
                position: "absolute", left: 11, top: 17,
                width: 13, height: 13, borderRadius: "50%",
                background: dotColor, border: `1px solid ${dotColor}80`, zIndex: 1,
              }} />
              <button onClick={() => setExpandedDay(isExp ? -1 : i)} style={{
                width: "100%", textAlign: "left",
                background: isExp ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.012)",
                border: isExp ? "1px solid rgba(180,160,100,0.18)" : "1px solid rgba(255,255,255,0.04)",
                borderRadius: 9, padding: "11px 13px", cursor: "pointer", transition: "all 0.12s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 13, color: "#ddd8cc", fontWeight: "bold" }}>{day.label}</span>
                    <span style={{ fontSize: 11, color: "#4a4030", marginLeft: 8 }}>{day.date}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    {day.type === "post" && <Tag c={dotColor}>{day.status==="critical"?"HARD":day.status==="moderate"?"MODERATE":"EASY"}</Tag>}
                    {day.type === "flight" && <Tag c="#b4a050">FLIGHT</Tag>}
                    {day.type === "hotel" && <Tag c="#4a6a90">HOTEL</Tag>}
                    <span style={{ color: "#4a4030", fontSize: 11 }}>{isExp ? "▲" : "▼"}</span>
                  </div>
                </div>
                {!isExp && (
                  <div style={{ fontSize: 11, color: "#4a4030", marginTop: 2 }}>
                    Wake {day.wake} · Sleep {day.sleep}
                    {day.type==="flight" && day.legSummary && <span style={{ marginLeft: 8, color: "#3a3028" }}>{day.legSummary}</span>}
                  </div>
                )}
              </button>

              {isExp && (
                <div style={{
                  background: "rgba(255,255,255,0.012)",
                  border: "1px solid rgba(180,160,100,0.1)", borderTop: "none",
                  borderRadius: "0 0 9px 9px", padding: "13px", marginTop: -2,
                }}>
                  {day.type === "flight" && day.legSummary && (
                    <div style={{
                      fontSize: 11, fontFamily: "monospace", color: "#b4a050",
                      marginBottom: 11, padding: "5px 9px",
                      background: "rgba(180,160,50,0.05)", borderRadius: 5,
                    }}>{day.legSummary}</div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 11 }}>
                    <Pill icon="🌅" label="Wake" value={day.wake} />
                    <Pill icon="🌙" label="Sleep" value={day.sleep} />
                  </div>

                  <IRow icon="☀️" c="#b08030" label="SEEK LIGHT" value={day.seekLight} />
                  <IRow icon="🕶️" c="#4060a8" label="AVOID LIGHT" value={day.avoidLight} />
                  <IRow icon="💊" c="#608870" label="MELATONIN"   value={day.melatonin} />

                  {/* Meal section */}
                  {day.type === "flight" && day.flightMealSections && day.flightMealSections.length > 0 ? (
                    <div style={{ marginTop: 12 }}>
                      {day.flightMealSections.map((section, si) => (
                        <div key={si}>
                          <div style={{
                            fontSize: 9, color: "#a07840", fontFamily: "monospace",
                            letterSpacing: "0.18em", marginBottom: 7, marginTop: si > 0 ? 10 : 0,
                          }}>
                            🍽️ MEAL SCHEDULE — {section.legLabel}
                          </div>
                          <div style={{ fontSize: 11, color: "#6a6050", marginBottom: 8, lineHeight: 1.5 }}>
                            Timed to <strong style={{ color: "#c0a060" }}>destination local meal hours</strong> — eating at these times resets your gut clock faster than eating at departure-time hours.
                          </div>
                          {section.meals.map((m, mi) => (
                            <FlightMealRow key={mi} meal={m} />
                          ))}
                          {section.meals.length === 0 && (
                            <div style={{ fontSize: 11, color: "#5a5040", fontStyle: "italic" }}>
                              No standard meal windows fall during this flight segment.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : day.meals ? (
                    <MealSection meals={day.meals} />
                  ) : null}

                  <div style={{
                    marginTop: 10, padding: "9px 12px",
                    background: "rgba(180,160,100,0.03)",
                    borderLeft: "2px solid rgba(180,160,100,0.2)",
                    borderRadius: "0 5px 5px 0",
                    fontSize: 12, color: "#8a7a60", lineHeight: 1.65, fontStyle: "italic",
                  }}>{day.notes}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Always-on */}
      <div style={{
        marginTop: 20, padding: "16px",
        background: "rgba(255,255,255,0.012)",
        border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10,
      }}>
        <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "#b4a050", fontFamily: "monospace", marginBottom: 11 }}>ALWAYS-ON RULES</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            "☕ Caffeine before noon at destination only",
            "💧 Stay well hydrated — dehydration amplifies every symptom",
            "🏃 Exercise in the destination's morning, not evening",
            "🍽️ No snacking between the designated meal windows",
            "🚫 No alcohol — fragments sleep, blocks melatonin",
            "📱 Night mode on all screens 2h before bed",
          ].map(t => (
            <div key={t} style={{
              fontSize: 11, color: "#5a5040", lineHeight: 1.5,
              padding: "7px 9px", background: "rgba(255,255,255,0.012)", borderRadius: 5,
            }}>{t}</div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{
          background: "#ffffff", border: "1px solid rgba(180,160,100,0.35)",
          borderRadius: 7, color: "#5a5040", padding: "9px 22px",
          cursor: "pointer", fontSize: 11, fontFamily: "monospace",
          fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}>← Edit Itinerary</button>
        <button onClick={handleCopyMarkdown} style={{
          background: copied ? "rgba(80,160,100,0.15)" : "rgba(180,160,50,0.1)",
          border: copied ? "1px solid rgba(80,160,100,0.4)" : "1px solid rgba(180,160,50,0.3)",
          borderRadius: 7, color: copied ? "#60c080" : "#b4a050", padding: "9px 22px",
          cursor: "pointer", fontSize: 11, fontFamily: "monospace", transition: "all 0.2s",
        }}>
          {copied ? "✓ Copied!" : "⬇ Copy as Markdown"}
        </button>
        <button onClick={handlePrintPDF} style={{
          background: "rgba(80,120,200,0.1)",
          border: "1px solid rgba(80,120,200,0.3)",
          borderRadius: 7, color: "#8090d0", padding: "9px 22px",
          cursor: "pointer", fontSize: 11, fontFamily: "monospace", transition: "all 0.2s",
        }}>
          🖨️ Print / Save PDF
        </button>
        <button onClick={handleDownloadJSON} style={{
          background: "rgba(100,180,140,0.1)",
          border: "1px solid rgba(100,180,140,0.3)",
          borderRadius: 7, color: "#70c090", padding: "9px 22px",
          cursor: "pointer", fontSize: 11, fontFamily: "monospace", transition: "all 0.2s",
        }}>
          {} Download JSON
        </button>
      </div>
    </div>
  );
}

// ─── Meal section (non-flight days) ──────────────────────────────────────────
function MealSection({ meals }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 9, color: "#a07840", fontFamily: "monospace", letterSpacing: "0.18em", marginBottom: 7 }}>
        🍽️ MEAL TIMING
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7,
      }}>
        {meals.map((m, i) => (
          <div key={i} style={{
            padding: "8px 10px",
            background: "rgba(160,120,60,0.06)",
            border: "1px solid rgba(160,120,60,0.15)",
            borderRadius: 7,
          }}>
            <div style={{ fontSize: 14, marginBottom: 3 }}>{m.icon}</div>
            <div style={{ fontSize: 10, color: "#b4a050", fontFamily: "monospace", letterSpacing: "0.1em" }}>{m.name}</div>
            <div style={{ fontSize: 13, color: "#e8e4dc", margin: "3px 0" }}>{m.time}</div>
            <div style={{ fontSize: 10, color: "#6a5a40", lineHeight: 1.45 }}>{m.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── In-flight meal row ───────────────────────────────────────────────────────
function FlightMealRow({ meal }) {
  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "flex-start",
      padding: "9px 11px", marginBottom: 6,
      background: "rgba(160,120,60,0.05)",
      border: "1px solid rgba(160,120,60,0.13)",
      borderRadius: 7,
    }}>
      <div style={{ fontSize: 20, lineHeight: 1, paddingTop: 1 }}>{meal.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#d4b060", fontWeight: "bold" }}>{meal.mealName}</span>
          <span style={{ fontSize: 12, color: "#e8e4dc" }}>{meal.destLocalTime} dest. time</span>
          <span style={{ fontSize: 10, color: "#5a5040", fontFamily: "monospace" }}>
            (~{meal.depLocalTime} dep. local · {meal.elapsedHrs}h into flight)
          </span>
        </div>
        <div style={{ fontSize: 11, color: "#7a6a50", marginTop: 3, lineHeight: 1.5 }}>{meal.note}</div>
      </div>
    </div>
  );
}

// ─── Shared micro-components ──────────────────────────────────────────────────
function Card({ title, sub, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.022)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 11, padding: "16px", marginBottom: 13,
    }}>
      <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "#b4a050", fontFamily: "monospace", marginBottom: sub ? 2 : 13 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: "#5a5040", marginBottom: 12 }}>{sub}</div>}
      {children}
    </div>
  );
}
function Lbl({ children }) {
  return <div style={{ fontSize: 9, color: "#5a5040", letterSpacing: "0.14em", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 4 }}>{children}</div>;
}
function Sel({ children, ...p }) {
  return (
    <select {...p} style={{
      width: "100%", padding: "8px 9px",
      background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 6, color: "#e8e4dc", fontSize: 12, outline: "none", fontFamily: "Georgia,serif",
    }}>{children}</select>
  );
}
function Inp(p) {
  return (
    <input {...p} style={{
      width: "100%", padding: "8px 9px", boxSizing: "border-box",
      background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 6, color: "#e8e4dc", fontSize: 12, outline: "none",
      fontFamily: "Georgia,serif", colorScheme: "dark",
    }} />
  );
}
function Pill({ icon, label, value }) {
  return (
    <div style={{ padding: "7px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ fontSize: 9, color: "#5a5040", letterSpacing: "0.12em", fontFamily: "monospace", textTransform: "uppercase" }}>{icon} {label}</div>
      <div style={{ fontSize: 14, color: "#e8e4dc", marginTop: 2 }}>{value}</div>
    </div>
  );
}
function IRow({ icon, c, label, value }) {
  return (
    <div style={{ display: "flex", gap: 9, marginBottom: 7, alignItems: "flex-start" }}>
      <div style={{ minWidth: 78, fontSize: 9, letterSpacing: "0.1em", fontFamily: "monospace", color: c, textTransform: "uppercase", paddingTop: 2 }}>{icon} {label}</div>
      <div style={{ fontSize: 12, color: "#a09878", lineHeight: 1.55 }}>{value}</div>
    </div>
  );
}
function Tag({ c, children }) {
  return (
    <span style={{
      fontSize: 9, padding: "2px 6px", borderRadius: 20,
      background: `${c}18`, color: c, border: `1px solid ${c}38`,
      fontFamily: "monospace", letterSpacing: "0.1em",
    }}>{children}</span>
  );
}
