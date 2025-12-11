import dbConnect from "@/utils/mongodb";
import LocationScheduleModel from "@/models/LocationSchedule";
import SectionScheduleModel, { ISchedule } from "@/models/SectionSchedule";

interface ScheduleItem {
  date: string;
  time: string;
  _id: string;
}

interface Schedule {
  [day: string]: ScheduleItem[];
}

interface LocationSchedule {
  location: string;
  schedule: Schedule;
}

type SectionScheduleLean = {
  _id: string;
  sectionId: string | { toString(): string };
  location: string;
  schedule: ISchedule;
  slotInterval?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Count default time slots with priority:
 * 1. Section Schedule
 * 2. Location Schedule
 */
export default async function countDefaultTimeSlots(
  location: string,
  day: string,
  sectionId?: string
): Promise<number> {
  await dbConnect();

  try {
    const defaultDate = "00:00:00";

    // Convert dynamic string key to a schedule key (safe for TypeScript strict mode)
    const dayKey = day as keyof ISchedule;

    // --------------------------------------------------------
    // Priority 1: Section Schedule
    // --------------------------------------------------------
    if (sectionId) {
      const sectionSchedule = await SectionScheduleModel.findOne(
        {
          sectionId,
          location,
          [`schedule.${day}`]: { $elemMatch: { date: defaultDate } }
        }
      ).lean<SectionScheduleLean | null>();

      if (sectionSchedule && sectionSchedule.schedule[dayKey]) {
        const daySchedule = sectionSchedule.schedule[dayKey];

        const defaultDateSlots = daySchedule.filter(
          (item: any) => item.date === defaultDate
        );

        if (defaultDateSlots.length > 0) {
          return defaultDateSlots.length;
        }
      }
    }

    // --------------------------------------------------------
    // Priority 2: Location Schedule
    // --------------------------------------------------------
    const scheduleDoc = await LocationScheduleModel.findOne(
      {
        location,
        [`schedule.${day}`]: { $elemMatch: { date: defaultDate } }
      },
      {
        [`schedule.${day}`]: 1
      }
    ).lean<LocationSchedule | null>();

    // For LocationSchedule the interface is dynamic, so use Runtime Schedule type
    const locDayKey = day as keyof Schedule;

    if (!scheduleDoc || !scheduleDoc.schedule[locDayKey]) {
      return 0;
    }

    const daySchedule = scheduleDoc.schedule[locDayKey];
    const defaultDateSlots = daySchedule.filter(
      (item) => item.date === defaultDate
    );

    return defaultDateSlots.length;
  } catch (error) {
    console.error("Error counting default date time slots:", error);
    throw error;
  }
}
