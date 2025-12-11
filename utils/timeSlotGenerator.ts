import dbConnect from "@/utils/mongodb";
import LocationScheduleModel from "@/models/LocationSchedule";
import SectionScheduleModel from "@/models/SectionSchedule";
import AppointmentModel from "@/models/Appointment";
import { locationTimeSlots } from "@/lib/timeSlots";
import mongoose from "mongoose";
import type { ISectionSchedule, ISchedule } from "@/models/SectionSchedule";
import type { ILocationSchedule } from "@/models/LocationSchedule";

export interface TimeSlot {
  time: string;
  date: string;
  isAvailable: boolean;
  isDefault?: boolean; // true if from default weekly schedule
  source?: "section" | "location" | "custom"; // Where this slot came from
}

// Type for lean result from Mongoose queries
type LeanSectionSchedule = Omit<ISectionSchedule, keyof mongoose.Document> & {
  _id: mongoose.Types.ObjectId;
  __v: number;
};

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
 * Convert time slot strings to TimeSlot objects
 */
function convertToTimeSlotObjects(
  timeStrings: string[],
  date: string,
  source: "section" | "location" | "custom"
): TimeSlot[] {
  return timeStrings
    .filter((time) => time && time.trim() !== "")
    .map((time) => ({
      time: time.trim(),
      date,
      isAvailable: true,
      isDefault: date === "00:00:00",
      source,
    }));
}

/**
 * Get section-specific schedule for a given section, location, and day
 */
async function getSectionSchedule(
  sectionId: string,
  location: string,
  day: string,
  date?: string
): Promise<TimeSlot[]> {
  await dbConnect();

  const sectionSchedule = await SectionScheduleModel.findOne({
    sectionId,
    location,
  }).lean() as LeanSectionSchedule | null;

  if (!sectionSchedule || !sectionSchedule.schedule || !sectionSchedule.schedule[day as keyof ISchedule]) {
    return [];
  }

  const defaultDate = "00:00:00";
  const dateConditions = date ? [defaultDate, date] : [defaultDate];

  const daySchedule = sectionSchedule.schedule[day as keyof ISchedule];
  const filteredSlots = daySchedule.filter((slot) =>
    dateConditions.includes(slot.date)
  );

  return filteredSlots.map((slot) => ({
    time: slot.time,
    date: slot.date,
    isAvailable: true,
    isDefault: slot.date === defaultDate,
    source: "section" as const,
  }));
}

/**
 * Get location default schedule for a given location and day
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
    // Fallback to static data
    const staticSlots = locationTimeSlots[location]?.[day] || [];
    return convertToTimeSlotObjects(staticSlots, date || "00:00:00", "location");
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
 * Get booked appointments for a specific section, location, date, and time
 */
async function getBookedAppointments(
  sectionId: string | null | undefined,
  location: string,
  date: string,
  times: string[]
): Promise<Set<string>> {
  await dbConnect();

  // Build query filter
  const filter: any = {
    location,
    time: { $in: times },
  };

  // Date comparison: normalize to start of day for accurate comparison
  // Parse date string (YYYY-MM-DD) and create date range for the entire day
  // Use local timezone to avoid UTC conversion issues
  const [year, month, day] = date.split('-').map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0); // Local timezone
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999); // Local timezone

  filter.date = {
    $gte: startOfDay,
    $lte: endOfDay,
  };

  // ALWAYS filter by sectionId when provided (section-specific booking)
  // This ensures each section only sees its own bookings, not other sections
  // No hardcoded section names - works dynamically for ALL sections (Ecografie, Chirurgie, etc.)
  if (sectionId) {
    // Ensure sectionId is properly formatted (handle both string and ObjectId)
    filter.sectionId = mongoose.Types.ObjectId.isValid(sectionId) 
      ? new mongoose.Types.ObjectId(sectionId)
      : sectionId;
  }
  // If no sectionId provided, query will not filter by section
  // But for proper section-specific booking, sectionId should always be provided

  const appointments = await AppointmentModel.find(filter).lean();

  // Return set of booked times for this specific section+location+date combination
  // This ensures Ecografie bookings don't block Chirurgie pediatrică, etc.
  return new Set(appointments.map((apt) => apt.time));
}

/**
 * Main function to get available time slots with priority:
 * Section Schedule > Location Schedule > Custom Schedule
 */
export async function getAvailableTimeSlots(
  sectionId: string | null | undefined,
  location: string,
  day: string,
  date?: string
): Promise<TimeSlot[]> {
  await dbConnect();

  let timeSlots: TimeSlot[] = [];
  let hasSchedule = false;

  // Priority 1: Try section-specific schedule
  if (sectionId) {
    const sectionSlots = await getSectionSchedule(sectionId, location, day, date);
    if (sectionSlots.length > 0) {
      timeSlots = sectionSlots;
      hasSchedule = true;
    }
  }

  // Priority 2: Fall back to location default schedule
  if (!hasSchedule) {
    const locationSlots = await getLocationSchedule(location, day, date);
    if (locationSlots.length > 0) {
      timeSlots = locationSlots;
      hasSchedule = true;
    }
  }

  // Priority 3: If still no schedule, return empty array (allows custom time creation)
  if (!hasSchedule) {
    return [];
  }

  // Mark booked slots as unavailable
  // Always check bookings when date is provided (required for accurate availability)
  if (date) {
    const bookedTimes = await getBookedAppointments(
      sectionId || null,
      location,
      date,
      timeSlots.map((slot) => slot.time)
    );

    timeSlots = timeSlots.map((slot) => ({
      ...slot,
      isAvailable: !bookedTimes.has(slot.time),
    }));
  } else {
    // If no date provided, mark all slots as available (for schedule preview)
    timeSlots = timeSlots.map((slot) => ({
      ...slot,
      isAvailable: true,
    }));
  }

  // Sort by time
  timeSlots.sort((a, b) => a.time.localeCompare(b.time));

  return timeSlots;
}

/**
 * Check if a schedule exists for the given parameters
 */
export async function hasSchedule(
  sectionId: string | null | undefined,
  location: string,
  day: string
): Promise<boolean> {
  await dbConnect();

  // Check section schedule
  if (sectionId) {
    const sectionSchedule = await SectionScheduleModel.findOne({
      sectionId,
      location,
      [`schedule.${day}`]: { $exists: true, $ne: [] },
    }).lean() as LeanSectionSchedule | null;

    if (sectionSchedule && sectionSchedule.schedule && sectionSchedule.schedule[day as keyof ISchedule]?.length > 0) {
      return true;
    }
  }

  // Check location schedule
  const locationSchedule = await LocationScheduleModel.findOne({
    location,
    [`schedule.${day}`]: { $exists: true, $ne: [] },
  }).lean() as LeanLocationSchedule | null;

  if (locationSchedule && locationSchedule.schedule && locationSchedule.schedule[day as keyof ISchedule]?.length > 0) {
    return true;
  }

  // Check static fallback
  const staticSlots = locationTimeSlots[location]?.[day] || [];
  return staticSlots.length > 0 && staticSlots[0] !== "";
}

