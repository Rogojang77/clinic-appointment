import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/mongodb";
import AppointModel from "@/models/Appointment";
import DoctorModel from "@/models/Doctor";
import { requireAuth } from "@/utils/authHelpers";
import dayjs from "dayjs";
import mongoose from "mongoose";
import { computeWhatsAppReminderWindowBounds } from "@/utils/appointmentDateTime";

function weekdayRoFromYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const s = new Intl.DateTimeFormat("ro-RO", {
    weekday: "long",
    timeZone: "Europe/Bucharest",
  }).format(dt);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeScopeValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function hasSlotConflict(params: {
  location: string;
  date: Date;
  time: string;
  sectionId?: unknown;
  testType?: unknown;
  doctorId?: unknown;
  excludeId?: string;
}): Promise<boolean> {
  const { location, date, time, sectionId, testType, doctorId, excludeId } = params;

  const filter: Record<string, unknown> = {
    location,
    date,
    time,
  };

  const normalizedDoctorId = normalizeScopeValue(doctorId);
  const normalizedSectionId = normalizeScopeValue(sectionId);
  const normalizedTestType = normalizeScopeValue(testType);

  if (normalizedDoctorId) {
    filter.doctorId = mongoose.Types.ObjectId.isValid(normalizedDoctorId)
      ? new mongoose.Types.ObjectId(normalizedDoctorId)
      : normalizedDoctorId;
  } else if (normalizedSectionId) {
    filter.sectionId = mongoose.Types.ObjectId.isValid(normalizedSectionId)
      ? new mongoose.Types.ObjectId(normalizedSectionId)
      : normalizedSectionId;
    filter.$or = [{ doctorId: { $exists: false } }, { doctorId: null }];
  } else if (normalizedTestType) {
    // Backward compatibility for appointments created before sectionId support.
    filter.testType = normalizedTestType;
    filter.$or = [{ sectionId: { $exists: false } }, { sectionId: null }];
  } else {
    return false;
  }

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const conflict = await AppointModel.exists(filter);
  return !!conflict;
}

function slotConflictMessage(doctorId?: unknown): string {
  return normalizeScopeValue(doctorId)
    ? "Slotul este deja ocupat pentru acest medic."
    : "Slotul este deja ocupat pentru această secție.";
}

async function sectionHasActiveDoctors(sectionId: unknown): Promise<boolean> {
  const normalized = normalizeScopeValue(
    typeof sectionId === "object" && sectionId !== null && "_id" in (sectionId as object)
      ? String((sectionId as { _id?: unknown })._id)
      : sectionId
  );
  if (!normalized) return false;
  const oid = mongoose.Types.ObjectId.isValid(normalized)
    ? new mongoose.Types.ObjectId(normalized)
    : normalized;
  const count = await DoctorModel.countDocuments({ sectionId: oid, isActive: true });
  return count > 0;
}

function isMongoDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

