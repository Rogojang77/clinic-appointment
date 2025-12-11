import dbConnect from "@/utils/mongodb";
import { NextRequest, NextResponse } from "next/server";
import SectionScheduleModel from "@/models/SectionSchedule";
import { requireAuth } from "@/utils/authHelpers";

/**
 * GET /api/section-schedules
 * Get section schedules with optional filters
 * Query params: sectionId, location, day, date
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get("sectionId");
    const location = searchParams.get("location");
    const day = searchParams.get("day");
    const date = searchParams.get("date");

    // Build filter
    const filter: any = {};
    if (sectionId) filter.sectionId = sectionId;
    if (location) filter.location = location;

    const schedules = await SectionScheduleModel.find(filter).lean();

    // If day is specified, filter and return only that day's schedule
    if (day && schedules.length > 0) {
      const defaultDate = "00:00:00";
      const dateConditions = date ? [defaultDate, date] : [defaultDate];

      const filteredSchedules = schedules.map((schedule) => {
        const daySchedule = schedule.schedule[day] || [];
        const filteredDaySchedule = daySchedule.filter((slot: any) =>
          dateConditions.includes(slot.date)
        );

        return {
          ...schedule,
          schedule: {
            [day]: filteredDaySchedule,
          },
        };
      });

      return NextResponse.json(
        { success: true, data: filteredSchedules },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, data: schedules }, { status: 200 });
  } catch (error) {
    console.error("Error fetching section schedules:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/section-schedules
 * Create a new section schedule or add time slots to existing one
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await dbConnect();

    const { sectionId, location, day, timeSlot, slotInterval } = await request.json();

    if (!sectionId || !location) {
      return NextResponse.json(
        { message: "sectionId and location are required!" },
        { status: 400 }
      );
    }

    // Find or create section schedule
    let sectionSchedule = await SectionScheduleModel.findOne({
      sectionId,
      location,
    });

    if (!sectionSchedule) {
      // Create new schedule
      sectionSchedule = new SectionScheduleModel({
        sectionId,
        location,
        schedule: {
          Luni: [],
          Marți: [],
          Miercuri: [],
          Joi: [],
          Vineri: [],
          Sâmbătă: [],
          Duminica: [],
        },
        slotInterval: slotInterval || 15,
      });
    }

    // If day and timeSlot are provided, add the time slot
    if (day && timeSlot) {
      if (!sectionSchedule.schedule[day]) {
        sectionSchedule.schedule[day] = [];
      }

      // Check for duplicate
      const existingSlot = sectionSchedule.schedule[day].find(
        (slot: any) => slot.time === timeSlot.time && slot.date === timeSlot.date
      );

      if (existingSlot) {
        return NextResponse.json(
          { message: "Time slot already exists!" },
          { status: 400 }
        );
      }

      // Validate no overlapping hours for the same section+location+day
      if (timeSlot.date === "00:00:00") {
        // Only validate for default schedules
        const overlappingSlot = sectionSchedule.schedule[day].find(
          (slot: any) => slot.time === timeSlot.time && slot.date === "00:00:00"
        );

        if (overlappingSlot) {
          return NextResponse.json(
            { message: "Overlapping time slot detected!" },
            { status: 400 }
          );
        }
      }

      sectionSchedule.schedule[day].push(timeSlot);
    }

    // Update slot interval if provided
    if (slotInterval) {
      sectionSchedule.slotInterval = slotInterval;
    }

    await sectionSchedule.save();

    return NextResponse.json(
      { message: "Section schedule saved successfully!", data: sectionSchedule },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating section schedule:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { message: "Schedule already exists for this section and location!" },
        { status: 400 }
      );
    }
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

/**
 * PATCH /api/section-schedules
 * Update an existing section schedule
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
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
    const updatedSchedule = await SectionScheduleModel.findByIdAndUpdate(
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
    console.error("Error updating section schedule:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/section-schedules
 * Delete a section schedule or remove specific time slots
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await dbConnect();

    const { id, sectionId, location, day, timeSlot } = await request.json();

    // If ID is provided, delete the entire schedule
    if (id) {
      const deletedSchedule = await SectionScheduleModel.findByIdAndDelete(id);
      if (!deletedSchedule) {
        return NextResponse.json(
          { message: "Schedule not found!" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { message: "Schedule deleted successfully!" },
        { status: 200 }
      );
    }

    // Otherwise, delete specific time slot
    if (!sectionId || !location || !day || !timeSlot) {
      return NextResponse.json(
        { message: "sectionId, location, day, and timeSlot are required!" },
        { status: 400 }
      );
    }

    const sectionSchedule = await SectionScheduleModel.findOne({
      sectionId,
      location,
    });

    if (!sectionSchedule || !sectionSchedule.schedule[day]) {
      return NextResponse.json(
        { message: "Schedule not found!" },
        { status: 404 }
      );
    }

    // Remove the time slot
    sectionSchedule.schedule[day] = sectionSchedule.schedule[day].filter(
      (slot: any) =>
        !(slot.time === timeSlot.time && slot.date === timeSlot.date)
    );

    await sectionSchedule.save();

    return NextResponse.json(
      { message: "Time slot deleted successfully!", data: sectionSchedule },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting section schedule:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

