/**
 * Rânduri pentru tabel: programări + linii roșii „Liber” doar la orele din
 * programul locației (sloturi stocate în DB, prin /api/schedule).
 */

export type DashboardAppointmentBase = {
  _id: string;
  time: string;
};

export type DashboardTableRow<T extends DashboardAppointmentBase> =
  | { type: "appointment"; appointment: T }
  | { type: "free"; slotTime: string };

/** Minute de la începutul zilei; returnează null dacă string-ul e invalid. */
function timeStringToMinutes(time: string): number | null {
  if (!time) return null;
  const t = time.trim();
  const m24sec = t.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (m24sec) {
    const hour = Number(m24sec[1]);
    const minute = Number(m24sec[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return hour * 60 + minute;
    }
    return null;
  }
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hour = Number(m24[1]);
    const minute = Number(m24[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return hour * 60 + minute;
    }
    return null;
  }
  return null;
}

/** Ora canonică HH:MM (pentru potrivire cu sloturile din program). */
export function normalizeTimeToLabel(time: string): string | null {
  const m = timeStringToMinutes(time);
  if (m == null) return null;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

/**
 * Deduplică orile din răspunsul API (program) și le sortează.
 */
export function uniqueSortedSlotLabels(slotTimes: string[]): string[] {
  const byMin = new Map<number, string>();
  for (const raw of slotTimes) {
    if (!raw) continue;
    const m = timeStringToMinutes(raw);
    const label = normalizeTimeToLabel(raw);
    if (m == null || label == null) continue;
    if (!byMin.has(m)) {
      byMin.set(m, label);
    }
  }
  return Array.from(byMin.keys())
    .sort((a, b) => a - b)
    .map((k) => byMin.get(k)!);
}

function compareAppointmentsByTime(
  a: DashboardAppointmentBase,
  b: DashboardAppointmentBase
): number {
  const ma = timeStringToMinutes(a.time);
  const mb = timeStringToMinutes(b.time);
  if (ma != null && mb != null) return ma - mb;
  if (ma == null && mb == null) return 0;
  if (ma == null) return 1;
  return -1;
}

export type BuildFreeSlotOptions = {
  /** Ora fiecărui slot din program (ca în baza de date / API). Fără duplicate după normalizare. */
  allowedSlotTimes: string[];
};

type MergedItem<T extends DashboardAppointmentBase> =
  | { kind: "slot"; time: string }
  | { kind: "orphan"; appointment: T };

/**
 * Rândurile roșii „Liber” apar doar pentru `allowedSlotTimes` (program).
 * Programările la oră neconformă orarului (ex. oră personalizată) rămân afișate, în ordine, între sloturi.
 */
export function buildTableRowsWithFreeSlots<T extends DashboardAppointmentBase>(
  appointments: T[],
  options: BuildFreeSlotOptions
): DashboardTableRow<T>[] {
  const allowed = uniqueSortedSlotLabels(options.allowedSlotTimes);
  if (allowed.length === 0) {
    return [...appointments]
      .sort(compareAppointmentsByTime)
      .map((a) => ({ type: "appointment" as const, appointment: a }));
  }

  const byLabel = new Map<string, T[]>();
  for (const t of allowed) {
    byLabel.set(t, []);
  }

  const unparseable: T[] = [];
  const unmatched: T[] = [];

  for (const apt of appointments) {
    const label = normalizeTimeToLabel(apt.time);
    if (label == null) {
      unparseable.push(apt);
      continue;
    }
    if (byLabel.has(label)) {
      byLabel.get(label)!.push(apt);
    } else {
      unmatched.push(apt);
    }
  }

  for (const list of byLabel.values()) {
    list.sort(compareAppointmentsByTime);
  }
  unmatched.sort(compareAppointmentsByTime);
  unparseable.sort(compareAppointmentsByTime);

  const merged: MergedItem<T>[] = [
    ...allowed.map((t) => ({ kind: "slot" as const, time: t })),
    ...unmatched.map((a) => ({ kind: "orphan" as const, appointment: a })),
  ];
  merged.sort((a, b) => {
    const ma =
      a.kind === "slot"
        ? timeStringToMinutes(a.time) ?? 0
        : timeStringToMinutes(a.appointment.time) ?? 99999;
    const mb =
      b.kind === "slot"
        ? timeStringToMinutes(b.time) ?? 0
        : timeStringToMinutes(b.appointment.time) ?? 99999;
    return ma - mb;
  });

  const rows: DashboardTableRow<T>[] = [];
  for (const it of merged) {
    if (it.kind === "orphan") {
      rows.push({ type: "appointment", appointment: it.appointment });
      continue;
    }
    const list = byLabel.get(it.time) ?? [];
    if (list.length > 0) {
      for (const apt of list) {
        rows.push({ type: "appointment", appointment: apt });
      }
    } else {
      rows.push({ type: "free", slotTime: it.time });
    }
  }
  for (const apt of unparseable) {
    rows.push({ type: "appointment", appointment: apt });
  }
  return rows;
}
