import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/mongodb";
import AppointModel from "@/models/Appointment";
import { requireAuth, isSuperAdmin } from "@/utils/authHelpers";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  appointmentToZonedDateTime,
  DEFAULT_TIMEZONE,
  getWhatsAppReminderDispatchWindow,
  getWhatsAppReminderEarliestSendInHorizon,
  getEarliestSendInHorizonFromStoredWindow,
  nowInDefaultTimezone,
  storedReminderWindowOverlapsUpcomingHours,
  whatsAppReminderDispatchOverlapsUpcomingHours,
} from "@/utils/appointmentDateTime";

dayjs.extend(utc);
dayjs.extend(timezone);

/** ≥24h ca să prindă fereastra de dimineață pentru programări „mâine seară” când verifici seara devreme. */
const PREVIEW_HOURS = 48;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    if (!isSuperAdmin(authResult.payload)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Super admin access required" },
        { status: 403 }
      );
    }

    await dbConnect();

    const nowTz = nowInDefaultTimezone();
    const dateStart = nowTz.subtract(1, "day").startOf("day").toDate();
    const dateEnd = nowTz.add(3, "day").endOf("day").toDate();

    const candidates = await AppointModel.find({
      date: { $gte: dateStart, $lte: dateEnd },
      whatsAppReminderStatus: { $ne: "sent" },
      isConfirmed: { $ne: true },
    })
      .populate("sectionId", "name")
      .populate("doctorId", "name")
      .sort({ date: 1, time: 1 })
      .lean();

    type Row = {
      appointmentId: string;
      patientName: string;
      phoneNumber: string;
      appointmentAt: string;
      appointmentDateText: string;
      appointmentTimeText: string;
      sectionLabel: string;
      doctorLabel: string;
      reminderStatus: string;
      dispatchKind: "previous_evening" | "same_morning";
      dispatchWindowText: string;
      earliestSendInHorizon: string | null;
      _sort: number;
    };

    const items: Row[] = [];

    for (const a of candidates as any[]) {
      const apptDt = appointmentToZonedDateTime({
        date: a.date,
        time: a.time,
        tz: DEFAULT_TIMEZONE,
      });
      if (!apptDt) continue;

      const wsRaw = a.whatsAppReminderWindowStart;
      const weRaw = a.whatsAppReminderWindowEnd;
      const hasStoredWindow =
        wsRaw != null &&
        weRaw != null &&
        !Number.isNaN(new Date(wsRaw).getTime()) &&
        !Number.isNaN(new Date(weRaw).getTime());

      const inHorizon = hasStoredWindow
        ? storedReminderWindowOverlapsUpcomingHours(
            new Date(wsRaw),
            new Date(weRaw),
            apptDt,
            nowTz,
            PREVIEW_HOURS
          )
        : whatsAppReminderDispatchOverlapsUpcomingHours(apptDt, nowTz, PREVIEW_HOURS);
      if (!inHorizon) continue;

      const w = getWhatsAppReminderDispatchWindow(apptDt);
      if (!w) continue;

      let dispatchWindowText: string;
      let earliest: ReturnType<typeof getWhatsAppReminderEarliestSendInHorizon>;
      if (hasStoredWindow) {
        const ws = dayjs(wsRaw).tz(DEFAULT_TIMEZONE);
        const we = dayjs(weRaw).tz(DEFAULT_TIMEZONE);
        const datePart = ws.format("DD.MM.YYYY");
        dispatchWindowText =
          w.kind === "previous_evening"
            ? `Seara anterioară programării (${datePart}, ${ws.format("HH:mm")}–${we.format("HH:mm")})`
            : `Dimineața zilei programării (${datePart}, ${ws.format("HH:mm")}–${we.format("HH:mm")})`;
        earliest = getEarliestSendInHorizonFromStoredWindow(
          new Date(wsRaw),
          new Date(weRaw),
          apptDt,
          nowTz,
          PREVIEW_HOURS
        );
      } else {
        const datePart = w.start.format("DD.MM.YYYY");
        dispatchWindowText =
          w.kind === "previous_evening"
            ? `Seara anterioară programării (${datePart}, ${w.start.format("HH:mm")}–${w.end.format("HH:mm")})`
            : `Dimineața zilei programării (${datePart}, ${w.start.format("HH:mm")}–${w.end.format("HH:mm")})`;
        earliest = getWhatsAppReminderEarliestSendInHorizon(apptDt, nowTz, PREVIEW_HOURS);
      }

      items.push({
        appointmentId: String(a._id),
        patientName: a.patientName || "",
        phoneNumber: a.phoneNumber || "",
        appointmentAt: apptDt.toISOString(),
        appointmentDateText: apptDt.format("DD.MM.YYYY"),
        appointmentTimeText: apptDt.format("HH:mm"),
        sectionLabel: a.sectionId?.name || a.testType || "—",
        doctorLabel: a.doctorId?.name || a.doctorName || "—",
        reminderStatus: a.whatsAppReminderStatus || "not_sent",
        dispatchKind: w.kind,
        dispatchWindowText,
        earliestSendInHorizon: earliest ? earliest.format("DD.MM.YYYY HH:mm") : null,
        _sort: earliest ? earliest.valueOf() : apptDt.valueOf(),
      });
    }

    items.sort((x, y) => x._sort - y._sort);
    const sanitized = items.map(({ _sort, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      data: {
        timezone: DEFAULT_TIMEZONE,
        previewHours: PREVIEW_HOURS,
        generatedAt: nowTz.toISOString(),
        count: sanitized.length,
        items: sanitized,
      },
    });
  } catch (err: any) {
    console.error("GET /api/dashboard/whatsapp-reminder-preview error:", err);
    return NextResponse.json(
      { success: false, message: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
