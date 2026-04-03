import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/mongodb";
import AppointModel from "@/models/Appointment";
import WhatsAppMessageModel from "@/models/WhatsAppMessage";
import {
  appointmentToZonedDateTime,
  DEFAULT_TIMEZONE,
  isNowInsideStoredReminderWindow,
  nowInDefaultTimezone,
  shouldDispatchWhatsAppReminder,
} from "@/utils/appointmentDateTime";
import {
  normalizePhoneNumberToE164RO,
  sendWhatsAppReminder,
} from "@/utils/whatsappMeta";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.REMINDER_CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length) === secret;
  if (headerSecret) return headerSecret === secret;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const now = nowInDefaultTimezone();
    const nowDate = now.toDate();

    // Include azi..+2 zile (local): acoperă „seara anterioară” pentru mâine dimineață și dimineața aceeași zi pentru după-amiază.
    const dateStart = now.startOf("day").toDate();
    const dateEnd = now.add(2, "day").endOf("day").toDate();

    const inScheduledWindow = {
      whatsAppReminderWindowStart: { $lte: nowDate },
      whatsAppReminderWindowEnd: { $gt: nowDate },
    };
    const legacyNoStoredWindow = {
      $or: [
        { whatsAppReminderWindowStart: null },
        { whatsAppReminderWindowStart: { $exists: false } },
      ],
    };

    const candidates = await AppointModel.find({
      date: { $gte: dateStart, $lte: dateEnd },
      whatsAppReminderStatus: { $ne: "sent" },
      // Skip already confirmed appointments
      isConfirmed: { $ne: true },
      $or: [inScheduledWindow, legacyNoStoredWindow],
    })
      .sort({ date: 1, time: 1 })
      .lean();

    let scanned = 0;
    let due = 0;
    let sent = 0;
    let failed = 0;
    const errors: Array<{ appointmentId: string; error: string }> = [];

    for (const a of candidates as any[]) {
      scanned += 1;
      const apptDt = appointmentToZonedDateTime({
        date: a.date,
        time: a.time,
        tz: DEFAULT_TIMEZONE,
      });
      if (!apptDt) continue;
      if (!apptDt.isAfter(now)) continue;

      const ws = a.whatsAppReminderWindowStart;
      const we = a.whatsAppReminderWindowEnd;
      const hasStoredWindow =
        ws != null &&
        we != null &&
        !Number.isNaN(new Date(ws).getTime()) &&
        !Number.isNaN(new Date(we).getTime());

      if (hasStoredWindow) {
        if (!isNowInsideStoredReminderWindow(new Date(ws), new Date(we), now)) continue;
      } else if (!shouldDispatchWhatsAppReminder(apptDt, now)) {
        continue;
      }
      due += 1;

      try {
        // Reset patient decision state before sending a new reminder.
        await AppointModel.findByIdAndUpdate(a._id, {
          $set: {
            patientDecision: "pending",
            patientDecisionAt: null,
            confirmationTokenHash: null,
            confirmationTokenExpiresAt: null,
          },
        });

        const message = await sendWhatsAppReminder({
          toPhoneNumberRaw: a.phoneNumber,
          customerName: a.patientName,
          section: a.section?.name || a.testType || "-",
          doctor: a.doctor?.name || a.doctorName || "-",
          appointmentDateText: apptDt.format("DD.MM.YYYY"),
          appointmentTimeText: apptDt.format("HH:mm"),
        });

        const outboundPreview =
          `Template reminder pentru ${a.patientName || "Pacient"}: ` +
          `${a.section?.name || a.testType || "-"}, ` +
          `${a.doctor?.name || a.doctorName || "-"}, ` +
          `${apptDt.format("DD.MM.YYYY")} ${apptDt.format("HH:mm")}`;

        await AppointModel.findByIdAndUpdate(a._id, {
          $set: {
            whatsAppReminderStatus: "sent",
            whatsAppReminderSentAt: new Date(),
            whatsAppReminderMessageSid: message.sid,
          },
        });

        const e164 = normalizePhoneNumberToE164RO(a.phoneNumber) || a.phoneNumber;
        await WhatsAppMessageModel.findOneAndUpdate(
          { messageSid: message.sid },
          {
            $set: {
              appointmentId: a._id,
              phoneNumber: e164,
              direction: "outbound",
              provider: "meta",
              messageSid: message.sid,
              text: outboundPreview,
              status: "sent",
              statusError: null,
              metaTimestamp: new Date(),
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        sent += 1;
      } catch (e: any) {
        failed += 1;
        errors.push({ appointmentId: String(a._id), error: e?.message ?? "Unknown error" });
        await AppointModel.findByIdAndUpdate(a._id, {
          $set: {
            whatsAppReminderStatus: "failed",
          },
        });
      }
    }

    return NextResponse.json(
      { success: true, data: { scanned, due, sent, failed, errors } },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("POST /api/notifications/whatsapp/appointments-24h error:", err);
    return NextResponse.json(
      { success: false, message: err?.message ?? "Server Error" },
      { status: 500 }
    );
  }
}

