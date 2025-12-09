import dbConnect from "@/utils/mongodb";
import { NextRequest, NextResponse } from "next/server";
import LocationScheduleModel from "@/models/LocationSchedule";

interface Schedule {
  [day: string]: { date: string; time: string; _id: string }[];
}

interface LocationSchedule {
  location: string;
  schedule: Schedule;
}

// Existing GET, POST, PATCH, DELETE endpoints...

// New GET endpoint to count default date time slots
export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    const day = searchParams.get("day");

    if (!location || !day) {
      return NextResponse.json(
        { message: "Location and day are required!" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { success: true, count: 0 }, // Return count as 0 if no schedules are found
        { status: 200 }
      );
    }

    // Filter schedules by the default date
    const daySchedule = scheduleDocument.schedule[day];
    const defaultDateSlots = daySchedule.filter(
      (item) => item.date === defaultDate
    );

    // Return the count of default date time slots
    return NextResponse.json(
      { success: true, count: defaultDateSlots.length },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error counting default date time slots:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}