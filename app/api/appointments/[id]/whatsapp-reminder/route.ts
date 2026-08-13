import { NextRequest, NextResponse } from "next/server";
import dayjs from "dayjs";
import dbConnect from "@/utils/mongodb";
import AppointModel from "@/models/Appointment";
import WhatsAppMessageModel from "@/models/WhatsAppMessage";
import { requireAuth } from "@/utils/authHelpers";
import { appointmentToZonedDateTime, DEFAULT_TIMEZONE } from "@/utils/appointmentDateTime";
import {
  normalizePhoneNumberToE164RO,
  resolveWhatsAppDoctorForSection,
  sendWhatsAppReminder,
} from "@/utils/whatsappMeta";

function isReminderNotSent(status: unknown): boolean {
  return status == null || status === "not_sent";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    if (authResult.payload.role === "doctor") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing appointment id" },
        { status: 400 }
      );
    }

    await dbConnect();
    const appointment: any = await AppointModel.findById(id);
    if (!appointment) {
      return NextResponse.json(
        { success: false, message: "Appointment not found" },
        { status: 404 }
      );
    }

    if (!isReminderNotSent(appointment.whatsAppReminderStatus)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Reminderul WhatsApp poate fi trimis manual doar când statusul este Netrimis.",
        },
        { status: 409 }
      );
    }

    const now = dayjs();
    const apptDt = appointmentToZonedDateTime({
      date: appointment.date,
      time: appointment.time,
      tz: DEFAULT_TIMEZONE,
    });
    if (!apptDt) {
      return NextResponse.json(
        { success: false, message: "Invalid appointment time/date" },
        { status: 400 }
      );
    }
    if (apptDt.isBefore(now)) {
      return NextResponse.json(
        { success: false, message: "Cannot send reminders for past appointments" },
        { status: 400 }
      );
    }

    // Claim immediately so a concurrent cron cannot also send.
    const claimed = await AppointModel.findOneAndUpdate(
      {
        _id: appointment._id,
        $or: [
          { whatsAppReminderStatus: "not_sent" },
          { whatsAppReminderStatus: null },
          { whatsAppReminderStatus: { $exists: false } },
        ],
      },
      {
        $set: {
          whatsAppReminderStatus: "sent",
          whatsAppReminderSentAt: new Date(),
          patientDecision: "pending",
          patientDecisionAt: null,
          confirmationTokenHash: null,
          confirmationTokenExpiresAt: null,
        },
      },
      { new: true }
    );
    if (!claimed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Reminderul WhatsApp poate fi trimis manual doar când statusul este Netrimis.",
        },
        { status: 409 }
      );
    }

    const sectionLabel = appointment.section?.name || appointment.testType || "-";
    const doctorRaw = appointment.doctor?.name || appointment.doctorName || "-";
    const doctorForMessage = resolveWhatsAppDoctorForSection(sectionLabel, doctorRaw);

    let message: { sid: string; to: string };
    try {
      message = await sendWhatsAppReminder({
        toPhoneNumberRaw: appointment.phoneNumber,
        customerName: appointment.patientName,
        section: sectionLabel,
        doctor: doctorRaw,
        appointmentDateText: apptDt.format("DD.MM.YYYY"),
        appointmentTimeText: apptDt.format("HH:mm"),
      });
    } catch (sendErr: any) {
      await AppointModel.findByIdAndUpdate(appointment._id, {
        $set: { whatsAppReminderStatus: "failed" },
      });
      throw sendErr;
    }

    const outboundPreview =
      `Template reminder pentru ${appointment.patientName || "Pacient"}: ` +
      `${sectionLabel}, ` +
      `${doctorForMessage}, ` +
      `${apptDt.format("DD.MM.YYYY")} ${apptDt.format("HH:mm")}`;

    await AppointModel.findByIdAndUpdate(appointment._id, {
      $set: {
        whatsAppReminderStatus: "sent",
        whatsAppReminderSentAt: new Date(),
        whatsAppReminderMessageSid: message.sid,
      },
    });

    const e164 = normalizePhoneNumberToE164RO(appointment.phoneNumber) || appointment.phoneNumber;
    await WhatsAppMessageModel.findOneAndUpdate(
      { messageSid: message.sid },
      {
        $set: {
          appointmentId: appointment._id,
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

    return NextResponse.json(
      { success: true, data: { messageSid: message.sid } },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("POST /api/appointments/[id]/whatsapp-reminder error:", err);
    return NextResponse.json(
      { success: false, message: err?.message ?? "Server Error" },
      { status: 500 }
    );
  }
}
