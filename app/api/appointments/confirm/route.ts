import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/mongodb";
import AppointModel from "@/models/Appointment";
import { hashTokenSha256Hex } from "@/utils/whatsappMeta";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 }
      );
    }

    const token = String(body?.token ?? "");
    const decision = body?.decision;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token is required" },
        { status: 400 }
      );
    }
    if (decision !== "confirmed" && decision !== "declined") {
      return NextResponse.json(
        { success: false, message: "Decision must be confirmed or declined" },
        { status: 400 }
      );
    }

    const tokenHash = hashTokenSha256Hex(token);
    const now = new Date();

    const appointment = await AppointModel.findOne({
      confirmationTokenHash: tokenHash,
      confirmationTokenExpiresAt: { $gt: now },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, message: "Link invalid or expired" },
        { status: 404 }
      );
    }

    // Apply decision and also update existing isConfirmed as requested.
    appointment.patientDecision = decision;
    appointment.patientDecisionAt = now;
    appointment.isConfirmed = decision === "confirmed";

    // Prevent token replay after decision
    appointment.confirmationTokenHash = null;
    appointment.confirmationTokenExpiresAt = null;

    await appointment.save();

    return NextResponse.json(
      { success: true, data: { appointmentId: appointment._id?.toString?.() ?? String(appointment._id), decision } },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /api/appointments/confirm error:", err);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}

