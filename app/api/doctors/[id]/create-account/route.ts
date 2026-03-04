import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/mongodb";
import UserModel from "@/models/User";
import DoctorModel from "@/models/Doctor";
import { requireAuth, isSuperAdmin } from "@/utils/authHelpers";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

/**
 * POST /api/doctors/[id]/create-account
 * Create a login account for a doctor. Super admin only.
 * Body: { email, username, password }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { payload } = authResult;

    if (!isSuperAdmin(payload)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Super admin access required" },
        { status: 403 }
      );
    }

    const { id: doctorId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return NextResponse.json(
        { success: false, error: "Invalid doctor ID" },
        { status: 400 }
      );
    }

    let body: { email?: string; username?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }
    const { email, username, password } = body;

    if (!email || !username || !password) {
      return NextResponse.json(
        { success: false, error: "Email, username and password are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const doctor = await DoctorModel.findById(doctorId);
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: "Doctor not found" },
        { status: 404 }
      );
    }

    if (doctor.userId) {
      return NextResponse.json(
        { success: false, error: "This doctor already has an account" },
        { status: 409 }
      );
    }

    const existingUser = await UserModel.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "User with this email or username already exists" },
        { status: 409 }
      );
    }

    const accessSection = String(doctor.sectionId);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await UserModel.create({
      email,
      username,
      password: hashedPassword,
      accessSection,
      role: "doctor",
      doctorId: doctor._id,
      isverified: true,
    });

    await DoctorModel.findByIdAndUpdate(doctorId, { userId: user._id });

    const userResponse = user.toObject();
    delete (userResponse as Record<string, unknown>).password;

    return NextResponse.json(
      { success: true, data: userResponse, message: "Doctor account created successfully" },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create doctor account error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
