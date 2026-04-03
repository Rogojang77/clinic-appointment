"use client";

import { useMemo } from "react";
import {
  getWeeklyScheduleGridTimes,
  weeklyScheduleGridTimeSet,
} from "@/utils/weekScheduleGrid";

export interface WeeklySlot {
  time: string;
  date: string;
}

interface WeeklySlotGridProps {
  /** Sloturi pentru o singură zi (pot include și ore în afara grilei sau date specifice). */
  daySlots: WeeklySlot[];
  onChange: (slots: WeeklySlot[]) => void;
  dayLabel?: string;
}

const GRID_TIMES = getWeeklyScheduleGridTimes();
const GRID_SET = weeklyScheduleGridTimeSet();

function sortSlots(slots: WeeklySlot[]): WeeklySlot[] {
  return [...slots].sort((a, b) => {
    const t = a.time.localeCompare(b.time);
    if (t !== 0) return t;
    return a.date.localeCompare(b.date);
  });
}

function partition(daySlots: WeeklySlot[]) {
  const onGridWeekly: WeeklySlot[] = [];
  const other: WeeklySlot[] = [];
  for (const s of daySlots) {
    if (s.date === "00:00:00" && GRID_SET.has(s.time)) {
      onGridWeekly.push(s);
    } else {
      other.push(s);
    }
  }
  return { onGridWeekly, other };
}

export default function WeeklySlotGrid({ daySlots, onChange, dayLabel }: WeeklySlotGridProps) {
  const selectedWeekly = useMemo(() => {
    const set = new Set<string>();
    for (const s of daySlots) {
      if (s.date === "00:00:00" && GRID_SET.has(s.time)) {
        set.add(s.time);
      }
    }
    return set;
  }, [daySlots]);

  const { other: offGridSlots } = partition(daySlots);

  const toggle = (time: string) => {
    const next = new Set(selectedWeekly);
    if (next.has(time)) {
      next.delete(time);
    } else {
      next.add(time);
    }
    const weekly: WeeklySlot[] = [...next].map((t) => ({ time: t, date: "00:00:00" }));
    onChange(sortSlots([...weekly, ...offGridSlots]));
  };

  const selectAllGrid = () => {
    const weekly: WeeklySlot[] = GRID_TIMES.map((t) => ({ time: t, date: "00:00:00" }));
    onChange(sortSlots([...weekly, ...offGridSlots]));
  };

  const clearGridWeekly = () => {
    onChange(sortSlots([...offGridSlots]));
  };

  const removeOffGrid = (index: number) => {
    const next = [...offGridSlots];
    next.splice(index, 1);
    const weekly: WeeklySlot[] = [...selectedWeekly].map((t) => ({ time: t, date: "00:00:00" }));
    onChange(sortSlots([...weekly, ...next]));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          07:00 – 22:00, la 15 minute
          {dayLabel ? ` — ${dayLabel}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllGrid}
            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
          >
            Bifează toate
          </button>
          <button
            type="button"
            onClick={clearGridWeekly}
            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
          >
            Golește grila
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5 max-h-[min(52vh,28rem)] overflow-y-auto p-1 border border-gray-200 rounded-lg bg-gray-50/80">
        {GRID_TIMES.map((time) => {
          const on = selectedWeekly.has(time);
          return (
            <button
              key={time}
              type="button"
              onClick={() => toggle(time)}
              className={`min-h-[2rem] rounded text-xs font-medium transition-colors ${
                on
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              {time}
            </button>
          );
        })}
      </div>

      {offGridSlots.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3 text-sm">
          <p className="font-medium text-amber-900 mb-2">
            Sloturi în afara grilei (import sau vechi) — păstrați sau ștergeți:
          </p>
          <div className="flex flex-wrap gap-2">
            {offGridSlots.map((slot, i) => (
              <span
                key={`${slot.time}-${slot.date}-${i}`}
                className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 border border-amber-200 text-xs"
              >
                {slot.time}
                {slot.date !== "00:00:00" && (
                  <span className="text-amber-700">({slot.date})</span>
                )}
                <button
                  type="button"
                  onClick={() => removeOffGrid(i)}
                  className="text-red-600 hover:text-red-800 ml-0.5"
                  aria-label="Elimină"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
