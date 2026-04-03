import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DEFAULT_TIMEZONE = "Europe/Bucharest";

/** Programări cu ora locală strict înainte de această oră → reminder seara din ziua anterioară. */
export const REMINDER_MORNING_APPOINTMENT_MAX_HOUR = 12;

/** Interval seara anterioară (trimite dacă acum e în această zi, între orele date). */
export const REMINDER_PREV_EVENING_HOUR_START = 18;
export const REMINDER_PREV_EVENING_HOUR_END = 23;

/** Interval dimineața în ziua programării (doar pentru sloturi „după-amiază / seară”). */
export const REMINDER_SAME_DAY_MORNING_HOUR_START = 8;
export const REMINDER_SAME_DAY_MORNING_HOUR_END = 13;

export function nowInDefaultTimezone(): Dayjs {
  return dayjs().tz(DEFAULT_TIMEZONE);
}

export type WhatsAppReminderDispatchKind = "previous_evening" | "same_morning";

/** Intervalul în care cron-ul poate trimite reminderul (timezone clinica). */
export function getWhatsAppReminderDispatchWindow(apptDt: Dayjs): {
  start: Dayjs;
  end: Dayjs;
  kind: WhatsAppReminderDispatchKind;
} | null {
  if (!apptDt.isValid()) return null;
  const morningSlot = apptDt.hour() < REMINDER_MORNING_APPOINTMENT_MAX_HOUR;
  if (morningSlot) {
    const reminderDay = apptDt.startOf("day").subtract(1, "day");
    return {
      start: reminderDay.hour(REMINDER_PREV_EVENING_HOUR_START).minute(0).second(0),
      end: reminderDay.hour(REMINDER_PREV_EVENING_HOUR_END).minute(0).second(0),
      kind: "previous_evening",
    };
  }
  const apptDay = apptDt.startOf("day");
  return {
    start: apptDay.hour(REMINDER_SAME_DAY_MORNING_HOUR_START).minute(0).second(0),
    end: apptDay.hour(REMINDER_SAME_DAY_MORNING_HOUR_END).minute(0).second(0),
    kind: "same_morning",
  };
}

/**
 * Există momente în fereastra de dispatch [w.start, w.end) care cad în intervalul
 * [nowTz, nowTz + hours] (capăt dreaptă inclus — „următoarele N ore” în sens practic).
 * Programarea trebuie să fie după începutul părții utile din intersecție.
 */
export function whatsAppReminderDispatchOverlapsUpcomingHours(
  apptDt: Dayjs,
  nowTz: Dayjs,
  hours: number
): boolean {
  const w = getWhatsAppReminderDispatchWindow(apptDt);
  if (!w) return false;
  if (!apptDt.isAfter(nowTz)) return false;
  const horizonEnd = nowTz.add(hours, "hour");
  const lo = nowTz.isAfter(w.start) ? nowTz : w.start;
  if (!lo.isBefore(w.end)) return false;
  if (lo.isAfter(horizonEnd)) return false;
  return apptDt.isAfter(lo);
}

/** Primul moment din overlap (estimare „când poate pleca” primul mesaj). */
export function getWhatsAppReminderEarliestSendInHorizon(
  apptDt: Dayjs,
  nowTz: Dayjs,
  hours: number
): Dayjs | null {
  const w = getWhatsAppReminderDispatchWindow(apptDt);
  if (!w || !apptDt.isAfter(nowTz)) return null;
  const horizonEnd = nowTz.add(hours, "hour");
  const lo = nowTz.isAfter(w.start) ? nowTz : w.start;
  if (!lo.isBefore(w.end) || lo.isAfter(horizonEnd) || !apptDt.isAfter(lo)) return null;
  return lo;
}

/**
 * Decide dacă trebuie trimis reminderul WhatsApp la momentul `nowTz` (ambele în timezone-ul clinicii).
 * - Slot dimineață (ora < REMINDER_MORNING_APPOINTMENT_MAX_HOUR): fereastră ziua anterioară, seara.
 * - Slot mai târziu: aceeași zi ca programarea, dimineața.
 */
export function shouldDispatchWhatsAppReminder(apptDt: Dayjs, nowTz: Dayjs): boolean {
  if (!apptDt.isValid() || !nowTz.isValid()) return false;
  if (!apptDt.isAfter(nowTz)) return false;
  const w = getWhatsAppReminderDispatchWindow(apptDt);
  if (!w) return false;
  if (!nowTz.isSame(w.start, "day")) return false;
  return (nowTz.isAfter(w.start) || nowTz.isSame(w.start)) && nowTz.isBefore(w.end);
}

