import dbConnect from "@/utils/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/utils/authHelpers";
import NotesModel from "@/models/Notes";

export async function GET(request: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const location = searchParams.get("location");

  try {
    // Authenticate request
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response if auth failed
    }

    const filter: any = {};
    if (date) filter.date = new Date(date);
    if (location) filter.location = location;

    const notes = await NotesModel.find(filter).sort({ date: 1 });
    return NextResponse.json({ success: true, data: notes }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();
  const { date, notes, location } = await request.json();
  try {
    // Authenticate request
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response if auth failed
    }

    // Create new note with location
    const newNotes = new NotesModel({
      date,
      notes,
      location,
    });

    await newNotes.save();
    return NextResponse.json(
      { message: "Notes Created Successfully!", data: newNotes },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}


export async function PATCH(request: NextRequest) {
  await dbConnect();

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { message: "Notes ID is required!" },
        { status: 400 }
      );
    }

    const updatedData = await request.json();
    
    // Authenticate request
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response if auth failed
    }

    const updatedNotes = await NotesModel.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    if (!updatedNotes) {
      return NextResponse.json(
        { message: "Notes not found!" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Notes Updated Successfully!", data: updatedNotes },
      { status: 200 }
    );
  } catch (err) {
    console.error("Update Error:", err);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
