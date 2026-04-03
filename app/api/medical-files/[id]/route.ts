import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/mongodb";
import MedicalFileModel from "@/models/MedicalFile";
import { requireAuth } from "@/utils/authHelpers";
import {
  combineMedicalLetterFields,
  MedicalLetterFields,
} from "@/utils/medicalLetterFields";

/**
 * GET /api/medical-files/:id
 * Get one medical file. Doctors only their own.
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

    const out = {
      ...file,
      _id: (file as any)._id?.toString?.(),
      appointmentId: (file as any).appointmentId?._id?.toString?.() ?? (file as any).appointmentId,
      doctorId: doctorIdStr,
      fields: (file as any).fields,
    };

    return NextResponse.json({ success: true, data: out }, { status: 200 });
  } catch (err) {
    console.error("GET /api/medical-files/[id] error:", err);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/medical-files/:id
 * Body: fields? (preferred) OR diagnosis?/prescription?/clinicalNotes? (legacy)
 * Only doctors and admins can update. Operators cannot.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { payload } = authResult;

    if (payload.role === "operator") {
      return NextResponse.json(
        { success: false, message: "Operatorii nu pot actualiza fișe medicale." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    await dbConnect();

    const file = await MedicalFileModel.findById(id);
    if (!file) {
      return NextResponse.json(
        { success: false, message: "Medical file not found" },
        { status: 404 }
      );
    }

    const doctorIdStr = file.doctorId?.toString?.();
    if (payload.role === "doctor" && payload.doctorId && doctorIdStr !== payload.doctorId) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
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

    const allowed = ["diagnosis", "prescription", "clinicalNotes", "fields"];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const fields = body.fields as Partial<MedicalLetterFields> | undefined;
    if (fields) {
      const combined = combineMedicalLetterFields(fields);
      update.diagnosis = combined.diagnosis;
      update.prescription = combined.prescription;
      update.clinicalNotes = combined.clinicalNotes;
      update.fields = fields;
    }

    const updated = await MedicalFileModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    )
      .populate("appointmentId")
      .populate("doctorId", "name specialization")
      .lean();

    const out = {
      ...updated,
      _id: (updated as any)._id?.toString?.(),
      appointmentId: (updated as any).appointmentId?._id?.toString?.() ?? (updated as any).appointmentId,
      doctorId: (updated as any).doctorId?._id?.toString?.() ?? (updated as any).doctorId,
    };

    return NextResponse.json({ success: true, data: out }, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/medical-files/[id] error:", err);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/medical-files/:id
 * Delete a medical file.
 * - Operators cannot delete
 * - Doctors can delete only their own files
 * - Admins and superadmins can delete any file
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { payload } = authResult;

    if (payload.role === "operator") {
      return NextResponse.json(
        { success: false, message: "Operatorii nu pot șterge fișe medicale." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    await dbConnect();

    const file = await MedicalFileModel.findById(id);
    if (!file) {
      return NextResponse.json(
        { success: false, message: "Medical file not found" },
        { status: 404 }
      );
    }

    const doctorIdStr = file.doctorId?.toString?.();
    if (payload.role === "doctor" && payload.doctorId && doctorIdStr !== payload.doctorId) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    await MedicalFileModel.findByIdAndDelete(id);

    return NextResponse.json(
      { success: true, message: "Medical file deleted" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/medical-files/[id] error:", err);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}