/** Persistă în Mongo instanțe UTC pentru fereastra [start, end). */
export function computeWhatsAppReminderWindowBounds(params: {
  date: Date | string;
  time: string;
  tz?: string;
}): { start: Date; end: Date } | null {
  const apptDt = appointmentToZonedDateTime({
    date: params.date,
    time: params.time,
    tz: params.tz ?? DEFAULT_TIMEZONE,
  });
  if (!apptDt) return null;
  const w = getWhatsAppReminderDispatchWindow(apptDt);
  if (!w) return null;
  return { start: w.start.toDate(), end: w.end.toDate() };
}

/** Cron: acum e în fereastra salvată [start, end). */
export function isNowInsideStoredReminderWindow(
  windowStart: Date,
  windowEnd: Date,
  nowTz: Dayjs
): boolean {
  const ws = dayjs(windowStart).tz(DEFAULT_TIMEZONE);
  const we = dayjs(windowEnd).tz(DEFAULT_TIMEZONE);
  if (!ws.isValid() || !we.isValid()) return false;
  return (nowTz.isAfter(ws) || nowTz.isSame(ws)) && nowTz.isBefore(we);
}

/** Previzualizare: fereastră fixă (din DB) vs orizont. */
export function storedReminderWindowOverlapsUpcomingHours(
  windowStart: Date,
  windowEnd: Date,
  apptDt: Dayjs,
  nowTz: Dayjs,
  hours: number
): boolean {
  const ws = dayjs(windowStart).tz(DEFAULT_TIMEZONE);
  const we = dayjs(windowEnd).tz(DEFAULT_TIMEZONE);
  if (!ws.isValid() || !we.isValid()) return false;
  if (!apptDt.isAfter(nowTz)) return false;
  const horizonEnd = nowTz.add(hours, "hour");
  const lo = nowTz.isAfter(ws) ? nowTz : ws;
  if (!lo.isBefore(we)) return false;
  if (lo.isAfter(horizonEnd)) return false;
  return apptDt.isAfter(lo);
}

export function getEarliestSendInHorizonFromStoredWindow(
  windowStart: Date,
  windowEnd: Date,
  apptDt: Dayjs,
  nowTz: Dayjs,
  hours: number
): Dayjs | null {
  const ws = dayjs(windowStart).tz(DEFAULT_TIMEZONE);
  const we = dayjs(windowEnd).tz(DEFAULT_TIMEZONE);
  if (!ws.isValid() || !we.isValid() || !apptDt.isAfter(nowTz)) return null;
  const horizonEnd = nowTz.add(hours, "hour");
  const lo = nowTz.isAfter(ws) ? nowTz : ws;
  if (!lo.isBefore(we) || lo.isAfter(horizonEnd) || !apptDt.isAfter(lo)) return null;
  return lo;
}

function parseTimeToHM(time: string): { hour: number; minute: number } | null {
  if (!time) return null;
  const t = time.trim().toLowerCase();

  // "HH:mm:ss" or "H:mm:ss"
  const m24sec = t.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (m24sec) {
    const hour = Number(m24sec[1]);
    const minute = Number(m24sec[2]);
    const sec = Number(m24sec[3]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && sec >= 0 && sec <= 59) {
      return { hour, minute };
    }
    return null;
  }

  // Common formats: "HH:mm", "H:mm"
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hour = Number(m24[1]);
    const minute = Number(m24[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return { hour, minute };
    return null;
  }

  // "3pm", "3 pm", "3:15pm"
  const mampm = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (mampm) {
    let hour = Number(mampm[1]);
    const minute = Number(mampm[2] ?? "0");
    const ampm = mampm[3];
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
    if (ampm === "pm" && hour !== 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    return { hour, minute };
  }

  return null;
}

export function appointmentToZonedDateTime(params: {
  date: Date | string; // stored as Date (start-of-day) or "YYYY-MM-DD"
  time: string;
  tz?: string;
}): Dayjs | null {
  const tz = params.tz ?? DEFAULT_TIMEZONE;
  const hm = parseTimeToHM(params.time);
  if (!hm) return null;

  let d: Dayjs;
  if (typeof params.date === "string") {
    // Expected: "YYYY-MM-DD"
    d = dayjs.tz(params.date, "YYYY-MM-DD", tz);
  } else {
    // Ziua calendaristică din UTC (API salvează de obicei startOf-day UTC pentru YYYY-MM-DD)
    const ymd = dayjs.utc(params.date).format("YYYY-MM-DD");
    d = dayjs.tz(ymd, "YYYY-MM-DD", tz);
  }

  if (!d.isValid()) return null;
  return d.hour(hm.hour).minute(hm.minute).second(0).millisecond(0);
}

