import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/mongodb";
import MedicalFileModel from "@/models/MedicalFile";
import AppointModel from "@/models/Appointment";
import { requireAuth } from "@/utils/authHelpers";
import {
  combineMedicalLetterFields,
  MedicalLetterFields,
} from "@/utils/medicalLetterFields";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { payload } = authResult;

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get("appointmentId");
    const doctorIdParam = searchParams.get("doctorId");
    const patientName = searchParams.get("patientName");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    await dbConnect();

    const filter: Record<string, unknown> = {};
    if (appointmentId) {
      filter.appointmentId = appointmentId;
    }

    // Role-based doctor scoping
    if (payload.role === "doctor" && payload.doctorId) {
      filter.doctorId = payload.doctorId;
    } else if ((payload.role === "admin" || payload.role === "superadmin") && doctorIdParam) {
      filter.doctorId = doctorIdParam;
    }

    const files = await MedicalFileModel.find(filter)
      .populate("appointmentId")
      .populate("doctorId", "name specialization")
      .sort({ createdAt: -1 })
      .lean();
    
    const filtered = files.filter((f: any) => {
      const appt = f.appointmentId as any;

      // Filter by patient name (simple contains, case-insensitive)
      if (patientName) {
        const name = (appt?.patientName || "").toString().toLowerCase();
        if (!name.includes(patientName.toLowerCase())) {
          return false;
        }
      }

      // Filter by appointment date range
      if (fromDate || toDate) {
        const apptDate = appt?.date instanceof Date ? appt.date : appt?.date ? new Date(appt.date) : null;
        if (!apptDate) {
          return false;
        }
        if (fromDate) {
          const from = new Date(fromDate);
          if (apptDate < from) return false;
        }
        if (toDate) {
          const to = new Date(toDate);
          // include entire end day
          to.setHours(23, 59, 59, 999);
          if (apptDate > to) return false;
        }
      }

      return true;
    });

    const data = filtered.map((f: any) => {
      const appt = f.appointmentId as any;
      const doc = f.doctorId as any;
      return {
        _id: f._id.toString(),
        appointmentId: appt?._id?.toString() ?? appt,
        doctorId: doc?._id?.toString() ?? doc,
        diagnosis: f.diagnosis,
        prescription: f.prescription,
        clinicalNotes: f.clinicalNotes,
        fields: f.fields,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        appointment: appt && {
          _id: appt._id?.toString?.() ?? appt._id,
          patientName: appt.patientName,
          date: appt.date,
          time: appt.time,
          location: appt.location,
          testType: appt.testType,
        },
        doctor: doc && {
          _id: doc._id?.toString?.() ?? doc._id,
          name: doc.name,
          specialization: doc.specialization,
        },
      };
    });

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
 * Body: appointmentId, fields? (preferred) OR diagnosis?/prescription?/clinicalNotes? (legacy)
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

    const {
      appointmentId,
      diagnosis,
      prescription,
      clinicalNotes,
      fields,
    } = body as {
      appointmentId?: string;
      diagnosis?: string;
      prescription?: string;
      clinicalNotes?: string;
      fields?: Partial<MedicalLetterFields>;
    };
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

    const combinedFromFields = fields
      ? combineMedicalLetterFields(fields)
      : null;

    const doc = await MedicalFileModel.create({
      appointmentId,
      doctorId,
      diagnosis: combinedFromFields?.diagnosis ?? diagnosis ?? "",
      prescription: combinedFromFields?.prescription ?? prescription ?? "",
      clinicalNotes: combinedFromFields?.clinicalNotes ?? clinicalNotes ?? "",
      fields: fields ?? undefined,
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
