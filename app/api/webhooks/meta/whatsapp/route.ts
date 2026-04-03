import crypto from "crypto";
import dayjs from "dayjs";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/utils/mongodb";
import AppointModel from "@/models/Appointment";
import WhatsAppMessageModel from "@/models/WhatsAppMessage";
import {
  extractDecisionFromMessage,
  extractMetaInboundMessages,
  extractMetaMessageStatuses,
  normalizePhoneNumber,
  phonesMatchForInbound,
  pickAppointmentForInbound,
  type LeanAppointment,
} from "@/utils/metaInbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG = "[meta-whatsapp-inbound]";
const DEBUG_WHATSAPP = process.env.DEBUG_WHATSAPP === "true";

function mapMetaStatusToMessageStatus(
  status: string
): "pending" | "sent" | "delivered" | "read" | "failed" {
  const s = status.toLowerCase();
  if (s === "read") return "read";
  if (s === "delivered") return "delivered";
  if (s === "sent") return "sent";
  if (s === "failed" || s === "undelivered") return "failed";
  return "pending";
}

function safeHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appSecret) return true;
  if (!signatureHeader) return false;

  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") return false;
  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(parts[1], "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();

  if (mode === "subscribe" && challenge && expected && token === expected) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  let rawBody = "";
  try {
    rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const signatureOk = verifyMetaSignature(rawBody, signature);
    if (!signatureOk) {
      console.warn(LOG, "invalid_signature");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const payload = JSON.parse(rawBody || "{}");
    if (DEBUG_WHATSAPP) {
      console.info(LOG, "debug_request", {
        payload,
        headers: safeHeaders(request.headers),
      });
    }

    const inboundMessages = extractMetaInboundMessages(payload);
    const inboundStatuses = extractMetaMessageStatuses(payload);
    if (!inboundMessages.length && !inboundStatuses.length) {
      console.info(LOG, "no_messages_or_statuses_in_payload");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    await dbConnect();

    for (const statusEvent of inboundStatuses) {
      if (!statusEvent.messageId) {
        continue;
      }
      const normalizedStatus = statusEvent.status.toLowerCase();
      const messageStatus = mapMetaStatusToMessageStatus(normalizedStatus);
      let reminderStatus: "sent" | "failed" | null = null;
      if (["sent", "delivered", "read"].includes(normalizedStatus)) {
        reminderStatus = "sent";
      } else if (["failed", "undelivered"].includes(normalizedStatus)) {
        reminderStatus = "failed";
      }
      if (!reminderStatus) {
        continue;
      }

      const update: Record<string, unknown> = {
        whatsAppReminderStatus: reminderStatus,
      };
      if (reminderStatus === "sent") {
        update.whatsAppReminderSentAt = new Date();
      }

      const updated = await AppointModel.findOneAndUpdate(
        { whatsAppReminderMessageSid: statusEvent.messageId },
        { $set: update },
        { new: true }
      ).lean<{ _id: unknown } | null>();

      const normalizedRecipient =
        normalizePhoneNumber(statusEvent.recipientId) || statusEvent.recipientId;
      const metaTs = Number.parseInt(statusEvent.timestamp, 10);
      await WhatsAppMessageModel.findOneAndUpdate(
        { messageSid: statusEvent.messageId },
        {
          $set: {
            appointmentId: updated?._id ?? null,
            phoneNumber: normalizedRecipient || "unknown",
            direction: "outbound",
            provider: "meta",
            messageSid: statusEvent.messageId,
            status: messageStatus,
            statusError: statusEvent.errorMessage,
            metaTimestamp: Number.isFinite(metaTs) ? new Date(metaTs * 1000) : new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      console.info(LOG, "message_status_processed", {
        messageSid: statusEvent.messageId,
        metaStatus: normalizedStatus,
        messageStatus,
        reminderStatus,
        appointmentId: updated ? String(updated._id) : null,
        recipientId: statusEvent.recipientId || null,
        error: statusEvent.errorMessage,
      });
    }

    const since = dayjs().subtract(365, "day").startOf("day").toDate();
    const candidates = await AppointModel.find({ date: { $gte: since } })
      .sort({ date: -1 })
      .limit(1500)
      .lean<LeanAppointment[]>();

    for (const message of inboundMessages) {
      const patientE164 = normalizePhoneNumber(message.from);
      const parsedDecision = extractDecisionFromMessage({
        body: message.body,
        buttonPayload: message.buttonPayload,
        buttonText: message.buttonText,
      });
      const canonicalInboundBody = (
        message.buttonPayload ||
        message.buttonText ||
        message.body
      ).slice(0, 4000);

      console.info(LOG, "incoming_message", {
        type: message.messageType || null,
        from: message.from || null,
        normalizedFrom: patientE164,
        messageSid: message.messageId || null,
        body: message.body || null,
        buttonPayload: message.buttonPayload || null,
        buttonText: message.buttonText || null,
      });

      if (!patientE164) {
        console.warn(LOG, "invalid_or_missing_from", {
          from: message.from || null,
          messageSid: message.messageId || null,
        });
        continue;
      }
      if (!canonicalInboundBody) {
        console.warn(LOG, "empty_inbound_payload", {
          from: patientE164,
          messageSid: message.messageId || null,
        });
        await WhatsAppMessageModel.findOneAndUpdate(
          { messageSid: message.messageId },
          {
            $set: {
              appointmentId: null,
              phoneNumber: patientE164,
              direction: "inbound",
              provider: "meta",
              messageSid: message.messageId,
              text: "",
              buttonPayload: null,
              buttonText: null,
              status: "read",
              statusError: null,
              metaTimestamp: new Date(),
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        continue;
      }

      const exactMatches = candidates.filter((item) => {
        const normalizedDbPhone = normalizePhoneNumber(item.phoneNumber);
        return !!normalizedDbPhone && normalizedDbPhone === patientE164;
      });
      const matchedByPhone = exactMatches.length
        ? exactMatches
        : candidates.filter((item) => phonesMatchForInbound(item.phoneNumber, patientE164));

      const picked = pickAppointmentForInbound(matchedByPhone, patientE164);
      if (!picked) {
        await WhatsAppMessageModel.findOneAndUpdate(
          { messageSid: message.messageId },
          {
            $set: {
              appointmentId: null,
              phoneNumber: patientE164,
              direction: "inbound",
              provider: "meta",
              messageSid: message.messageId,
              text: message.body || "",
              buttonPayload: message.buttonPayload || null,
              buttonText: message.buttonText || null,
              status: "read",
              statusError: null,
              metaTimestamp: new Date(),
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        if (matchedByPhone.length > 0) {
          const latestMatch = matchedByPhone[0];
          console.info(LOG, "duplicate_reply_ignored", {
            appointmentId: String(latestMatch._id),
            existingDecision: latestMatch.patientDecision ?? null,
            messageSid: message.messageId || null,
          });
          continue;
        }
        console.warn(LOG, "no_pending_appointment_match", {
          patientE164,
          messageSid: message.messageId || null,
          candidateCount: candidates.length,
        });
        continue;
      }

      const appointmentId = String(picked._id);
      await WhatsAppMessageModel.findOneAndUpdate(
        { messageSid: message.messageId },
        {
          $set: {
            appointmentId: picked._id,
            phoneNumber: patientE164,
            direction: "inbound",
            provider: "meta",
            messageSid: message.messageId,
            text: message.body || "",
            buttonPayload: message.buttonPayload || null,
            buttonText: message.buttonText || null,
            status: "read",
            statusError: null,
            metaTimestamp: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (picked.patientDecision && picked.patientDecision !== "pending") {
        console.info(LOG, "duplicate_reply_ignored", {
          appointmentId,
          existingDecision: picked.patientDecision,
          messageSid: message.messageId || null,
        });
        continue;
      }

      const update: Record<string, unknown> = {
        whatsAppLastInboundAt: new Date(),
        whatsAppLastInboundBody: canonicalInboundBody,
        whatsAppLastInboundMessageSid: message.messageId || null,
      };
      if (parsedDecision.decision) {
        update.patientDecision = parsedDecision.decision;
        update.patientDecisionAt = new Date();
        update.isConfirmed = parsedDecision.decision === "confirmed";
        update.confirmationTokenHash = null;
        update.confirmationTokenExpiresAt = null;
      }
      await AppointModel.findByIdAndUpdate(picked._id, { $set: update });

      console.info(LOG, "inbound_processed", {
        appointmentId,
        patientE164,
        decision: parsedDecision.decision,
        decisionSource: parsedDecision.source,
        decisionMatchedOn: parsedDecision.matchedOn,
        messageSid: message.messageId || null,
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error(LOG, "unhandled_error", {
      error: error instanceof Error ? error.message : String(error),
      rawBodyLength: rawBody.length,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
