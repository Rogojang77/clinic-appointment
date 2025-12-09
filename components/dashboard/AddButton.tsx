import React from "react";
import dayjs, { Dayjs } from "dayjs";
import { Plus } from "lucide-react";

interface DateButtonProps {
  selectedDate: Dayjs | null;
  onClick: () => void;
}

const AddAppointmentButton: React.FC<DateButtonProps> = ({ selectedDate, onClick }) => {
  // Custom logic to check if selectedDate is today or in the future
  const isDateValid =
    selectedDate &&
    (dayjs(selectedDate).isSame(dayjs(), "day") || dayjs(selectedDate).isAfter(dayjs(), "day"));

  return (
    <div
      className={`relative ${
        isDateValid
          ? "bg-blue-500 hover:bg-blue-400 cursor-pointer"
          : "bg-gray-300 cursor-not-allowed"
      } rounded-sm p-1 px-4 flex items-center space-x-2`}
      onClick={() => {
        if (isDateValid) {
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

      {/* Tooltip */}
      {!isDateValid && (
        <div className="absolute top-[-40px] left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-sm rounded-md py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          Please select a valid date
        </div>
      )}
    </div>
  );
};

export default AddAppointmentButton;
