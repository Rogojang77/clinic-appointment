import dbConnect from "@/utils/mongodb";
import LocationScheduleModel from "@/models/LocationSchedule";
import type { ISchedule } from "@/models/LocationSchedule";

interface ScheduleItem {
  date: string;
  time: string;
  _id: string;
}

interface Schedule {
  [day: string]: ScheduleItem[];
}

interface LocationScheduleLean {
  location: string;
  schedule: Schedule;
}

/**
 * Count default (weekly) time slots for a location/day from LocationSchedule in MongoDB.
 */
export default async function countDefaultTimeSlots(
  location: string,
  day: string,
  _sectionId?: string
): Promise<number> {
  await dbConnect();

  try {
    const defaultDate = "00:00:00";
    const dayKey = day as keyof ISchedule;

    const scheduleDoc = await LocationScheduleModel.findOne(
      {
        location,
        [`schedule.${day}`]: { $elemMatch: { date: defaultDate } },
      },
      {
        [`schedule.${day}`]: 1,
      }
    ).lean<LocationScheduleLean | null>();

    const locDayKey = day as keyof Schedule;

    if (!scheduleDoc || !scheduleDoc.schedule[locDayKey]) {
      return 0;
    }

    const daySchedule = scheduleDoc.schedule[locDayKey];
    const defaultDateSlots = daySchedule.filter((item) => item.date === defaultDate);

    return defaultDateSlots.length;
  } catch (error) {
    console.error("Error counting default date time slots:", error);
    throw error;
  }
}
