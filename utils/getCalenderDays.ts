  // Generate days for the calendar grid (Monday to Saturday only)
  export const getCalendarDays = (date: any) => {
    const startOfMonth = date.startOf("month");
    const endOfMonth = date.endOf("month");

    let currentDay = startOfMonth;
    while (currentDay.day() !== 1) {
      currentDay = currentDay.subtract(1, "day");
    }

    const currentMonthDays = [];

    for (
      let d = currentDay;
      d.isSameOrBefore(endOfMonth, "day");
      d = d.add(1, "day")
    ) {
      if (d.day() !== 0) {
        currentMonthDays.push(d);
      }
    }

    let lastDay = currentMonthDays[currentMonthDays.length - 1];
    while (lastDay.day() !== 6) {
      lastDay = lastDay.add(1, "day");
      if (lastDay.day() !== 0) {
        currentMonthDays.push(lastDay);
      }
    }

    return currentMonthDays;
  };