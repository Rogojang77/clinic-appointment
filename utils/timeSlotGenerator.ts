import dbConnect from "@/utils/mongodb";
import LocationScheduleModel from "@/models/LocationSchedule";
import AppointmentModel from "@/models/Appointment";
import mongoose from "mongoose";
import type { ISchedule, ILocationSchedule } from "@/models/LocationSchedule";

export interface TimeSlot {
  time: string;
  date: string;
  isAvailable: boolean;
  isDefault?: boolean;
  source?: "location" | "custom";
}

type LeanLocationSchedule = Omit<ILocationSchedule, keyof mongoose.Document> & {
  _id: mongoose.Types.ObjectId;
  __v: number;
};

/**
 * Generate time slots from a start and end time with a given interval
 */
export function generateTimeSlotsFromRange(
  startTime: string,
  endTime: string,
  intervalMinutes: number = 15
): string[] {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const startTotalMinutes = startHour * 60 + startMin;
  const endTotalMinutes = endHour * 60 + endMin;

  for (let minutes = startTotalMinutes; minutes <= endTotalMinutes; minutes += intervalMinutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    slots.push(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`);
  }

  return slots;
}

/**
 * Get location schedule for a given location and day
 */
async function getLocationSchedule(
  location: string,
  day: string,
  date?: string
): Promise<TimeSlot[]> {
  await dbConnect();

  const locationSchedule = await LocationScheduleModel.findOne({
    location,
  }).lean() as LeanLocationSchedule | null;

  if (!locationSchedule || !locationSchedule.schedule || !locationSchedule.schedule[day as keyof ISchedule]) {
    return [];
  }

  const defaultDate = "00:00:00";
  const dateConditions = date ? [defaultDate, date] : [defaultDate];

  const daySchedule = locationSchedule.schedule[day as keyof ISchedule];
  const filteredSlots = daySchedule.filter((slot) =>
    dateConditions.includes(slot.date)
  );

  return filteredSlots.map((slot) => ({
    time: slot.time,
    date: slot.date,
    isAvailable: true,
    isDefault: slot.date === defaultDate,
    source: "location" as const,
  }));
}

/**
 * Booked times for this section (or testType) + location + calendar date.
 * sectionId keeps sections from blocking each other's slots at the same hour.
 */
async function getBookedAppointments(
  sectionId: string | null | undefined,
  location: string,
  date: string,
  times: string[],
  testType?: string | null | undefined
): Promise<Set<string>> {
  await dbConnect();

  const filter: Record<string, unknown> = {
    location,
    time: { $in: times },
  };

  const [year, month, day] = date.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

  filter.date = {
    $gte: startOfDay,
    $lte: endOfDay,
  };

  if (sectionId) {
    filter.sectionId = mongoose.Types.ObjectId.isValid(sectionId)
      ? new mongoose.Types.ObjectId(sectionId)
      : sectionId;
  } else if (testType) {
    filter.testType = testType;
  }

  const appointments = await AppointmentModel.find(filter).lean();
  return new Set(appointments.map((apt) => apt.time));
}

/**
 * Available time slots from the location schedule in MongoDB (SuperAdmin).
 * sectionId only affects which existing appointments block a time, not which hours are offered.
 */
export async function getAvailableTimeSlots(
  sectionId: string | null | undefined,
  location: string,
  day: string,
  date?: string,
  testType?: string | null | undefined
): Promise<TimeSlot[]> {
  await dbConnect();

  let timeSlots = await getLocationSchedule(location, day, date);
  if (timeSlots.length === 0) {
    return [];
  }

  if (date) {
    const bookedTimes = await getBookedAppointments(
      sectionId || null,
      location,
      date,
      timeSlots.map((slot) => slot.time),
      testType || null
    );

    timeSlots = timeSlots.map((slot) => ({
      ...slot,
      isAvailable: !bookedTimes.has(slot.time),
    }));
  } else {
    timeSlots = timeSlots.map((slot) => ({
      ...slot,
      isAvailable: true,
    }));
  }

  const timeSlotMap = new Map<string, TimeSlot>();
  for (const slot of timeSlots) {
    const existingSlot = timeSlotMap.get(slot.time);
    if (!existingSlot) {
      timeSlotMap.set(slot.time, slot);
    } else if (slot.date !== "00:00:00" && existingSlot.date === "00:00:00") {
      timeSlotMap.set(slot.time, slot);
    }
  }

  timeSlots = Array.from(timeSlotMap.values());
  timeSlots.sort((a, b) => a.time.localeCompare(b.time));

  return timeSlots;
}

/** True if the location has at least one slot configured for this weekday in DB. */
export async function hasSchedule(
  _sectionId: string | null | undefined,
  location: string,
  day: string
): Promise<boolean> {
  await dbConnect();

  const locationSchedule = await LocationScheduleModel.findOne({
    location,
    [`schedule.${day}`]: { $exists: true, $ne: [] },
  }).lean() as LeanLocationSchedule | null;

  return !!(
    locationSchedule &&
    locationSchedule.schedule &&
    locationSchedule.schedule[day as keyof ISchedule]?.length > 0
  );
}
