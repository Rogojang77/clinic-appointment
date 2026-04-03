import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/mongodb";
import { requireAuth } from "@/utils/authHelpers";
import AppointModel from "@/models/Appointment";
import WhatsAppMessageModel from "@/models/WhatsAppMessage";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing appointment id" },
        { status: 400 }
      );
    }

    await dbConnect();

    const appointment = await AppointModel.findById(id)
      .select("_id doctorId")
      .lean<{ _id: unknown; doctorId?: unknown } | null>();

    if (!appointment) {
      return NextResponse.json(
        { success: false, message: "Appointment not found" },
        { status: 404 }
      );
    }

    if (authResult.payload.role === "doctor" && authResult.payload.doctorId) {
      const appointmentDoctorId =
        (appointment.doctorId as { toString?: () => string })?.toString?.() ??
        String(appointment.doctorId ?? "");
      if (appointmentDoctorId !== authResult.payload.doctorId) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 403 }
        );
      }
    }

    const messages = await WhatsAppMessageModel.find({ appointmentId: id })
      .sort({ createdAt: 1 })
      .lean();

    const data = messages.map((m: any) => ({
      _id: String(m._id),
      appointmentId: m.appointmentId ? String(m.appointmentId) : null,
      phoneNumber: m.phoneNumber,
      direction: m.direction,
      provider: m.provider,
      messageSid: m.messageSid,
      text: m.text || "",
      buttonPayload: m.buttonPayload || null,
      buttonText: m.buttonText || null,
      status: m.status || "pending",
      statusError: m.statusError || null,
      metaTimestamp: m.metaTimestamp ? new Date(m.metaTimestamp).toISOString() : null,
      createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : null,
      updatedAt: m.updatedAt ? new Date(m.updatedAt).toISOString() : null,
    }));

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("GET /api/appointments/[id]/whatsapp-chat error:", err);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}
