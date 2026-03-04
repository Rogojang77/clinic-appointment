import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/mongodb";
import MedicalFileModel from "@/models/MedicalFile";
import AppointModel from "@/models/Appointment";
import { requireAuth } from "@/utils/authHelpers";
import { generateMedicalFilePdf } from "@/utils/medicalFilePdf";
import dayjs from "dayjs";

/**
 * GET /api/medical-files/:id/pdf
 * Stream the medical file as PDF. Doctors only their own.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { payload } = authResult;

    const { id } = await context.params;
    await dbConnect();

    const file = await MedicalFileModel.findById(id)
      .populate("appointmentId")
      .populate("doctorId", "name specialization")
      .lean();

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Medical file not found" },
        { status: 404 }
      );
    }

    const doctorIdStr = (file as any).doctorId?._id?.toString?.() ?? (file as any).doctorId?.toString?.();
    if (payload.role === "doctor" && payload.doctorId && doctorIdStr !== payload.doctorId) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const appointment = (file as any).appointmentId;
    if (!appointment) {
      return NextResponse.json(
        { success: false, message: "Appointment not found" },
        { status: 404 }
      );
    }

    const appointmentData = {
      patientName: appointment.patientName,
      date: appointment.date ? dayjs(appointment.date).format("YYYY-MM-DD") : undefined,
      time: appointment.time,
      sectionName: appointment.sectionId?.name ?? appointment.testType,
      doctorName: (file as any).doctorId?.name ?? appointment.doctorName,
      phoneNumber: appointment.phoneNumber,
      testType: appointment.testType,
      notes: appointment.notes,
    };

    const medicalFileData = {
      diagnosis: (file as any).diagnosis,
      prescription: (file as any).prescription,
      clinicalNotes: (file as any).clinicalNotes,
    };

    const pdfBuffer = generateMedicalFilePdf(appointmentData, medicalFileData);
    const appointmentIdStr = typeof appointment._id === "string" ? appointment._id : (appointment._id as any)?.toString?.() ?? id;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="fisa-medicala-${appointmentIdStr}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error("GET /api/medical-files/[id]/pdf error:", err);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}
