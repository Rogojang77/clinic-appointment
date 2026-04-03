import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { normalizePhoneNumberToE164RO } from "@/utils/whatsappMeta";

dayjs.extend(isSameOrAfter);

export type InboundPatientDecision = "confirmed" | "declined" | "reschedule";

export type DecisionParseResult = {
  decision: InboundPatientDecision | null;
  source: "button_payload" | "button_text" | "body" | "none";
  matchedOn: string | null;
};

export type MetaInboundMessage = {
  from: string;
  messageId: string;
  messageType: string;
  body: string;
  buttonPayload: string;
  buttonText: string;
};

export type LeanAppointment = {
  _id: unknown;
  date: Date;
  phoneNumber: string;
  patientDecision?: string;
  whatsAppReminderStatus?: string;
};

export type MetaMessageStatus = {
  messageId: string;
  status: string;
  recipientId: string;
  timestamp: string;
  errorMessage: string | null;
};

export function normalizePhoneNumber(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const cleaned = raw.startsWith("+") ? raw : `+${raw}`;
  return normalizePhoneNumberToE164RO(cleaned) ?? normalizePhoneNumberToE164RO(raw);
}

function normalizeTextForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function parseDecisionFromText(value: string): InboundPatientDecision | null {
  const text = normalizeTextForMatch(value);
  if (!text) return null;

  if (/\b(reschedule|reprogrameaza|reprogramare|reprogram)\b/i.test(text)) {
    return "reschedule";
  }

  if (
    /\b(cancel|nu|refuz|refuza|anuleaza|anulez|anulare|nu vin|nu pot)\b/i.test(
      text
    )
  ) {
    return "declined";
  }

  if (
    /\b(confirm|confirma|confirmat|confirmare|confirmă|da|ok|accept|vin)\b/i.test(text)
  ) {
    return "confirmed";
  }

  return null;
}

export function extractDecisionFromMessage(input: {
  body?: string;
  buttonPayload?: string;
  buttonText?: string;
}): DecisionParseResult {
  const buttonPayload = normalizeTextForMatch(input.buttonPayload ?? "");
  if (buttonPayload) {
    if (buttonPayload === "confirm") {
      return { decision: "confirmed", source: "button_payload", matchedOn: buttonPayload };
    }
    if (buttonPayload === "cancel") {
      return { decision: "declined", source: "button_payload", matchedOn: buttonPayload };
    }
    if (buttonPayload === "reschedule") {
      return { decision: "reschedule", source: "button_payload", matchedOn: buttonPayload };
    }
    const parsed = parseDecisionFromText(buttonPayload);
    if (parsed) {
      return { decision: parsed, source: "button_payload", matchedOn: buttonPayload };
    }
  }

  const buttonText = input.buttonText ?? "";
  const parsedButtonText = parseDecisionFromText(buttonText);
  if (parsedButtonText) {
    return {
      decision: parsedButtonText,
      source: "button_text",
      matchedOn: normalizeTextForMatch(buttonText),
    };
  }

  const body = input.body ?? "";
  const parsedBody = parseDecisionFromText(body);
  if (parsedBody) {
    return {
      decision: parsedBody,
      source: "body",
      matchedOn: normalizeTextForMatch(body),
    };
  }

  return { decision: null, source: "none", matchedOn: null };
}

function lastNineDigits(value: string): string {
  const d = value.replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : d;
}

export function phonesMatchForInbound(dbPhone: string, patientE164: string): boolean {
  const n = normalizePhoneNumberToE164RO(dbPhone);
  if (n && n === patientE164) return true;
  return lastNineDigits(dbPhone) === lastNineDigits(patientE164) && lastNineDigits(patientE164).length === 9;
}

export function pickAppointmentForInbound<T extends LeanAppointment>(
  appointments: T[],
  patientE164: string
): T | null {
  const pendingPool = appointments.filter(
    (a) => !a.patientDecision || a.patientDecision === "pending"
  );
  if (pendingPool.length === 0) return null;

  const exact = pendingPool.filter((a) => {
    const normalized = normalizePhoneNumberToE164RO(a.phoneNumber);
    return !!normalized && normalized === patientE164;
  });
  const matches = exact.length
    ? exact
    : pendingPool.filter((a) => phonesMatchForInbound(a.phoneNumber, patientE164));
  if (matches.length === 0) return null;

  const today = dayjs().startOf("day");
  const withReminder = matches.filter((a) => a.whatsAppReminderStatus === "sent");
  const base = withReminder.length ? withReminder : matches;
  const sorted = [...base].sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  const upcoming = sorted.find((a) => dayjs(a.date).isSameOrAfter(today, "day"));
  return upcoming ?? sorted[0] ?? null;
}

export function extractMetaInboundMessages(payload: unknown): MetaInboundMessage[] {
  const root = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<Record<string, unknown>>;
        };
      }>;
    }>;
  };

  const out: MetaInboundMessage[] = [];
  const entries = root?.entry ?? [];
  for (const entry of entries) {
    const changes = entry?.changes ?? [];
    for (const change of changes) {
      const messages = change?.value?.messages ?? [];
      for (const message of messages) {
        const messageType = String(message?.type ?? "").trim();
        const from = String(message?.from ?? "").trim();
        const messageId = String(message?.id ?? "").trim();
        const textBody = String(
          ((message?.text as { body?: string } | undefined)?.body ?? "")
        ).trim();
        const button = (message?.button ?? {}) as {
          payload?: string;
          text?: string;
        };
        const interactive = (message?.interactive ?? {}) as {
          button_reply?: { id?: string; title?: string };
          list_reply?: { id?: string; title?: string };
        };
        const buttonPayload = String(
          interactive?.button_reply?.id ??
            interactive?.list_reply?.id ??
            button?.payload ??
            ""
        ).trim();
        const buttonText = String(
          interactive?.button_reply?.title ??
            interactive?.list_reply?.title ??
            button?.text ??
            ""
        ).trim();

        out.push({
          from,
          messageId,
          messageType,
          body: textBody,
          buttonPayload,
          buttonText,
        });
      }
    }
  }
  return out;
}

export function extractMetaMessageStatuses(payload: unknown): MetaMessageStatus[] {
  const root = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          statuses?: Array<Record<string, unknown>>;
        };
      }>;
    }>;
  };

  const out: MetaMessageStatus[] = [];
  const entries = root?.entry ?? [];
  for (const entry of entries) {
    const changes = entry?.changes ?? [];
    for (const change of changes) {
      const statuses = change?.value?.statuses ?? [];
      for (const item of statuses) {
        const errors = (item?.errors as Array<{ message?: string }> | undefined) ?? [];
        out.push({
          messageId: String(item?.id ?? "").trim(),
          status: String(item?.status ?? "").trim().toLowerCase(),
          recipientId: String(item?.recipient_id ?? "").trim(),
          timestamp: String(item?.timestamp ?? "").trim(),
          errorMessage: errors[0]?.message ? String(errors[0].message) : null,
        });
      }
    }
  }
  return out;
}
