import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/mongodb";
import MedicalFileModel from "@/models/MedicalFile";
import AppointModel from "@/models/Appointment";
import { requireAuth } from "@/utils/authHelpers";

/**
 * GET /api/medical-files?appointmentId=...
 * List medical files. If appointmentId provided, return the one for that appointment.
 * Doctors only see their own files.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { payload } = authResult;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get("appointmentId");

    const filter: Record<string, unknown> = {};
    if (appointmentId) filter.appointmentId = appointmentId;
    if (payload.role === "doctor" && payload.doctorId) {
      filter.doctorId = payload.doctorId;
    }

    const files = await MedicalFileModel.find(filter)
      .populate("appointmentId")
      .populate("doctorId", "name specialization")
      .sort({ createdAt: -1 })
      .lean();

    const data = files.map((f: any) => ({
      _id: f._id.toString(),
      appointmentId: f.appointmentId?._id?.toString() ?? f.appointmentId,
      doctorId: f.doctorId?._id?.toString() ?? f.doctorId,
      diagnosis: f.diagnosis,
      prescription: f.prescription,
      clinicalNotes: f.clinicalNotes,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      appointment: f.appointmentId,
      doctor: f.doctorId,
    }));

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("GET /api/medical-files error:", err);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/medical-files
 * Body: appointmentId, diagnosis?, prescription?, clinicalNotes?
 * Only doctors and admins can create. Operators cannot.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { payload } = authResult;

    if (payload.role === "operator") {
      return NextResponse.json(
        { success: false, message: "Operatorii nu pot crea fișe medicale." },
        { status: 403 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 }
      );
    }

    const { appointmentId, diagnosis, prescription, clinicalNotes } = body;
    if (!appointmentId) {
      return NextResponse.json(
        { success: false, message: "appointmentId is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const appointment = await AppointModel.findById(appointmentId).lean();
    if (!appointment) {
      return NextResponse.json(
        { success: false, message: "Appointment not found" },
        { status: 404 }
      );
    }

    const doctorId =
      payload.role === "doctor"
        ? payload.doctorId
        : body.doctorId ?? (appointment as any).doctorId;
    if (!doctorId) {
      return NextResponse.json(
        { success: false, message: "Doctor is required" },
        { status: 400 }
      );
    }
    if (
      payload.role === "doctor" &&
      String((appointment as any).doctorId) !== String(payload.doctorId)
    ) {
      return NextResponse.json(
        { success: false, message: "You can only create medical files for your own appointments" },
        { status: 403 }
      );
    }

    const existing = await MedicalFileModel.findOne({ appointmentId });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "A medical file already exists for this appointment" },
        { status: 409 }
      );
    }

    const doc = await MedicalFileModel.create({
      appointmentId,
      doctorId,
      diagnosis: diagnosis ?? "",
      prescription: prescription ?? "",
      clinicalNotes: clinicalNotes ?? "",
    });

    const created = await MedicalFileModel.findById(doc._id)
      .populate("appointmentId")
      .populate("doctorId", "name specialization")
      .lean();

    const out = {
      ...created,
      _id: (created as any)._id?.toString?.(),
      appointmentId: (created as any).appointmentId?._id?.toString?.() ?? (created as any).appointmentId,
      doctorId: (created as any).doctorId?._id?.toString?.() ?? (created as any).doctorId,
    };

    return NextResponse.json({ success: true, data: out }, { status: 201 });
  } catch (err) {
    console.error("POST /api/medical-files error:", err);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}
