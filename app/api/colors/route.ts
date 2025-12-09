import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/mongodb";
import ColorsModel from "@/models/Colors";
import { verifyJWT } from "@/utils/jwtUtils";

export async function GET(request: NextRequest) {
  try {
    // Validate JWT token first (before DB connection)
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ message: "Authentication required!" }, { status: 401 });
    }

    // Decode and verify JWT token
    const decoded = await verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ message: "Invalid or expired token!" }, { status: 401 });
    }

    // Connect to DB
    await dbConnect();

    // Retrieve query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const location = searchParams.get("location");

    // Build MongoDB filter
    const filter: any = {};
    if (startDate && !isNaN(Date.parse(startDate))) {
      filter.date = { $gte: new Date(startDate) };
    }
    if (endDate && !isNaN(Date.parse(endDate))) {
      filter.date = { ...filter.date, $lte: new Date(endDate) };
    }
    if (location) filter.location = location;

    // Fetch filtered colors
    const colors = await ColorsModel.find(filter).sort({ date: 1 });

    return NextResponse.json({ success: true, data: colors }, { status: 200 });
  } catch (err) {
    console.error("Error fetching colors:", err);
    return NextResponse.json({ message: "Server Error", error: err }, { status: 500 });
  }
}
