/** Ore selectabile în SuperAdmin: 07:00–22:00, la 15 minute (doar program săptămânal). */

export const WEEKLY_SCHEDULE_GRID_STEP_MIN = 15;
export const WEEKLY_SCHEDULE_FIRST_MIN = 7 * 60; // 07:00
export const WEEKLY_SCHEDULE_LAST_MIN = 22 * 60; // 22:00

export function getWeeklyScheduleGridTimes(): string[] {
  const out: string[] = [];
  for (
    let m = WEEKLY_SCHEDULE_FIRST_MIN;
    m <= WEEKLY_SCHEDULE_LAST_MIN;
    m += WEEKLY_SCHEDULE_GRID_STEP_MIN
  ) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    out.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
  }
  return out;
}

export function weeklyScheduleGridTimeSet(): Set<string> {
  return new Set(getWeeklyScheduleGridTimes());
}

export const WEEK_DAYS_RO = [
  "Luni",
  "Marți",
  "Miercuri",
  "Joi",
  "Vineri",
  "Sâmbătă",
  "Duminica",
] as const;

export type WeekdayRo = (typeof WEEK_DAYS_RO)[number];

export type ScheduleDaySlot = { time: string; date: string };

/**
 * Programele salvează fiecare slot ca `{ time: "HH:mm", date: "00:00:00" }` (săptămânal)
 * sau `date: "YYYY-MM-DD"` pentru excepții pe o zi anume. Cheia unică e (time + date).
 */
export function dedupeSchedule(
  schedule: Record<string, unknown> | undefined | null
): Record<WeekdayRo, ScheduleDaySlot[]> {
  const out = {} as Record<WeekdayRo, ScheduleDaySlot[]>;
  for (const d of WEEK_DAYS_RO) {
    out[d] = [];
    const arr =
      schedule && typeof schedule === "object"
        ? (schedule as Record<string, unknown>)[d]
        : undefined;
    if (!Array.isArray(arr)) continue;
    const map = new Map<string, ScheduleDaySlot>();
    for (const raw of arr) {
      if (!raw || typeof raw !== "object") continue;
      const s = raw as { time?: string; date?: string };
      if (!s.time || typeof s.time !== "string") continue;
      const time = s.time.trim();
      const date = typeof s.date === "string" && s.date ? s.date : "00:00:00";
      const key = `${time}\0${date}`;
      if (!map.has(key)) map.set(key, { time, date });
    }
    out[d] = [...map.values()].sort(
      (a, b) => a.time.localeCompare(b.time) || a.date.localeCompare(b.date)
    );
  }
  return out;
}

/** Numără intrările brute din array-uri (poate include duplicate). */
export function countRawScheduleSlots(schedule: unknown): number {
  if (!schedule || typeof schedule !== "object") return 0;
  const o = schedule as Record<string, unknown>;
  let n = 0;
  for (const d of WEEK_DAYS_RO) {
    const v = o[d];
    if (Array.isArray(v)) n += v.length;
  }
  return n;
}

/** Numără sloturi unice (time + date) — potrivit pentru afișare în admin. */
export function countScheduleSlots(schedule: unknown): number {
  const clean = dedupeSchedule(
    schedule && typeof schedule === "object" ? (schedule as Record<string, unknown>) : undefined
  );
  return WEEK_DAYS_RO.reduce((acc, d) => acc + clean[d].length, 0);
}
