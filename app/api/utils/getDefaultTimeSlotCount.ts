import dbConnect from "@/utils/mongodb";
import LocationScheduleModel from "@/models/LocationSchedule";
import SectionScheduleModel, { ISectionSchedule, ISchedule } from "@/models/SectionSchedule";

interface Schedule {
  [day: string]: { date: string; time: string; _id: string }[];
}

interface LocationSchedule {
  location: string;
  schedule: Schedule;
}

// Type for lean SectionSchedule (plain object from .lean())
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
 * Count default time slots with priority: Section Schedule > Location Schedule
 */
export default async function countDefaultTimeSlots(
  location: string,
  day: string,
  sectionId?: string
): Promise<number> {
  await dbConnect();

  try {
    // Default date to count
    const defaultDate = "00:00:00";

    // Priority 1: Check section schedule if sectionId is provided
    if (sectionId) {
      const sectionSchedule = await SectionScheduleModel.findOne({
        sectionId,
        location,
        [`schedule.${day}`]: {
          $elemMatch: {
            date: defaultDate,
          },
        },
      }).lean<SectionScheduleLean | null>();

      if (sectionSchedule && sectionSchedule.schedule[day]) {
        const daySchedule = sectionSchedule.schedule[day];
        const defaultDateSlots = daySchedule.filter(
          (item: any) => item.date === defaultDate
        );
        if (defaultDateSlots.length > 0) {
          return defaultDateSlots.length;
        }
      }
    }

    // Priority 2: Fall back to location schedule
    const filter = {
      location,
      [`schedule.${day}`]: {
        $elemMatch: {
          date: defaultDate,
        },
      },
    };

    const scheduleDocument = await LocationScheduleModel.findOne(filter, {
      [`schedule.${day}`]: 1,
    }).lean<LocationSchedule | null>();

    if (!scheduleDocument || !scheduleDocument.schedule[day]) {
      return 0; // Return 0 if no schedules are found
    }

    // Filter schedules by the default date
    const daySchedule = scheduleDocument.schedule[day];
    const defaultDateSlots = daySchedule.filter(
      (item) => item.date === defaultDate
    );

    // Return the count of default date time slots
    return defaultDateSlots.length;
  } catch (error) {
    console.error("Error counting default date time slots:", error);
    throw error; // Re-throw the error to handle it in the calling function
  }
}