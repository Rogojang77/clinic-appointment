import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/mongodb";
import AppointModel from "@/models/Appointment";
import { requireAuth } from "@/utils/authHelpers";
import dayjs from "dayjs";

/**
 * GET /api/appointments
 * Query: date (YYYY-MM-DD), location, sectionId?, testType?
 * Returns { success, data, message }
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const location = searchParams.get("location");
    const sectionId = searchParams.get("sectionId");
    const testType = searchParams.get("testType");

    const filter: Record<string, unknown> = {};
    if (date) {
      const start = dayjs(date).startOf("day").toDate();
      const end = dayjs(date).endOf("day").toDate();
      filter.date = { $gte: start, $lte: end };
    }
    if (location) filter.location = location;
    if (sectionId) filter.sectionId = sectionId;
    if (testType) filter.testType = testType;
    // Doctors only see their own appointments
    if (authResult.payload.role === "doctor" && authResult.payload.doctorId) {
      filter.doctorId = authResult.payload.doctorId;
    }

    const appointments = await AppointModel.find(filter)
      .populate("sectionId", "name description")
      .populate("doctorId", "name specialization")
      .sort({ time: 1 })
      .lean();

    const data = appointments.map((a: any) => ({
      ...a,
      _id: a._id.toString(),
      sectionId: a.sectionId?._id?.toString() ?? a.sectionId,
      doctorId: a.doctorId?._id?.toString() ?? a.doctorId,
      section: a.sectionId && typeof a.sectionId === "object" ? { _id: a.sectionId._id?.toString(), name: a.sectionId.name, description: a.sectionId.description } : undefined,
      doctor: a.doctorId && typeof a.doctorId === "object" ? { _id: a.doctorId._id?.toString(), name: a.doctorId.name, specialization: a.doctorId.specialization } : undefined,
      date: a.date ? (typeof a.date === "string" ? a.date : dayjs(a.date).format("YYYY-MM-DD")) : undefined,
    }));

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("GET /api/appointments error:", err);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/appointments
 * Body: location, date, day, time, patientName, doctorName?, testType, phoneNumber, isConfirmed?, notes?, sectionId?, doctorId?, isDefault?
 * Doctors cannot create appointments.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    if (authResult.payload.role === "doctor") {
      return NextResponse.json(
        { success: false, message: "Medicii nu pot crea programări." },
        { status: 403 }
      );
    }

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

    const {
      location,
      date: dateInput,
      day,
      time,
      patientName,
      doctorName,
      testType,
      phoneNumber,
      isConfirmed,
      notes,
      sectionId,
      doctorId,
      isDefault,
    } = body;

    if (!location || !dateInput || !day || !time || !patientName || !testType || !phoneNumber) {
      return NextResponse.json(
        { success: false, message: "Lipsesc câmpuri obligatorii." },
        { status: 400 }
      );
    }

    const date = dayjs(dateInput).isValid() ? dayjs(dateInput).startOf("day").toDate() : new Date(dateInput);

    const doc = await AppointModel.create({
      location,
      date,
      day,
      time,
      patientName,
      doctorName: doctorName ?? "",
      testType,
      phoneNumber,
      isConfirmed: !!isConfirmed,
      notes: notes ?? "",
      sectionId: sectionId || undefined,
      doctorId: doctorId || undefined,
      isDefault: !!isDefault,
    });

    const created = await AppointModel.findById(doc._id)
      .populate("sectionId", "name description")
      .populate("doctorId", "name specialization")
      .lean() as { _id: unknown; date: Date } | null;

    if (!created) {
      return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
    }
    const out = {
      ...created,
      _id: created._id?.toString?.() ?? String(created._id),
      date: dayjs(created.date).format("YYYY-MM-DD"),
    };

    return NextResponse.json({ success: true, data: out }, { status: 201 });
  } catch (err) {
    console.error("POST /api/appointments error:", err);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}

function isAppointmentDateInPast(date: Date | string): boolean {
  const d = typeof date === "string" ? dayjs(date, "YYYY-MM-DD") : dayjs(date);
  return d.isBefore(dayjs(), "day");
}

/**
 * PATCH /api/appointments?id=...
 * Body: partial appointment fields. Rejects if appointment date is in the past.
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    await dbConnect();

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID lipsește." },
        { status: 400 }
      );
    }

    const appointment = await AppointModel.findById(id);
    if (!appointment) {
      return NextResponse.json(
        { success: false, message: "Programarea nu a fost găsită." },
        { status: 404 }
      );
    }

    if (authResult.payload.role === "doctor" && authResult.payload.doctorId) {
      const appointmentDoctorId = (appointment.doctorId as any)?.toString?.() ?? appointment.doctorId?.toString?.();
      if (appointmentDoctorId !== authResult.payload.doctorId) {
        return NextResponse.json(
          { success: false, message: "Nu aveți permisiunea să modificați această programare." },
          { status: 403 }
        );
      }
    }

    if (isAppointmentDateInPast(appointment.date)) {
      return NextResponse.json(
        { success: false, message: "Nu se pot modifica programări din trecut." },
        { status: 400 }
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

    const allowed = [
      "time", "patientName", "doctorName", "testType", "phoneNumber",
      "isConfirmed", "notes", "sectionId", "doctorId", "isDefault",
    ];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const updated = await AppointModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    )
      .populate("sectionId", "name description")
      .populate("doctorId", "name specialization")
      .lean() as { _id: unknown; date: Date } | null;

    if (!updated) {
      return NextResponse.json({ success: false, message: "Programarea nu a fost găsită." }, { status: 404 });
    }
    const out = {
      ...updated,
      _id: updated._id?.toString?.() ?? String(updated._id),
      date: dayjs(updated.date).format("YYYY-MM-DD"),
    };

    return NextResponse.json({ success: true, data: out }, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/appointments error:", err);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/appointments?id=...
 * Rejects if appointment date is in the past.
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    await dbConnect();

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID lipsește." },
        { status: 400 }
      );
    }

    const appointment = await AppointModel.findById(id);
    if (!appointment) {
      return NextResponse.json(
        { success: false, message: "Programarea nu a fost găsită." },
        { status: 404 }
      );
    }

    if (authResult.payload.role === "doctor" && authResult.payload.doctorId) {
      const appointmentDoctorId = (appointment.doctorId as any)?.toString?.() ?? appointment.doctorId?.toString?.();
      if (appointmentDoctorId !== authResult.payload.doctorId) {
        return NextResponse.json(
          { success: false, message: "Nu aveți permisiunea să ștergeți această programare." },
          { status: 403 }
        );
      }
    }

    if (isAppointmentDateInPast(appointment.date)) {
      return NextResponse.json(
        { success: false, message: "Nu se pot șterge programări din trecut." },
        { status: 400 }
      );
    }

    await AppointModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Programarea a fost ștearsă." }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/appointments error:", err);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}
