import { useState, useEffect } from "react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { getCalendarDays } from "@/utils/getCalenderDays";
import axios from "axios";

dayjs.extend(isSameOrBefore);

const CalendarGrid = ({
  selectedDate,
  setSelectedDate,
  location,
  setLocation,
  dayName,
  setDayName,
  locations = [],
}: {
  selectedDate: any;
  setSelectedDate: any;
  location: string;
  setLocation: any;
  dayName: string;
  setDayName: any;
  locations?: any[];
}) => {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [isLoading, setIsLoading] = useState(false);
  const [colorMap, setColorMap] = useState<{ [key: string]: string }>({});

  const startDate = currentDate.startOf("month").format("YYYY-MM-DD");
  const endDate = currentDate.endOf("month").format("YYYY-MM-DD");

  const calendarDays = getCalendarDays(currentDate);

  const handleMonthChange = (direction: number) => {
    setCurrentDate((prev) => prev.add(direction, "month"));
  };

  const formatDate = (date: any) => date.format("DD/MM/YY");

  const handleDateSelect = (date: any) => {
    setSelectedDate(date);
    setDayName(date.format("dddd"));
  };
  useEffect(() => {
    const fetchColors = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get("/api/colors", {
          params: { startDate, endDate, location },
          withCredentials: true,
        });

        const data = Array.isArray(response.data?.data)
          ? response.data.data
          : [];

        // Convert API response to a date-color map
        const colors = data.reduce((acc: any, item: any) => {
          const formattedDate = dayjs(item.date).format("YYYY-MM-DD"); // Ensure correct format
          acc[formattedDate] = item.color; // Store color with proper date key
          return acc;
        }, {});

        setColorMap(colors);
      } catch (error: any) {
        console.error(
          "Error fetching colors:",
          error?.response?.data || error.message
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchColors();
  }, [startDate, endDate, location]);

  return (
    <div className="flex flex-col lg:flex-row p-4 lg:space-x-10 w-full justify-between lg:px-10 px-5">
      <div className="flex flex-col space-y-4 lg:space-x-0 space-x-5 justify-start items-center">
        <div className="border rounded-md px-4 py-2 w-32">
          {locations.map((loc: any) => (
            <label key={loc._id} className="cursor-pointer flex">
              <input
                type="radio"
                name="location"
                value={loc.name}
                checked={location === loc.name}
                onChange={() => setLocation(loc.name)}
                className="mr-2 cursor-pointer"
              />
              <h3>{loc.name}</h3>
            </label>
          ))}
        </div>
      </div>

      <div className="flex w-full mt-5 lg:mt-0">
        <div className="mt-[85px] space-y-[10px] min-w-16">
          {["Săpt 1", "Săpt 2", "Săpt 3", "Săpt 4", "Săpt 5"].map(
            (week, index) => (
              <div
                key={index + week}
                className="font-bold lg:text-[15px] text-[12px]"
              >
                {week}
              </div>
            )
          )}
        </div>
        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => handleMonthChange(-1)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded lg:text-[15px] text-[12px]"
            >
              ← Previous
            </button>
            <div className="text-lg font-bold">
              {currentDate.format("MMMM YYYY")}
            </div>
            <button
              onClick={() => handleMonthChange(1)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded lg:text-[15px] text-[12px]"
            >
              Next →
            </button>
          </div>

          <div className="grid grid-cols-6 gap-2 text-center lg:text-[15px] text-[12px]">
            {["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"].map(
              (day, index) => (
                <div key={index} className="font-bold">
                  {day}
                </div>
              )
            )}

            {calendarDays.map((date: any, index: number) => {
              const formattedDate = date.format("YYYY-MM-DD"); // Ensure date format matches API
              const isBeforeToday = date.isBefore(dayjs(), "day");
              const isSelected =
                selectedDate && date.isSame(selectedDate, "day");

              // Default: Past dates are gray
              let bgColor = "bg-gray-300 text-gray-500";

              if (!isBeforeToday) {
                bgColor = "bg-blue-500 text-white"; // Future dates default to blue

                // Check if API has a color for this date
                if (colorMap[formattedDate]) {
                  bgColor = `bg-${colorMap[formattedDate]}-500 text-white`; // Use API color if exists
                }
              }

              // If selected, override with green
              if (isSelected) {
                bgColor = "bg-green-500 text-white";
              }

              return (
                <div
                  key={index}
                  onClick={() => handleDateSelect(date)}
                  className={`border rounded cursor-pointer ${bgColor} hover:bg-green-500 hover:text-white`}
                >
                  {formatDate(date)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