/**
 * GET /api/appointments
 * Query: date (YYYY-MM-DD), location, sectionId?, testType?, doctorId?
 * Or: search=... (min. 2 chars) — all appointments, match nume, prenume, telefon; ignores date/location/section/testType
 * Returns { success, data, message }
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const searchRaw = (searchParams.get("search") ?? "").trim();
    const date = searchParams.get("date");
    const location = searchParams.get("location");
    const sectionId = searchParams.get("sectionId");
    const testType = searchParams.get("testType");
    const doctorId = searchParams.get("doctorId");

    if (searchRaw.length > 0 && searchRaw.length < 2) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    if (searchRaw.length >= 2) {
      const rx = new RegExp(escapeRegExp(searchRaw), "i");
      const filter: Record<string, unknown> = {
        $or: [
          { patientName: rx },
          { patientSurname: rx },
          { phoneNumber: rx },
        ],
      };
      if (authResult.payload.role === "doctor" && authResult.payload.doctorId) {
        filter.doctorId = authResult.payload.doctorId;
      }

      const appointments = await AppointModel.find(filter)
        .populate("sectionId", "name description")
        .populate("doctorId", "name specialization")
        .sort({ date: -1, time: -1 })
        .limit(100)
        .lean();

      const data = appointments.map((a: any) => ({
        ...a,
        _id: a._id.toString(),
        sectionId: a.sectionId?._id?.toString() ?? a.sectionId,
        doctorId: a.doctorId?._id?.toString() ?? a.doctorId,
        section:
          a.sectionId && typeof a.sectionId === "object"
            ? {
                _id: a.sectionId._id?.toString(),
                name: a.sectionId.name,
                description: a.sectionId.description,
              }
            : undefined,
        doctor:
          a.doctorId && typeof a.doctorId === "object"
            ? {
                _id: a.doctorId._id?.toString(),
                name: a.doctorId.name,
                specialization: a.doctorId.specialization,
              }
            : undefined,
        date: a.date
          ? typeof a.date === "string"
            ? a.date
            : dayjs(a.date).format("YYYY-MM-DD")
          : undefined,
      }));

      return NextResponse.json({ success: true, data }, { status: 200 });
    }

    const filter: Record<string, unknown> = {};
    if (date) {
      const start = dayjs(date).startOf("day").toDate();
      const end = dayjs(date).endOf("day").toDate();
      filter.date = { $gte: start, $lte: end };
    }
    if (location) filter.location = location;
    if (sectionId) filter.sectionId = sectionId;
    if (testType) filter.testType = testType;
    if (doctorId) filter.doctorId = doctorId;
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
  let body: any;
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

    const isEcografie = testType === "Ecografie";
    if (!isEcografie && sectionId) {
      const hasDoctors = await sectionHasActiveDoctors(sectionId);
      if (hasDoctors && !normalizeScopeValue(doctorId)) {
        return NextResponse.json(
          { success: false, message: "Medicul este obligatoriu." },
          { status: 400 }
        );
      }
    }

    const date = dayjs(dateInput).isValid() ? dayjs(dateInput).startOf("day").toDate() : new Date(dateInput);
    const confirmed = !!isConfirmed;
    const windowBounds = computeWhatsAppReminderWindowBounds({ date, time });

    const conflictExists = await hasSlotConflict({
      location,
      date,
      time,
      sectionId,
      testType,
      doctorId,
    });
    if (conflictExists) {
      return NextResponse.json(
        {
          success: false,
          message: slotConflictMessage(doctorId),
        },
        { status: 409 }
      );
    }

    const doc = await AppointModel.create({
      location,
      date,
      day,
      time,
      patientName,
      doctorName: doctorName ?? "",
      testType,
      phoneNumber,
      isConfirmed: confirmed,
      notes: notes ?? "",
      sectionId: sectionId || undefined,
      doctorId: doctorId || undefined,
      isDefault: !!isDefault,
      whatsAppReminderWindowStart: windowBounds?.start ?? null,
      whatsAppReminderWindowEnd: windowBounds?.end ?? null,
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
    if (isMongoDuplicateKeyError(err)) {
      return NextResponse.json(
        {
          success: false,
          message: slotConflictMessage(body?.doctorId),
        },
        { status: 409 }
      );
    }
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
  let conflictDoctorId: unknown;
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
      "time",
      "date",
      "patientName",
      "doctorName",
      "testType",
      "phoneNumber",
      "isConfirmed",
      "notes",
      "sectionId",
      "doctorId",
      "isDefault",
    ];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    if (update.date !== undefined) {
      const di = update.date;
      const nextDate =
        di instanceof Date
          ? dayjs(di).startOf("day").toDate()
          : dayjs(String(di)).isValid()
            ? dayjs(String(di)).startOf("day").toDate()
            : null;
      if (!nextDate) {
        return NextResponse.json(
          { success: false, message: "Dată invalidă." },
          { status: 400 }
        );
      }
      update.date = nextDate;
      const ymd = dayjs.utc(nextDate).format("YYYY-MM-DD");
      update.day = weekdayRoFromYmd(ymd);
    }

    const becameUnconfirmed =
      update.isConfirmed === false && appointment.isConfirmed === true;
    const confirmationChanged =
      update.isConfirmed !== undefined &&
      !!update.isConfirmed !== !!appointment.isConfirmed;

    const effectiveDate = (update.date as Date | undefined) ?? appointment.date;
    const effectiveTime = (update.time as string | undefined) ?? appointment.time;
    const effectiveSectionId =
      update.sectionId !== undefined ? update.sectionId : appointment.sectionId;
    const effectiveTestType =
      update.testType !== undefined ? update.testType : appointment.testType;
    const effectiveDoctorId =
      update.doctorId !== undefined ? update.doctorId : appointment.doctorId;
    conflictDoctorId = effectiveDoctorId;

    const isEcografie =
      (typeof effectiveTestType === "string" ? effectiveTestType : "") === "Ecografie";
    if (!isEcografie && effectiveSectionId) {
      const hasDoctors = await sectionHasActiveDoctors(effectiveSectionId);
      if (hasDoctors && !normalizeScopeValue(effectiveDoctorId)) {
        return NextResponse.json(
          { success: false, message: "Medicul este obligatoriu." },
          { status: 400 }
        );
      }
    }

    const dateOrTimeChanged =
      update.date !== undefined || update.time !== undefined;

    if (dateOrTimeChanged || becameUnconfirmed) {
      const bounds = computeWhatsAppReminderWindowBounds({
        date: effectiveDate,
        time: effectiveTime,
      });
      update.whatsAppReminderWindowStart = bounds?.start ?? null;
      update.whatsAppReminderWindowEnd = bounds?.end ?? null;
      update.whatsAppReminderStatus = "not_sent";
      update.whatsAppReminderSentAt = null;
      update.whatsAppReminderMessageSid = null;
    } else if (confirmationChanged) {
      const bounds = computeWhatsAppReminderWindowBounds({
        date: effectiveDate,
        time: effectiveTime,
      });
      update.whatsAppReminderWindowStart = bounds?.start ?? null;
      update.whatsAppReminderWindowEnd = bounds?.end ?? null;
    }

    const conflictExists = await hasSlotConflict({
      location: appointment.location,
      date: effectiveDate,
      time: effectiveTime,
      sectionId: effectiveSectionId,
      testType: effectiveTestType,
      doctorId: effectiveDoctorId,
      excludeId: id,
    });
    if (conflictExists) {
      return NextResponse.json(
        {
          success: false,
          message: slotConflictMessage(effectiveDoctorId),
        },
        { status: 409 }
      );
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
    if (isMongoDuplicateKeyError(err)) {
      return NextResponse.json(
        {
          success: false,
          message: slotConflictMessage(conflictDoctorId),
        },
        { status: 409 }
      );
    }
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
