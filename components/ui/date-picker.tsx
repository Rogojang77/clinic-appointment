"use client";

import { useRef, useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import dayjs from "dayjs";
import "react-day-picker/style.css";

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  "aria-label"?: string;
}

export function DatePicker({ value, onChange, id, placeholder = "Alege data", "aria-label": ariaLabel }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => (value ? dayjs(value).toDate() : new Date()));
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value && dayjs(value).isValid() ? dayjs(value).toDate() : undefined;

  useEffect(() => {
    if (value && dayjs(value).isValid()) {
      setMonth(dayjs(value).toDate());
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const tid = window.setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      window.clearTimeout(tid);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(dayjs(date).format("YYYY-MM-DD"));
      setOpen(false);
    }
  };

  const displayValue = value && dayjs(value).isValid() ? dayjs(value).format("DD.MM.YYYY") : "";

  return (
    <div ref={containerRef} className="relative inline-block">
      <input
        id={id}
        type="text"
        readOnly
        value={displayValue}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onClick={() => !open && setOpen(true)}
        onFocus={() => !open && setOpen(true)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[140px] bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            month={month}
            onMonthChange={setMonth}
            locale={undefined}
          />
        </div>
      )}
    </div>
  );
}
