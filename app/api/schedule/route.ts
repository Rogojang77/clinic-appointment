import dbConnect from "@/utils/mongodb";
import { NextRequest, NextResponse } from "next/server";
import LocationScheduleModel from "@/models/LocationSchedule";
import { verifyJWT } from "@/utils/jwtUtils";

interface Schedule {
  [day: string]: { date: string; time: string; _id: string }[];
}

interface LocationSchedule {
  location: string;
  schedule: Schedule;
}

// export async function GET(request: NextRequest) {
//   await dbConnect();

//   try {
//     const { searchParams } = new URL(request.url);
//     const location = searchParams.get("location");
//     const day = searchParams.get("day");
//     const date = searchParams.get("date");

//     if (!location || !day) {
//       return NextResponse.json(
//         { message: "Location and day are required!" },
//         { status: 400 }
//       );
//     }
//     const defaultDate = "00:00:00";

//     // Prepare date conditions (both default and filtered)
//     const dateConditions = date
//       ? [defaultDate, date]
//       : [defaultDate];
      
//     const filter = {
//       location,
//       [`schedule.${day}`]: {
//         $elemMatch: {
//           date: { $in: dateConditions },
//         },
//       },
//     };

//     // Query with typing to ensure scheduleDocument is correctly inferred
//     const scheduleDocument = await LocationScheduleModel.findOne(filter, {
//       [`schedule.${day}`]: 1, // Only include the specific day's data
//     }).lean<LocationSchedule | null>();

//     if (!scheduleDocument || !scheduleDocument.schedule[day]) {
//       return NextResponse.json(
//         { success: true, data: [] }, // Return empty array for no schedules
//         { status: 200 }
//       );
//     }

//     // Sort the day's schedule by time in ascending order
//     const daySchedule = scheduleDocument.schedule[day].sort(
//       (a, b) => a.time.localeCompare(b.time)
//     );

//     return NextResponse.json(
//       { success: true, data: daySchedule },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Error fetching schedule:", error);
//     return NextResponse.json({ message: "Server Error" }, { status: 500 });
//   }
// }


// POST API: Create a new schedule

export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    const day = searchParams.get("day");
    const date = searchParams.get("date");

    if (!location || !day) {
      return NextResponse.json(
        { message: "Location and day are required!" },
        { status: 400 }
      );
    }

    // Default date to always include
    const defaultDate = "00:00:00";

    // Prepare date conditions (both default and filtered)
    const dateConditions = date
      ? [defaultDate, date]
      : [defaultDate];

    const filter = {
      location,
      [`schedule.${day}`]: {
        $elemMatch: {
          date: { $in: dateConditions },
        },
      },
    };

    // Query the database for matching schedules
    const scheduleDocument = await LocationScheduleModel.findOne(filter, {
      [`schedule.${day}`]: 1, // Only include the specific day's data
    }).lean<LocationSchedule | null>();

    if (!scheduleDocument || !scheduleDocument.schedule[day]) {
      return NextResponse.json(
        { success: true, data: [] }, // Return empty array for no schedules
        { status: 200 }
      );
    }

    // Filter schedules by the default and specified dates
    const daySchedule = scheduleDocument.schedule[day];
    const filteredSchedules = daySchedule.filter((item) =>
      [defaultDate, date].includes(item.date)
    );

    // Sort the merged schedules by time in ascending order
    const sortedSchedules = filteredSchedules.sort((a, b) =>
      a.time.localeCompare(b.time)
    );

    return NextResponse.json(
      { success: true, data: sortedSchedules },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { message: "Authentication required!" },
        { status: 401 }
      );
    }

    const decoded = await verifyJWT(token);
    if (!decoded) {
      return NextResponse.json(
        { message: "Invalid or expired token!" },
        { status: 401 }
      );
    }

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
  await dbConnect();

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { message: "Schedule ID is required!" },
        { status: 400 }
      );
    }

    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { message: "Authentication required!" },
        { status: 401 }
      );
    }

    const decoded = await verifyJWT(token);
    if (!decoded) {
      return NextResponse.json(
        { message: "Invalid or expired token!" },
        { status: 401 }
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
  await dbConnect();

  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { message: "Authentication required!" },
        { status: 401 }
      );
    }

    const decoded = await verifyJWT(token);
    if (!decoded) {
      return NextResponse.json(
        { message: "Invalid or expired token!" },
        { status: 401 }
      );
    }

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

