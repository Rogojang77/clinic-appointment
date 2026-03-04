import React from "react";
import dayjs, { Dayjs } from "dayjs";
import { Plus } from "lucide-react";

const PAST_DATE_NOTE = "Programările se pot adăuga doar pentru azi sau viitor.";

interface DateButtonProps {
  selectedDate: Dayjs | null;
  onClick: () => void;
}

const AddAppointmentButton: React.FC<DateButtonProps> = ({ selectedDate, onClick }) => {
  const isDateValid =
    selectedDate &&
    (dayjs(selectedDate).isSame(dayjs(), "day") || dayjs(selectedDate).isAfter(dayjs(), "day"));

  const noteId = "add-appointment-past-date-note";

  return (
    <div className="group flex flex-col items-start gap-1">
      <div
        role={isDateValid ? "button" : undefined}
        tabIndex={isDateValid ? 0 : -1}
        aria-disabled={!isDateValid}
        aria-describedby={!isDateValid ? noteId : undefined}
        title={!isDateValid ? PAST_DATE_NOTE : undefined}
        className={`relative rounded-sm p-1 px-4 flex items-center space-x-2 ${
          isDateValid
            ? "bg-blue-500 hover:bg-blue-400 cursor-pointer"
            : "bg-gray-300 cursor-not-allowed"
        }`}
        onClick={() => {
          if (isDateValid) onClick();
        }}
        onKeyDown={(e) => {
          if (isDateValid && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <Plus
          size={20}
          className={isDateValid ? "text-white" : "text-gray-400"}
        />
        <p
          className={`font-medium text-[14px] ${
            isDateValid ? "text-white" : "text-gray-500"
          }`}
        >
          Adauga Rand
        </p>
        {!isDateValid && (
          <div className="absolute top-[-40px] left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-sm rounded-md py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 whitespace-nowrap pointer-events-none">
            Vă rugăm să selectați o dată validă
          </div>
        )}
      </div>
      {!isDateValid && (
        <p
          id={noteId}
          className="text-sm text-gray-600"
          role="status"
        >
          {PAST_DATE_NOTE}
        </p>
      )}
    </div>
  );
};

export default AddAppointmentButton;
