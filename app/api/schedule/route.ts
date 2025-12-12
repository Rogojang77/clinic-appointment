import dbConnect from "@/utils/mongodb";
import { NextRequest, NextResponse } from "next/server";
import LocationScheduleModel from "@/models/LocationSchedule";
import { requireAuth } from "@/utils/authHelpers";
import { getAvailableTimeSlots } from "@/utils/timeSlotGenerator";

interface Schedule {
  [day: string]: { date: string; time: string; _id: string }[];
}

interface LocationSchedule {
  location: string;
  schedule: Schedule;
}

/**
 * GET /api/schedule
 * Get available time slots with priority: Section Schedule > Location Schedule > Custom
 * Query params: location, day, date, sectionId (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response if auth failed
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    const day = searchParams.get("day");
    const date = searchParams.get("date");
    const sectionId = searchParams.get("sectionId"); // New: section-specific support
    const testType = searchParams.get("testType"); // Fallback for older appointments without sectionId

    if (!location || !day) {
      return NextResponse.json(
        { message: "Location and day are required!" },
        { status: 400 }
      );
    }

    // Use the new priority-based time slot generator
    // Pass testType as fallback when sectionId is not available
    const timeSlots = await getAvailableTimeSlots(
      sectionId || null,
      location,
      day,
      date || undefined,
      testType || undefined
    );

    // Convert to the expected format (backward compatible)
    const formattedSlots = timeSlots.map((slot) => ({
      time: slot.time,
      date: slot.date,
      isAvailable: slot.isAvailable,
      isDefault: slot.isDefault,
      source: slot.source,
    }));

    return NextResponse.json(
      { success: true, data: formattedSlots },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response if auth failed
    }

    await dbConnect();

    const { location, day, timeSlot } = await request.json();

    if (!location || !day || !timeSlot) {
      return NextResponse.json(
        { message: "Location, day, and timeSlot are required!" },
        { status: 400 }
      );
    }

    const scheduleDocument = await LocationScheduleModel.findOne({ location });

    if (!scheduleDocument) {
      return NextResponse.json(
        { message: "Location not found!" },
        { status: 404 }
      );
    }

    if (!scheduleDocument.schedule[day]) {
      scheduleDocument.schedule[day] = [];
    }

    // Check for duplicate time slots
    const existingSlot = scheduleDocument.schedule[day].find(
      (slot:any) => slot.time === timeSlot.time && slot.date === timeSlot.date
    );

    if (existingSlot) {
      return NextResponse.json(
        { message: "Time slot already exists!" },
        { status: 400 }
      );
    }

    // Add new time slot
    scheduleDocument.schedule[day].push(timeSlot);
    await scheduleDocument.save();

    return NextResponse.json(
      { message: "Time slot added successfully!", data: scheduleDocument },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding time slot:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

// PATCH API: Update an existing schedule
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response if auth failed
    }

    await dbConnect();

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { message: "Schedule ID is required!" },
        { status: 400 }
      );
    }

    const updatedData = await request.json();
    const updatedSchedule = await LocationScheduleModel.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    if (!updatedSchedule) {
      return NextResponse.json(
        { message: "Schedule not found!" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Schedule updated successfully!", data: updatedSchedule },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

// DELETE API: Delete a schedule
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response if auth failed
    }

    await dbConnect();

    const { location, day, timeSlot } = await request.json();

    if (!location || !day || !timeSlot) {
      return NextResponse.json(
        { message: "Location, day, and timeSlot are required!" },
        { status: 400 }
      );
    }

    const scheduleDocument = await LocationScheduleModel.findOne({ location });

    if (!scheduleDocument || !scheduleDocument.schedule[day]) {
      return NextResponse.json(
        { message: "Location or schedule not found!" },
        { status: 404 }
      );
    }

    // Find and remove the time slot
    const updatedDaySchedule = scheduleDocument.schedule[day].filter(
      (slot:any) => !(slot.time === timeSlot.time && slot.date === timeSlot.date)
    );

    if (
      updatedDaySchedule.length === scheduleDocument.schedule[day].length
    ) {
      return NextResponse.json(
        { message: "Time slot not found!" },
        { status: 404 }
      );
    }

    scheduleDocument.schedule[day] = updatedDaySchedule;
    await scheduleDocument.save();

    return NextResponse.json(
      { message: "Time slot deleted successfully!", data: scheduleDocument },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting time slot:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

