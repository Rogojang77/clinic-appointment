import dbConnect from "@/utils/mongodb";
import { NextRequest, NextResponse } from "next/server";
import LocationScheduleModel from "@/models/LocationSchedule";
import type { ISchedule } from "@/models/LocationSchedule";
import { requireAuth, isSuperAdmin } from "@/utils/authHelpers";
import { dedupeSchedule, countRawScheduleSlots, countScheduleSlots } from "@/utils/weekScheduleGrid";

const DAYS: (keyof ISchedule)[] = [
  "Luni",
  "Marți",
  "Miercuri",
  "Joi",
  "Vineri",
  "Sâmbătă",
  "Duminica",
];

function emptySchedule(): ISchedule {
  return {
    Luni: [],
    Marți: [],
    Miercuri: [],
    Joi: [],
    Vineri: [],
    Sâmbătă: [],
    Duminica: [],
  };
}

async function requireSuperAdmin(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!isSuperAdmin(auth.payload)) {
    return NextResponse.json(
      { success: false, message: "Super admin access required" },
      { status: 403 }
    );
  }
  return auth;
}

/**
 * GET /api/location-schedules — list all location schedules (super admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const gate = await requireSuperAdmin(request);
    if (gate instanceof NextResponse) return gate;

    await dbConnect();
    const docs = await LocationScheduleModel.find({}).sort({ location: 1 }).lean();
    return NextResponse.json({ success: true, data: docs }, { status: 200 });
  } catch (error) {
    console.error("GET /api/location-schedules:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/location-schedules
 * - { action: "dedupeAll" } — remove duplicate slots across all location schedules
 * - { location, schedule? } — create schedule for a location (slots only from this payload)
 */
export async function POST(request: NextRequest) {
  try {
    const gate = await requireSuperAdmin(request);
    if (gate instanceof NextResponse) return gate;

    await dbConnect();
    const body = await request.json();

    if (body?.action === "dedupeAll") {
      const docs = await LocationScheduleModel.find({});
      const report: {
        location: string;
        before: number;
        after: number;
      }[] = [];
      for (const doc of docs) {
        const raw = doc.schedule as unknown as Record<string, unknown>;
        const before = countRawScheduleSlots(raw);
        const schedule = dedupeSchedule(raw);
        const after = countScheduleSlots(schedule);
        if (before !== after) {
          doc.schedule = schedule as unknown as typeof doc.schedule;
          await doc.save();
        }
        report.push({ location: doc.location, before, after });
      }
      return NextResponse.json(
        {
          success: true,
          message: "Programele au fost curățate de duplicate (time + date).",
          data: { locations: report },
        },
        { status: 200 }
      );
    }

    const location = body?.location as string | undefined;
    if (!location || typeof location !== "string" || !location.trim()) {
      return NextResponse.json(
        { success: false, message: "location is required, or use action: dedupeAll" },
        { status: 400 }
      );
    }

    const trimmed = location.trim();
    const existing = await LocationScheduleModel.findOne({ location: trimmed });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Există deja un program pentru această locație." },
        { status: 400 }
      );
    }

    const scheduleDraft = emptySchedule();
    if (body.schedule && typeof body.schedule === "object") {
      for (const day of DAYS) {
        const daySlots = body.schedule[day];
        if (Array.isArray(daySlots)) {
          scheduleDraft[day] = daySlots
            .filter(
              (s: unknown) =>
                s &&
                typeof s === "object" &&
                typeof (s as { time?: string }).time === "string"
            )
            .map((s: { time: string; date?: string }) => ({
              time: String(s.time).trim(),
              date: typeof s.date === "string" && s.date ? s.date : "00:00:00",
            }));
        }
      }
    }

    const schedule = dedupeSchedule(scheduleDraft as unknown as Record<string, unknown>);

    const created = await LocationScheduleModel.create({
      location: trimmed,
      schedule,
    });

    return NextResponse.json(
      { success: true, message: "Program locație creat.", data: created },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/location-schedules:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/location-schedules?id=... — remove entire location schedule document
 */
export async function DELETE(request: NextRequest) {
  try {
    const gate = await requireSuperAdmin(request);
    if (gate instanceof NextResponse) return gate;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Query id is required" },
        { status: 400 }
      );
    }

    await dbConnect();
    const deleted = await LocationScheduleModel.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Program negăsit" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Program șters." }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/location-schedules:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
