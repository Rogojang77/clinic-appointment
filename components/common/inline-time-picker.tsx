"use client";

interface InlineTimePickerProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
  "aria-label"?: string;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0")
);

const MINUTE_STEP_OPTIONS = Array.from({ length: 12 }, (_, i) =>
  (i * 5).toString().padStart(2, "0")
);

function parseTime(value: string): { hours: number; minutes: number } {
  const [h, m] = (value || "09:00").split(":");
  const hours = Math.min(23, Math.max(0, parseInt(h || "9", 10) || 0));
  const minutes = Math.min(59, Math.max(0, parseInt(m || "0", 10) || 0));
  return { hours, minutes };
}

export default function InlineTimePicker({
  value,
  onChange,
  className = "",
  "aria-label": ariaLabel = "Oră programare",
}: InlineTimePickerProps) {
  const { hours, minutes } = parseTime(value);

  const minuteOptions = (() => {
    const label = minutes.toString().padStart(2, "0");
    if (minutes % 5 !== 0 && !MINUTE_STEP_OPTIONS.includes(label)) {
      return [...MINUTE_STEP_OPTIONS, label].sort(
        (a, b) => parseInt(a, 10) - parseInt(b, 10)
      );
    }
    return MINUTE_STEP_OPTIONS;
  })();

  const emit = (h: number, m: number) => {
    onChange(
      `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
    );
  };

  const selectClassName =
    "h-8 rounded-md border border-input bg-white px-1.5 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      <select
        value={hours.toString().padStart(2, "0")}
        onChange={(e) => emit(parseInt(e.target.value, 10), minutes)}
        className={`${selectClassName} w-[3.25rem]`}
        aria-label="Oră"
      >
        {HOUR_OPTIONS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-sm font-bold text-gray-500">:</span>
      <select
        value={minutes.toString().padStart(2, "0")}
        onChange={(e) => emit(hours, parseInt(e.target.value, 10))}
        className={`${selectClassName} w-[3.25rem]`}
        aria-label="Minut"
      >
        {minuteOptions.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
