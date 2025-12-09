import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/utils/mongodb";
import ActivityScheduleModel from "@/models/ActivitySchedule";

// GET /api/activity-schedules/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid activity schedule ID" },
        { status: 400 }
      );
    }

    const schedule = await ActivityScheduleModel.findById(id)
      .populate("userId", "username email role")
      .populate("sectionId", "name description");

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: "Activity schedule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error("Error fetching activity schedule:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch activity schedule" },
      { status: 500 }
    );
  }
}


// PUT /api/activity-schedules/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid activity schedule ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { schedule, isActive, userId, sectionId } = body;

    const existingSchedule = await ActivityScheduleModel.findById(id);
    if (!existingSchedule) {
      return NextResponse.json(
        { success: false, error: "Activity schedule not found" },
        { status: 404 }
      );
    }

    // Validate schedule structure
    if (schedule && Array.isArray(schedule)) {
      const validDays = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];

      for (const day of schedule) {
        if (!validDays.includes(day.day)) {
          return NextResponse.json(
            { success: false, error: `Invalid day: ${day.day}` },
            { status: 400 }
          );
        }

        if (day.timeSlots && Array.isArray(day.timeSlots)) {
          for (const slot of day.timeSlots) {
            if (!slot.startTime || !slot.endTime) {
              return NextResponse.json(
                {
                  success: false,
                  error: "Time slots must have startTime and endTime",
                },
                { status: 400 }
              );
            }
          }
        }
      }
    }

    // Prevent changing userId/sectionId
    if (userId || sectionId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot change user or section after creation. Create a new schedule instead.",
        },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (schedule !== undefined) updateData.schedule = schedule;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await ActivityScheduleModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate([
      { path: "userId", select: "username email role" },
      { path: "sectionId", select: "name description" },
    ]);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating activity schedule:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update activity schedule" },
      { status: 500 }
    );
  }
}


// DELETE /api/activity-schedules/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid activity schedule ID" },
        { status: 400 }
      );
    }

    const schedule = await ActivityScheduleModel.findById(id);
    if (!schedule) {
      return NextResponse.json(
        { success: false, error: "Activity schedule not found" },
        { status: 404 }
      );
    }

    await ActivityScheduleModel.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Activity schedule deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting activity schedule:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete activity schedule" },
      { status: 500 }
    );
  }
}
