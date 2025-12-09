import dbConnect from "@/utils/mongodb";
import LocationScheduleModel from "@/models/LocationSchedule";

interface Schedule {
  [day: string]: { date: string; time: string; _id: string }[];
}

interface LocationSchedule {
  location: string;
  schedule: Schedule;
}

export default async function countDefaultTimeSlots(location: string, day: string): Promise<number> {
  await dbConnect();

  try {
    // Default date to count
    const defaultDate = "00:00:00";

    const filter = {
      location,
      [`schedule.${day}`]: {
        $elemMatch: {
          date: defaultDate,
        },
      },
    };

    // Query the database for matching schedules
    const scheduleDocument = await LocationScheduleModel.findOne(filter, {
      [`schedule.${day}`]: 1, // Only include the specific day's data
    }).lean<LocationSchedule | null>();

    if (!scheduleDocument || !scheduleDocument.schedule[day]) {
      return 0; // Return 0 if no schedules are found
    }

    // Filter schedules by the default date
    const daySchedule = scheduleDocument.schedule[day];
    const defaultDateSlots = daySchedule.filter((item) => item.date === defaultDate);

    // Return the count of default date time slots
    return defaultDateSlots.length;
  } catch (error) {
    console.error("Error counting default date time slots:", error);
    throw error; // Re-throw the error to handle it in the calling function
  }
}